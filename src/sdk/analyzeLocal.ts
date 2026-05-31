/**
 * analyzeLocal.ts
 *
 * On-device vehicle image analysis using HSV pixel classification with
 * grid-based spatial localisation and part-specific detectors.
 *
 * Algorithm (v2):
 *  1. Decode base64 JPEG -> raw RGBA pixel data (via jpeg-js)
 *  2. Adaptive subsampling caps work at ~250k samples regardless of resolution
 *  3. Partition the image into a 6x6 grid (36 zones)
 *  4. Per-pixel HSV classification with part-specific detectors:
 *       - Rust    : warm hue, mid saturation, mid value (tighter on engine bay
 *                   to exclude vivid orange caps and plastics)
 *       - Dark    : low V, low S (heavy corrosion / oil / burnt metal)
 *       - Coolant : vivid green or pink (engine bay only - antifreeze tells)
 *       - Glare   : near-white blown-out highlights (excluded from analysable)
 *  5. Compute global ratio AND worst-cell ratio per category
 *  6. Map ratio -> severity; a concentrated worst cell (>=40%) bumps severity
 *  7. Localise findings using the 3x3 quadrant the worst cell falls in
 *  8. Return an InspectionResult with the same shape as the Claude analyser
 */

import jpeg from 'jpeg-js';
import type {
  AnalyzeLocalOptions,
  DamageItem,
  InspectionResult,
  Severity,
  VehiclePart,
} from './types';

// --- Image decoding ---------------------------------------------------------

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// --- Color math -------------------------------------------------------------

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

// --- Part-specific HSV detectors --------------------------------------------

interface Detectors {
  isGlare:   (h: number, s: number, v: number) => boolean;
  isRust:    (h: number, s: number, v: number) => boolean;
  isDark:    (h: number, s: number, v: number) => boolean;
  isCoolant?: (h: number, s: number, v: number) => boolean;
}

// Underbody: matte metal, rust is the dominant signal, broad warm band ok.
const UNDERBODY_DETECTORS: Detectors = {
  isGlare: (_h, s, v) => v > 0.93 && s < 0.12,
  isRust:  (h, s, v) =>
    (h <= 35 || h >= 340) && s >= 0.25 && s <= 0.85 && v >= 0.10 && v <= 0.70,
  isDark:  (_h, s, v) => v < 0.18 && s < 0.35,
};

// Engine bay: chrome and aluminium reflections, vivid orange caps and red
// plastics. Tighten rust band (rust is brown-orange with mid S/V, not the
// near-pure orange of fresh plastic). Loosen dark threshold (natural shadow).
const ENGINE_BAY_DETECTORS: Detectors = {
  isGlare: (_h, s, v) => v > 0.92 && s < 0.15,
  isRust:  (h, s, v) =>
    (h <= 30 || h >= 345) && s >= 0.25 && s <= 0.65 && v >= 0.15 && v <= 0.55,
  isDark:  (_h, s, v) => v < 0.20 && s < 0.40,
  // Antifreeze green or long-life pink coolant
  isCoolant: (h, s, v) =>
    ((h >= 70 && h <= 160) && s >= 0.45 && v >= 0.30) ||
    ((h >= 300 && h <= 340) && s >= 0.50 && v >= 0.40),
};

// Fallback for other vehicle parts — preserves the original v1 behaviour.
const DEFAULT_DETECTORS: Detectors = {
  isGlare: (_h, s, v) => v > 0.95 && s < 0.10,
  isRust:  (h, s, v) => (h <= 30 || h >= 330) && s > 0.30 && v > 0.15 && v < 0.85,
  isDark:  (_h, s, v) => v < 0.18 && s < 0.35,
};

function detectorsFor(part: VehiclePart): Detectors {
  switch (part) {
    case 'underbody':  return UNDERBODY_DETECTORS;
    case 'engine_bay': return ENGINE_BAY_DETECTORS;
    default:           return DEFAULT_DETECTORS;
  }
}

// --- Spatial grid analysis --------------------------------------------------

const GRID = 6; // 6x6 cells, mapped to 3x3 quadrants for labelling
const MAX_SAMPLES = 250_000; // cap effective pixel work for large images
const MIN_CELL_SAMPLES = 200; // skip near-empty cells when picking the worst

interface CellStats {
  analysable: number;
  rust:    number;
  dark:    number;
  coolant: number;
}

interface ScanResult {
  cells: CellStats[];
  totalAnalysable: number;
}

function emptyCells(): CellStats[] {
  return Array.from({ length: GRID * GRID }, () => ({
    analysable: 0, rust: 0, dark: 0, coolant: 0,
  }));
}

