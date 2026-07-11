/**
 * analyzeLocal.ts
 *
 * On-device vehicle image analysis using HSV pixel classification, luminance
 * gradient (edge) analysis, and grid-based spatial localisation with
 * part-specific detectors. Runs fully offline — no API key, no network, no
 * per-scan cost. This is the app's primary inspection engine.
 *
 * Algorithm (v3):
 *  1. Decode base64 JPEG -> raw RGBA pixel data (via jpeg-js)
 *  2. Adaptive subsampling caps work at ~250k samples regardless of resolution
 *  3. Partition the image into a 6x6 grid (36 zones)
 *  4. Per-sample, accumulate per zone:
 *       - HSV classification (rust / dark / coolant) with part-specific bands
 *       - luminance + edge energy (|dL/dx| + |dL/dy|) for texture/anomaly work
 *       - glare (blown highlights) excluded from the analysable set
 *  5. Image-quality gate: too dark / glare-blown / featureless photos return an
 *     honest "retake" result instead of a misleading "no damage found"
 *  6. Map global + worst-cell ratios -> severity; a concentrated worst cell
 *     bumps severity (clustered damage beats scattered noise)
 *  7. Body-panel parts get a conservative localized surface-anomaly check
 *     (possible dent/scratch) from edge clustering — hedged, low confidence
 *  8. Return an InspectionResult (same shape as every other analysis path)
 *
 * Honest limitations: colour + edge heuristics flag *visual indicators*, not
 * confirmed defects. Confidence is capped at 0.88. They cannot reliably
 * distinguish rust from paint/dirt, or a dent from a body line or reflection —
 * findings are framed as "possible" and a hands-on inspection is recommended
 * for anything moderate or severe.
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

/** Rec. 601 luma (0-1) from RGB 0-255. */
function luma(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
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

// Smooth body panels where a localized edge/shadow cluster may be a dent or
// scratch. Excludes underbody/engine_bay/brakes (busy by nature) and unknown.
const PANEL_PARTS = new Set<VehiclePart>([
  'front', 'rear', 'driver_side', 'passenger_side', 'roof',
]);

// --- Adaptive luminance normalisation ----------------------------------------

/**
 * Coarse brightness estimate: samples every 16th pixel, ignores glare.
 * Returns mean V (0–1). Used to compute a vBoost for dark images.
 */
function quickMeanV(
  data: Uint8Array,
  width: number,
  height: number,
  isGlare: Detectors['isGlare'],
): number {
  const stride = 16;
  let sumV = 0, count = 0;
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const i = (y * width + x) * 4;
      const [h, s, v] = rgbToHsv(data[i], data[i + 1], data[i + 2]);
      if (!isGlare(h, s, v)) { sumV += v; count++; }
    }
  }
  return count > 0 ? sumV / count : 0.5;
}

/**
 * For a mean V below 0.22 (dark image — typical for underbody shots taken
 * in low light or from below a vehicle), compute a boost factor that
 * stretches pixel brightness toward a 0.35 target midpoint.
 * Capped at 2.5× to avoid over-brightening partially-lit images.
 */
function computeVBoost(meanV: number): number {
  if (meanV >= 0.22) return 1.0;
  return Math.min(0.35 / Math.max(meanV, 0.09), 2.5);
}

// --- Spatial grid analysis --------------------------------------------------

const GRID = 6; // 6x6 cells, mapped to 3x3 quadrants for labelling
const MAX_SAMPLES = 250_000; // cap effective pixel work for large images
const MIN_CELL_SAMPLES = 200; // skip near-empty cells when picking the worst
const EDGE_THRESHOLD = 0.12;  // luma step (0-1) counted as an edge sample

interface CellStats {
  analysable: number;
  rust:    number;
  dark:    number;
  coolant: number;
  sumLum:  number; // sum of luma over analysable samples
  sumSat:  number; // sum of saturation over analysable samples
  sumVal:  number; // sum of value/brightness over analysable samples
  edge:    number; // count of analysable samples whose local gradient > EDGE_THRESHOLD
}

