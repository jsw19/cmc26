/**
 * analyzeLocal.ts
 *
 * On-device vehicle image analysis using HSV pixel classification.
 * No network connection or API key required.
 *
 * Algorithm:
 *  1. Decode base64 JPEG → raw RGBA pixel data (via jpeg-js)
 *  2. Convert each pixel RGB → HSV
 *  3. Classify pixels:
 *       - Rust       : warm hue (H 0-30 or 330-360), S > 0.30, V 0.15-0.85
 *       - Dark patch : V < 0.18, S < 0.35  (heavy corrosion / oil / burn)
 *       - Glare      : V > 0.95, S < 0.10  (excluded — reflection artifact)
 *  4. Map pixel ratios to severity thresholds
 *  5. Return an InspectionResult with the same shape as the Claude analyser
 */

import jpeg from 'jpeg-js';
import type {
  AnalyzeLocalOptions,
  DamageItem,
  InspectionResult,
  Severity,
  VehiclePart,
} from './types';

// ─── Image decoding ───────────────────────────────────────────────────────────

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ─── Color math ───────────────────────────────────────────────────────────────

/** Converts RGB (0-255 each) to HSV ([0-360], [0-1], [0-1]). */
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === rn)      h = 60 * (((gn - bn) / d) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / d + 2);
    else                 h = 60 * ((rn - gn) / d + 4);
    if (h < 0) h += 360;
  }

  return [h, max === 0 ? 0 : d / max, max];
}

// ─── Pixel classification ─────────────────────────────────────────────────────

interface PixelStats {
  total: number;
  rustPixels: number;
  darkPatchPixels: number;
  glarePixels: number;
}

function classifyPixels(data: Uint8Array, pixelCount: number): PixelStats {
  const stats: PixelStats = {
    total: pixelCount,
    rustPixels: 0,
    darkPatchPixels: 0,
    glarePixels: 0,
  };

  for (let i = 0; i < pixelCount * 4; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const [h, s, v] = rgbToHsv(r, g, b);

    // Exclude blown-out reflections
    if (v > 0.95 && s < 0.10) {
      stats.glarePixels++;
      continue;
    }

    // Rust: warm red-orange-brown hues, saturated, mid-bright
    const isWarmHue = h <= 30 || h >= 330; // red wraps at 0 / 360
    if (isWarmHue && s > 0.30 && v > 0.15 && v < 0.85) {
      stats.rustPixels++;
    }

    // Dark patches: possible heavy corrosion, oil, or burnt metal
    if (v < 0.18 && s < 0.35) {
      stats.darkPatchPixels++;
    }
  }

  return stats;
}

// ─── Severity thresholds ──────────────────────────────────────────────────────

// Pixel-ratio → severity mapping.
// Thresholds were chosen conservatively: underbody images typically have a lot
// of legitimate dark metal, so we require a meaningful ratio before flagging.
const SEVERITY_THRESHOLDS: [number, Severity][] = [
  [0.20, 'severe'],
  [0.08, 'moderate'],
  [0.02, 'minor'],
];

function ratioToSeverity(ratio: number): Severity {
  for (const [threshold, severity] of SEVERITY_THRESHOLDS) {
    if (ratio >= threshold) return severity;
  }
  return 'none';
}

function pickOverallSeverity(severities: Severity[]): Severity {
  const order: Severity[] = ['severe', 'moderate', 'minor', 'none'];
  for (const s of order) {
    if (severities.includes(s)) return s;
  }
  return 'none';
}

// ─── Result text generation ───────────────────────────────────────────────────

const PART_LABELS: Record<VehiclePart, string> = {
  underbody:       'underbody',
  front:           'front',
  rear:            'rear',
  driver_side:     'driver side',
  passenger_side:  'passenger side',
  roof:            'roof',
  engine_bay:      'engine bay',
  unknown:         'vehicle',
};

