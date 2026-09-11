import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { analyzeVehicleImageLocally } from '../src/sdk/analyzeLocal.ts';

// Labels describe visible indicators confirmed by a reviewer, not vehicle roadworthiness.
const parts = ['underbody', 'front', 'rear', 'driver_side', 'passenger_side', 'roof', 'engine_bay', 'brakes', 'unknown'] as const;
const types = ['rust', 'corrosion', 'structural_damage', 'dent', 'scratch', 'crack', 'leak', 'wear', 'other'] as const;
type Row = { file: string; vehiclePart: typeof parts[number]; expected: typeof types[number][]; retake: boolean };
const manifest = process.argv[2];
if (!manifest) throw new Error('Usage: npm run evaluate:detection -- path/to/manifest.json');
const parsed: unknown = JSON.parse(await readFile(manifest, 'utf8'));
if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Manifest must be a nonempty array of labeled JPEG cases.');
const rows: Row[] = parsed.map((value: unknown, i) => {
  if (!value || typeof value !== 'object') throw new Error(`Invalid case ${i}`);
  const r = value as Record<string, unknown>;
  if (typeof r.file !== 'string' || !parts.some(p => p === r.vehiclePart) || typeof r.retake !== 'boolean' ||
      !Array.isArray(r.expected) || !r.expected.every(t => types.some(v => v === t))) throw new Error(`Invalid case ${i}`);
  return r as Row;
});
const totals = Object.fromEntries(types.map(t => [t, { tp: 0, fp: 0, fn: 0 }])) as Record<typeof types[number], { tp: number; fp: number; fn: number }>;
let retakeCorrect = 0;
const cases = [];
for (const row of rows) {
  const bytes = await readFile(resolve(dirname(resolve(manifest)), row.file));
  const result = await analyzeVehicleImageLocally(bytes.toString('base64'), row.file, { vehiclePart: row.vehiclePart });
  if (result.requiresRetake === row.retake) retakeCorrect++;
  const predicted = new Set(result.damages.map(d => d.type));
  // Retake-labeled frames are evaluated only for image quality, not defect detection.
  if (!row.retake) for (const type of types) {
    const expected = row.expected.includes(type);
    if (predicted.has(type) && expected) totals[type].tp++;
    if (predicted.has(type) && !expected) totals[type].fp++;
    if (!predicted.has(type) && expected) totals[type].fn++;
  }
  cases.push({ file: row.file, expected: row.expected, predicted: [...predicted], expectedRetake: row.retake, actualRetake: result.requiresRetake });
}
console.log(JSON.stringify({ cases, retake: { correct: retakeCorrect, total: rows.length }, metrics: Object.fromEntries(types.map(type => {
  const { tp, fp, fn } = totals[type];
  return [type, { tp, fp, fn, precision: tp + fp ? tp / (tp + fp) : null, recall: tp + fn ? tp / (tp + fn) : null }];
})) }, null, 2));