interface ScanResult {
  cells: CellStats[];
  totalAnalysable: number;
  totalSampled: number;  // analysable + glare
  glareSamples: number;
  edgeSamples: number;   // total edge count over analysable
}

function emptyCells(): CellStats[] {
  return Array.from({ length: GRID * GRID }, () => ({
    analysable: 0, rust: 0, dark: 0, coolant: 0, sumLum: 0, sumSat: 0, sumVal: 0, edge: 0,
  }));
}

function scanImage(
  data: Uint8Array,
  width: number,
  height: number,
  det: Detectors,
  vBoost: number,
): ScanResult {
  const stride = Math.max(1, Math.round(Math.sqrt((width * height) / MAX_SAMPLES)));
  const cells = emptyCells();
  let totalAnalysable = 0;
  let totalSampled = 0;
  let glareSamples = 0;
  let edgeSamples = 0;

  for (let y = 0; y < height; y += stride) {
    const cellRow = Math.min(GRID - 1, Math.floor((y / height) * GRID));
    const rowBase = cellRow * GRID;
    for (let x = 0; x < width; x += stride) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const [h, s, v] = rgbToHsv(r, g, b);

      totalSampled++;

      // Glare check uses raw V — boost doesn't make blown highlights disappear.
      if (det.isGlare(h, s, v)) { glareSamples++; continue; }

      // Apply luminance boost for classification only. A dark underbody shot
      // with meanV ~0.12 would have most rust pixels fall below the V floor
      // and go undetected without this adjustment.
      const vAdj = Math.min(v * vBoost, 1.0);

      const cellCol = Math.min(GRID - 1, Math.floor((x / width) * GRID));
      const cell = cells[rowBase + cellCol];

      cell.analysable++;
      totalAnalysable++;

      // Luma + local gradient (forward difference to the next sampled pixel).
      const L = luma(r, g, b);
      cell.sumLum += L;
      cell.sumSat += s;
      cell.sumVal += vAdj;
      if (x + stride < width && y + stride < height) {
        const ix = (y * width + (x + stride)) * 4;
        const iy = ((y + stride) * width + x) * 4;
        const gx = Math.abs(L - luma(data[ix], data[ix + 1], data[ix + 2]));
        const gy = Math.abs(L - luma(data[iy], data[iy + 1], data[iy + 2]));
        if (gx + gy > EDGE_THRESHOLD) { cell.edge++; edgeSamples++; }
      }

      if (det.isRust(h, s, vAdj)) cell.rust++;
      if (det.isDark(h, s, vAdj)) cell.dark++;
      if (det.isCoolant && det.isCoolant(h, s, vAdj)) cell.coolant++;
    }
  }

  return { cells, totalAnalysable, totalSampled, glareSamples, edgeSamples };
}

// --- Image quality gate -----------------------------------------------------

interface ImageQuality {
  usable: boolean;
  caveats: string[];
  /** Short reason for an unusable image, used to build the retake summary. */
  blocker?: string;
}

function assessQuality(scan: ScanResult, meanV: number): ImageQuality {
  const caveats: string[] = [];
  const glareRatio = scan.totalSampled > 0 ? scan.glareSamples / scan.totalSampled : 0;
  const sharpness = scan.totalAnalysable > 0 ? scan.edgeSamples / scan.totalAnalysable : 0;

  // Hard blockers — too degraded to give an honest result.
  if (scan.totalAnalysable < 500) {
    return { usable: false, caveats, blocker: 'almost the entire frame is unreadable (glare or darkness)' };
  }
  if (meanV < 0.07) {
    return { usable: false, caveats, blocker: 'the photo is too dark to analyse' };
  }
  if (glareRatio > 0.65) {
    return { usable: false, caveats, blocker: 'most of the frame is blown-out glare' };
  }

  // Soft caveats — analysable, but flag reduced reliability.
  if (meanV < 0.14) caveats.push('Image is dark — add light or use the flash for a more reliable scan.');
  if (glareRatio > 0.4) caveats.push('Strong glare covers part of the frame — try a different angle or softer light.');
  if (sharpness < 0.02) caveats.push('Image looks low-detail or out of focus — hold steady and refocus, then rescan.');

  return { usable: true, caveats };
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
  worstIndex:  number;
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
    worstIndex: worstIdx,
  };
}