function scanImage(
  data: Uint8Array,
  width: number,
  height: number,
  det: Detectors
): ScanResult {
  const stride = Math.max(1, Math.round(Math.sqrt((width * height) / MAX_SAMPLES)));
  const cells = emptyCells();
  let totalAnalysable = 0;

  for (let y = 0; y < height; y += stride) {
    const cellRow = Math.min(GRID - 1, Math.floor((y / height) * GRID));
    const rowBase = cellRow * GRID;
    for (let x = 0; x < width; x += stride) {
      const i = (y * width + x) * 4;
      const [h, s, v] = rgbToHsv(data[i], data[i + 1], data[i + 2]);

      if (det.isGlare(h, s, v)) continue;

      const cellCol = Math.min(GRID - 1, Math.floor((x / width) * GRID));
      const cell = cells[rowBase + cellCol];

      cell.analysable++;
      totalAnalysable++;

      if (det.isRust(h, s, v)) cell.rust++;
      if (det.isDark(h, s, v)) cell.dark++;
      if (det.isCoolant && det.isCoolant(h, s, v)) cell.coolant++;
    }
  }

  return { cells, totalAnalysable };
}

// --- Severity & spatial helpers ---------------------------------------------

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

const SEVERITY_ORDER: Severity[] = ['none', 'minor', 'moderate', 'severe'];

function bumpSeverity(s: Severity): Severity {
  const i = SEVERITY_ORDER.indexOf(s);
  return SEVERITY_ORDER[Math.min(SEVERITY_ORDER.length - 1, i + 1)];
}

function pickOverallSeverity(severities: Severity[]): Severity {
  let max: Severity = 'none';
  for (const s of severities) {
    if (SEVERITY_ORDER.indexOf(s) > SEVERITY_ORDER.indexOf(max)) max = s;
  }
  return max;
}

// 6x6 grid -> 3x3 quadrant labels
const QUADRANT_LABELS = [
  'upper-left',  'upper-center',  'upper-right',
  'middle-left', 'center',        'middle-right',
  'lower-left',  'lower-center',  'lower-right',
];

function cellLabel(cellIdx: number): string {
  const row = Math.floor(cellIdx / GRID);
  const col = cellIdx % GRID;
  const qRow = Math.min(2, Math.floor((row / GRID) * 3));
  const qCol = Math.min(2, Math.floor((col / GRID) * 3));
  return QUADRANT_LABELS[qRow * 3 + qCol];
}

interface CategoryStats {
  globalRatio: number;
  worstRatio:  number;
  worstLabel:  string;
}

function analyseCategory(
  cells: CellStats[],
  totalAnalysable: number,
  pick: (c: CellStats) => number
): CategoryStats {
  let totalMatches = 0;
  let worstRatio = 0;
  let worstIdx = -1;

  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    const matches = pick(c);
    totalMatches += matches;
    if (c.analysable < MIN_CELL_SAMPLES) continue;
    const r = matches / c.analysable;
    if (r > worstRatio) {
      worstRatio = r;
      worstIdx = i;
    }
  }

  return {
    globalRatio: totalAnalysable > 0 ? totalMatches / totalAnalysable : 0,
    worstRatio,
    worstLabel:  worstIdx >= 0 ? cellLabel(worstIdx) : 'across the analysed area',
  };
}

// --- Result text generation -------------------------------------------------

const PART_LABELS: Record<VehiclePart, string> = {
  underbody:      'underbody',
  front:          'front',
  rear:           'rear',
  driver_side:    'driver side',
  passenger_side: 'passenger side',
  roof:           'roof',
  engine_bay:     'engine bay',
  brakes:         'brakes',
  unknown:        'vehicle',
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
  const zones = [...new Set(damages.map((d) => d.location))].slice(0, 3).join(', ');
  return (
    `The ${label} shows ${overall} ${types} based on local image analysis, ` +
    `concentrated in the ${zones}. Consider confirming with AI cloud analysis for greater accuracy.`
  );
}

function buildRecommendations(part: VehiclePart, damages: DamageItem[]): string[] {
  const recs: string[] = [];
  const has = (t: DamageItem['type']) => damages.some((d) => d.type === t);
  const hasSevere   = damages.some((d) => d.severity === 'severe');
  const hasModerate = damages.some((d) => d.severity === 'moderate');

  if (hasSevere) {
    recs.push('Seek professional inspection immediately — severe damage indicators found.');
  }
  if (has('rust') && hasModerate) {
    recs.push('Treat rust with a rust converter and apply a protective anti-corrosion coating.');
  }
  if (has('rust') && !hasSevere) {
    recs.push('Monitor rust progression; consider rust-proofing at your next service.');
  }
  if (has('corrosion')) {
    recs.push('Inspect dark areas for heavy corrosion buildup or oil leaks.');
  }
  if (part === 'engine_bay' && has('leak')) {
    recs.push(
      'Possible fluid leak detected — check the oil pan, valve cover gasket, and cooling system hoses, and have a shop pressure-test before topping up.'
    );
  }
  if (recs.length === 0) {
    recs.push('Continue regular vehicle maintenance and inspection schedule.');
  }
  recs.push('For a more detailed analysis, use the AI (cloud) scan option.');
  return recs;
}