function buildSummary(
  part: VehiclePart,
  damages: DamageItem[],
  overall: Severity
): string {
  const label = PART_LABELS[part];
  if (overall === 'none') {
    return `The ${label} appears to be in good condition with no significant damage detected by local analysis.`;
  }
  const types = [...new Set(damages.map((d) => d.type))].join(' and ');
  return (
    `The ${label} shows ${overall} ${types} based on local image analysis. ` +
    `${damages.length} area(s) of concern detected. ` +
    `Consider confirming with AI cloud analysis for greater accuracy.`
  );
}

function buildRecommendations(damages: DamageItem[]): string[] {
  const recs: string[] = [];
  const hasRust       = damages.some((d) => d.type === 'rust');
  const hasCorrosion  = damages.some((d) => d.type === 'corrosion');
  const hasSevere     = damages.some((d) => d.severity === 'severe');
  const hasModerate   = damages.some((d) => d.severity === 'moderate');

  if (hasSevere) {
    recs.push('Seek professional inspection immediately — severe damage indicators found.');
  }
  if (hasRust && hasModerate) {
    recs.push('Treat rust with a rust converter and apply a protective anti-corrosion coating.');
  }
  if (hasRust && !hasSevere) {
    recs.push('Monitor rust progression; consider rust-proofing at your next service.');
  }
  if (hasCorrosion) {
    recs.push('Inspect dark areas for heavy corrosion buildup or oil leaks.');
  }
  if (recs.length === 0) {
    recs.push('Continue regular vehicle maintenance and inspection schedule.');
  }
  recs.push('For a more detailed analysis, use the AI (cloud) scan option.');
  return recs;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyze a vehicle image on-device using HSV color-space pixel classification.
 *
 * Works fully offline — no API key required. Less accurate than cloud AI vision
 * (especially for non-rust damage types), but useful as a fast local pre-screen
 * or when no network connection is available.
 *
 * @param base64Image - Base64-encoded JPEG (no data-URI prefix)
 * @param imageUri    - Local file URI stored as-is in the result
 * @param options     - Analysis options
 */
export async function analyzeVehicleImageLocally(
  base64Image: string,
  imageUri: string,
  options: AnalyzeLocalOptions = {}
): Promise<InspectionResult> {
  const { vehiclePart = 'unknown' } = options;

  const jpegData = jpeg.decode(base64ToUint8Array(base64Image), { formatAsRGBA: true });
  const { data, width, height } = jpegData;
  const pixelCount = width * height;

  const stats = classifyPixels(data as Uint8Array, pixelCount);
  const analysable = stats.total - stats.glarePixels;

  const rustRatio = analysable > 0 ? stats.rustPixels / analysable : 0;
  const darkRatio = analysable > 0 ? stats.darkPatchPixels / analysable : 0;

  const damages: DamageItem[] = [];

  const rustSeverity = ratioToSeverity(rustRatio);
  if (rustSeverity !== 'none') {
    damages.push({
      type: 'rust',
      location: 'detected across analysed area',
      severity: rustSeverity,
      // Confidence scales with ratio but is capped — colour analysis isn't infallible
      confidence: Math.min(0.65 + rustRatio * 1.5, 0.88),
      description:
        `Rust-coloured pixels account for ~${(rustRatio * 100).toFixed(1)}% of the image. ` +
        `This indicates ${rustSeverity} surface rust or corrosion.`,
    });
  }

  // Flag dark patches only when rust is also present — shadow areas alone are
  // common on underbody shots and would create too many false positives.
  const darkSeverity = ratioToSeverity(darkRatio);
  if (darkSeverity !== 'none' && rustRatio > 0.03) {
    damages.push({
      type: 'corrosion',
      location: 'dark patch areas',
      severity: darkSeverity,
      confidence: 0.52,
      description:
        `Dark, low-saturation areas (~${(darkRatio * 100).toFixed(1)}%) ` +
        `may indicate heavy corrosion, oil contamination, or burnt metal.`,
    });
  }

  const overallSeverity = pickOverallSeverity(damages.map((d) => d.severity));

  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    vehiclePart,
    imageUri,
    damages,
    overallSeverity,
    summary: buildSummary(vehiclePart, damages, overallSeverity),
    recommendations: buildRecommendations(damages),
  };
}