function safeRatio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function cellEdgeRatio(cell: CellStats | undefined): number {
  return cell ? safeRatio(cell.edge, cell.analysable) : 0;
}

function cellMeanSat(cell: CellStats | undefined): number {
  return cell ? safeRatio(cell.sumSat, cell.analysable) : 0;
}

function cellMeanVal(cell: CellStats | undefined): number {
  return cell ? safeRatio(cell.sumVal, cell.analysable) : 0;
}

function buildDarkFindingContext(
  cells: CellStats[],
  dark: CategoryStats,
  rust: CategoryStats,
  vehiclePart: VehiclePart,
): {
  shouldFlag: boolean;
  confidence: number;
  severity: Severity;
  type: DamageItem['type'];
  description: string;
} {
  const worstCell = dark.worstIndex >= 0 ? cells[dark.worstIndex] : undefined;
  const worstEdgeRatio = cellEdgeRatio(worstCell);
  const worstMeanSat = cellMeanSat(worstCell);
  const worstMeanVal = cellMeanVal(worstCell);
  const baseSeverity = ratioToSeverity(dark.globalRatio);

  const hasShadowSignature =
    dark.worstRatio >= 0.25 &&
    worstMeanVal < 0.22 &&
    worstMeanSat < 0.12 &&
    worstEdgeRatio < 0.08;

  if (baseSeverity === 'none' || hasShadowSignature) {
    return {
      shouldFlag: false,
      confidence: 0,
      severity: 'none',
      type: vehiclePart === 'engine_bay' ? 'leak' : 'corrosion',
      description: '',
    };
  }

  if (vehiclePart === 'engine_bay') {
    const looksLikePooling =
      dark.worstRatio >= 0.35 && (worstEdgeRatio >= 0.10 || worstMeanSat >= 0.14 || dark.globalRatio >= 0.10);

    return {
      shouldFlag: looksLikePooling,
      confidence: looksLikePooling ? Math.min(0.48 + dark.worstRatio * 0.25 + worstEdgeRatio * 0.3, 0.74) : 0,
      severity: baseSeverity,
      type: 'leak',
      description:
        `Concentrated dark patches (~${(dark.worstRatio * 100).toFixed(1)}% of the ${dark.worstLabel} zone) ` +
        `show enough texture or residue variation to suggest oil seepage, burnt residue, or fluid pooling on the engine block.`,
    };
  }

  const corrosionSupport =
    rust.globalRatio > 0.03 ||
    worstEdgeRatio >= 0.12 ||
    worstMeanSat >= 0.16 ||
    dark.worstRatio >= 0.40;

  return {
    shouldFlag: corrosionSupport,
    confidence: corrosionSupport ? Math.min(0.42 + dark.globalRatio * 0.8 + worstEdgeRatio * 0.35, 0.72) : 0,
    severity: baseSeverity,
    type: 'corrosion',
    description:
      `Dark, low-saturation areas (~${(dark.globalRatio * 100).toFixed(1)}% of the analysed area) ` +
      `are concentrated in the ${dark.worstLabel} zone and look more like corrosion buildup, residue, or staining than uniform shadow.`,
  };
}

