/** Offline, single-layer LSTM inference over row-major image grid features.
 * No weights are bundled: callers must supply a trained, validated model.
 */
import type { DamageType, Severity, VehiclePart } from './types';

export const LSTM_FEATURES = ['rust', 'dark', 'coolant', 'luma', 'saturation', 'value', 'edges'] as const;

export interface LocalLstmModel {
  version: 1;
  id: string;
  featureSchema: 'grid6x6-v1';
  vehicleParts: VehiclePart[];
  hiddenSize: number;
  /** Row-major [4H, 7] and [4H, H]; gate order: input, forget, candidate, output. */
  inputWeights: number[];
  recurrentWeights: number[];
  bias: number[];
  /** Independent sigmoid heads, row-major [labels.length, H]. */
  outputWeights: number[];
  outputBias: number[];
  labels: { type: DamageType; severity: Exclude<Severity, 'none'>; threshold: number }[];
}

const PARTS = new Set<VehiclePart>(['underbody', 'front', 'rear', 'driver_side', 'passenger_side', 'roof', 'engine_bay', 'brakes', 'unknown']);
const TYPES = new Set<DamageType>(['rust', 'corrosion', 'structural_damage', 'dent', 'scratch', 'crack', 'leak', 'wear', 'other']);

export function validateLocalLstmModel(model: LocalLstmModel): void {
  const h = model.hiddenSize;
  if (model.version !== 1 || model.featureSchema !== 'grid6x6-v1' || !model.id?.trim() ||
      !Number.isInteger(h) || h < 1 || h > 128 || !Array.isArray(model.labels) ||
      model.labels.length < 1 || model.labels.length > 64 || !Array.isArray(model.vehicleParts) ||
      !model.vehicleParts.length || model.vehicleParts.some(p => !PARTS.has(p))) {
    throw new Error('Invalid local LSTM model metadata.');
  }
  for (const [values, size] of [
    [model.inputWeights, 4 * h * 7], [model.recurrentWeights, 4 * h * h],
    [model.bias, 4 * h], [model.outputWeights, model.labels.length * h],
    [model.outputBias, model.labels.length],
  ] as const) {
    if (!Array.isArray(values) || values.length !== size || values.some(v => !Number.isFinite(v))) {
      throw new Error('Invalid local LSTM tensor dimensions or values.');
    }
  }
  for (const label of model.labels) {
    if (!TYPES.has(label.type) || !['minor', 'moderate', 'severe'].includes(label.severity) ||
        !Number.isFinite(label.threshold) || label.threshold <= 0 || label.threshold >= 1) {
      throw new Error('Invalid local LSTM output label.');
    }
  }
}

const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

export function predictLocalLstm(model: LocalLstmModel, sequence: number[][]): number[] {
  validateLocalLstmModel(model);
  if (sequence.length !== 36 || sequence.some(row => row.length !== 7 || row.some(v => !Number.isFinite(v) || v < 0 || v > 1))) {
    throw new Error('LSTM requires 36 row-major cells with seven normalized features each.');
  }
  const size = model.hiddenSize;
  let hidden = new Float64Array(size);
  const cell = new Float64Array(size);
  for (const input of sequence) {
    const gates = new Float64Array(4 * size);
    for (let r = 0; r < gates.length; r++) {
      let sum = model.bias[r];
      for (let j = 0; j < 7; j++) sum += model.inputWeights[r * 7 + j] * input[j];
      for (let j = 0; j < size; j++) sum += model.recurrentWeights[r * size + j] * hidden[j];
      gates[r] = sum;
    }
    const next = new Float64Array(size);
    for (let j = 0; j < size; j++) {
      cell[j] = sigmoid(gates[size + j]) * cell[j] + sigmoid(gates[j]) * Math.tanh(gates[2 * size + j]);
      next[j] = sigmoid(gates[3 * size + j]) * Math.tanh(cell[j]);
    }
    hidden = next;
  }
  return model.labels.map((_, r) => {
    let sum = model.outputBias[r];
    for (let j = 0; j < size; j++) sum += model.outputWeights[r * size + j] * hidden[j];
    return sigmoid(sum);
  });
}

let configuredModel: LocalLstmModel | undefined;

/** Validate and snapshot weights at app startup; undefined disables inference. */
export function configureLocalLstm(model?: LocalLstmModel): void {
  if (!model) { configuredModel = undefined; return; }
  validateLocalLstmModel(model);
  configuredModel = JSON.parse(JSON.stringify(model)) as LocalLstmModel;
}

export function getLocalLstmModel(): LocalLstmModel | undefined {
  return configuredModel;
}