// --- Public API -------------------------------------------------------------

/**
 * Analyze a vehicle image on-device using HSV pixel classification with
 * grid-based spatial localisation and part-specific detectors.
 *
 * Works fully offline — no API key required. Less accurate than cloud AI
 * vision but useful as a fast pre-screen or offline fallback. Adaptive
 * subsampling keeps runtime bounded even on 4K images.
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
  const det = detectorsFor(vehiclePart);

  const jpegData = jpeg.decode(base64ToUint8Array(base64Image), { formatAsRGBA: true });
  const { data, width, height } = jpegData;

  const { cells, totalAnalysable } = scanImage(data as Uint8Array, width, height, det);

  const damages: DamageItem[] = [];

  // --- Rust ---------------------------------------------------------------
  const rust = analyseCategory(cells, totalAnalysable, (c) => c.rust);
  let rustSeverity = ratioToSeverity(rust.globalRatio);
  // Cluster bonus: concentrated damage in one zone is worse than scattered noise.
  if (rust.worstRatio >= 0.40 && rustSeverity !== 'none' && rustSeverity !== 'severe') {
    rustSeverity = bumpSeverity(rustSeverity);
  }
  if (rustSeverity !== 'none') {
    damages.push({
      type: 'rust',
      location: rust.worstLabel,
      severity: rustSeverity,
      confidence: Math.min(0.65 + rust.globalRatio * 1.5 + rust.worstRatio * 0.2, 0.88),
      description:
        `Rust-coloured pixels account for ~${(rust.globalRatio * 100).toFixed(1)}% of the image ` +
        `(peak ${(rust.worstRatio * 100).toFixed(1)}% in the ${rust.worstLabel} zone). ` +
        `This indicates ${rustSeverity} surface rust or corrosion.`,
    });
  }

  // --- Dark patches (corrosion on underbody, oil pooling on engine bay) ----
  const dark = analyseCategory(cells, totalAnalysable, (c) => c.dark);
  const darkSeverity = ratioToSeverity(dark.globalRatio);
  // Underbody: pair with rust to avoid flagging deep shadow as damage.
  // Engine bay: a single concentrated dark zone (>=35%) reads as fluid pooling.
  const flagDark =
    darkSeverity !== 'none' &&
    (vehiclePart === 'engine_bay'
      ? dark.worstRatio >= 0.35
      : rust.globalRatio > 0.03);
  if (flagDark) {
    damages.push({
      type: vehiclePart === 'engine_bay' ? 'leak' : 'corrosion',
      location: dark.worstLabel,
      severity: darkSeverity,
      confidence: 0.55,
      description:
        vehiclePart === 'engine_bay'
          ? `Concentrated dark patches (~${(dark.worstRatio * 100).toFixed(1)}% of the ${dark.worstLabel} zone) ` +
            `may indicate an oil leak, burnt residue, or fluid pooling on the engine block.`
          : `Dark, low-saturation areas (~${(dark.globalRatio * 100).toFixed(1)}%) ` +
            `may indicate heavy corrosion, oil contamination, or burnt metal.`,
    });
  }

  // --- Coolant (engine bay only) ------------------------------------------
  if (vehiclePart === 'engine_bay' && det.isCoolant) {
    const coolant = analyseCategory(cells, totalAnalysable, (c) => c.coolant);
    let coolantSeverity: Severity = 'none';
    if (coolant.worstRatio >= 0.08)        coolantSeverity = 'severe';
    else if (coolant.worstRatio >= 0.03)   coolantSeverity = 'moderate';
    else if (coolant.globalRatio >= 0.005) coolantSeverity = 'minor';
    if (coolantSeverity !== 'none') {
      damages.push({
        type: 'leak',
        location: coolant.worstLabel,
        severity: coolantSeverity,
        confidence: 0.60,
        description:
          `Bright green/pink pixels (~${(coolant.worstRatio * 100).toFixed(1)}% of the ${coolant.worstLabel} zone) ` +
          `match typical coolant colours and may indicate a leak or residue.`,
      });
    }
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
    recommendations: buildRecommendations(vehiclePart, damages),
  };
}