function adjustRustSeverity(
  vehiclePart: VehiclePart,
  rust: CategoryStats,
  dark: CategoryStats,
  cells: CellStats[],
): Severity {
  let severity = ratioToSeverity(rust.globalRatio);
  if (rust.worstRatio >= 0.40 && severity !== 'none' && severity !== 'severe') {
    severity = bumpSeverity(severity);
  }

  if (vehiclePart !== 'underbody' && vehiclePart !== 'engine_bay') {
    return severity;
  }

  const worstCell = rust.worstIndex >= 0 ? cells[rust.worstIndex] : undefined;
  const supportEdgeRatio = cellEdgeRatio(worstCell);
  const supportDarkRatio = dark.worstRatio;
  const supportMeanSat = cellMeanSat(worstCell);
  const weakStructuralEvidence =
    severity === 'severe' &&
    supportDarkRatio < 0.18 &&
    supportEdgeRatio < 0.12 &&
    supportMeanSat > 0.32;

  return weakStructuralEvidence ? 'moderate' : severity;
}

/**
 * Conservative localized surface-anomaly check for smooth body panels.
 * A dent, scratch, or crease shows up as a cell whose edge density is far
 * above the panel's median while the panel is otherwise smooth. Trim lines,
 * badges, and reflections can trigger this too, so confidence stays low and
 * the finding is framed as "possible".
 */
function detectSurfaceAnomaly(cells: CellStats[]): DamageItem | null {
  const ratios: { idx: number; r: number }[] = [];
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    if (c.analysable < MIN_CELL_SAMPLES) continue;
    ratios.push({ idx: i, r: c.edge / c.analysable });
  }
  if (ratios.length < 6) return null;

  const sorted = [...ratios].sort((a, b) => a.r - b.r);
  const median = sorted[Math.floor(sorted.length / 2)].r;
  const worst = sorted[sorted.length - 1];

  // Otherwise-smooth panel (low median) with one clearly busier zone.
  const isLocalizedSpike =
    median < 0.08 && worst.r >= 0.32 && worst.r >= median * 4 + 0.05;
  if (!isLocalizedSpike) return null;

  const severity: Severity = worst.r >= 0.5 ? 'moderate' : 'minor';
  return {
    type: 'dent',
    location: cellLabel(worst.idx),
    severity,
    confidence: 0.45,
    description:
      `A localized cluster of edges/shadows in the ${cellLabel(worst.idx)} zone ` +
      `(${(worst.r * 100).toFixed(0)}% edge density vs ${(median * 100).toFixed(0)}% panel average) ` +
      `may indicate a dent, scratch, crease, or a body line/trim feature. On-device ` +
      `analysis cannot confirm panel damage — check this spot by eye in raking light.`,
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
  overall: Severity,
  caveats: string[],
): string {
  const label = PART_LABELS[part];
  const caveatSuffix = caveats.length ? ` ${caveats.join(' ')}` : '';

  if (overall === 'none') {
    return (
      `The ${label} shows no clear damage indicators in this on-device scan. ` +
      `This checks for visual signs (rust colour, dark patches, surface anomalies) ` +
      `and is not a substitute for a hands-on inspection.${caveatSuffix}`
    );
  }
  const types = [...new Set(damages.map((d) => d.type))].join(' and ');
  const zones = [...new Set(damages.map((d) => d.location))].slice(0, 3).join(', ');
  return (
    `The ${label} shows possible ${overall} ${types} based on on-device image ` +
    `analysis, concentrated in the ${zones}.${caveatSuffix}`
  );
}

function buildRecommendations(part: VehiclePart, damages: DamageItem[]): string[] {
  const recs: string[] = [];
  const has = (t: DamageItem['type']) => damages.some((d) => d.type === t);
  const hasSevere   = damages.some((d) => d.severity === 'severe');
  const hasModerate = damages.some((d) => d.severity === 'moderate');

  if (hasSevere) {
    recs.push('Seek a professional inspection — severe damage indicators were detected.');
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
  if (has('dent')) {
    recs.push('Inspect the flagged panel zone by eye under raking light to confirm a dent or scratch.');
  }
  if (part === 'engine_bay' && has('leak')) {
    recs.push(
      'Possible fluid leak detected — check the oil pan, valve cover gasket, and cooling system hoses, and have a shop pressure-test before topping up.'
    );
  }
  if (recs.length === 0) {
    recs.push('Continue your regular vehicle maintenance and inspection schedule.');
  }
  if (hasModerate || hasSevere) {
    recs.push('On-device analysis flags visual indicators only — confirm moderate or severe findings with a mechanic.');
  }
  return recs;
}

// --- Public API -------------------------------------------------------------

/**
 * Analyze a vehicle image on-device using HSV pixel classification, edge
 * analysis, and grid-based spatial localisation with part-specific detectors.
 *
 * Works fully offline — no API key required. Flags visual indicators (rust
 * colour, dark/corrosion patches, coolant colour, localized panel anomalies)
 * rather than confirming defects; confidence is capped at 0.88. Adaptive
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

  // Coarse luminance check — if the image is dark (e.g. underbody shot taken
  // under a vehicle), boost V so rust pixels don't fall below the classifier floor.
  const meanV = quickMeanV(data as Uint8Array, width, height, det.isGlare);
  const vBoost = computeVBoost(meanV);

  const scan = scanImage(data as Uint8Array, width, height, det, vBoost);
  const { cells, totalAnalysable } = scan;

  // --- Quality gate -------------------------------------------------------
  const quality = assessQuality(scan, meanV);
  if (!quality.usable) {
    return {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      vehiclePart,
      imageUri,
      damages: [],
      overallSeverity: 'none',
      summary:
        `This scan couldn't be completed reliably because ${quality.blocker}. ` +
        `Retake the photo of the ${PART_LABELS[vehiclePart]} in even lighting, holding the camera steady.`,
      recommendations: [
        'Retake the photo with better, even lighting and the subject in focus.',
        'Avoid direct sun reflections and deep shadow on the area you want to inspect.',
      ],
    };
  }

  const damages: DamageItem[] = [];

  const dark = analyseCategory(cells, totalAnalysable, (c) => c.dark);

  // --- Rust ---------------------------------------------------------------
  const rust = analyseCategory(cells, totalAnalysable, (c) => c.rust);
  const rustSeverity = adjustRustSeverity(vehiclePart, rust, dark, cells);
  if (rustSeverity !== 'none') {
    const rustWorstCell = rust.worstIndex >= 0 ? cells[rust.worstIndex] : undefined;
    const rustSupportEdge = cellEdgeRatio(rustWorstCell);
    damages.push({
      type: 'rust',
      location: rust.worstLabel,
      severity: rustSeverity,
      confidence: Math.min(0.56 + rust.globalRatio * 1.35 + rust.worstRatio * 0.18 + rustSupportEdge * 0.12, 0.88),
      description:
        `Rust-coloured pixels account for ~${(rust.globalRatio * 100).toFixed(1)}% of the image ` +
        `(peak ${(rust.worstRatio * 100).toFixed(1)}% in the ${rust.worstLabel} zone, ` +
        `${(rustSupportEdge * 100).toFixed(0)}% edge density). ` +
        `This indicates possible ${rustSeverity} surface rust or corrosion.`,
    });
  }

  // --- Dark patches (corrosion on underbody, oil pooling on engine bay) ----
  const darkFinding = buildDarkFindingContext(cells, dark, rust, vehiclePart);
  if (darkFinding.shouldFlag) {
    damages.push({
      type: darkFinding.type,
      location: dark.worstLabel,
      severity: darkFinding.severity,
      confidence: darkFinding.confidence,
      description: darkFinding.description,
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

  // --- Surface anomaly (body panels only) ---------------------------------
  if (PANEL_PARTS.has(vehiclePart)) {
    const anomaly = detectSurfaceAnomaly(cells);
    if (anomaly) damages.push(anomaly);
  }

  const overallSeverity = pickOverallSeverity(damages.map((d) => d.severity));

  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    vehiclePart,
    imageUri,
    damages,
    overallSeverity,
    summary: buildSummary(vehiclePart, damages, overallSeverity, quality.caveats),
    recommendations: buildRecommendations(vehiclePart, damages),
  };
}
