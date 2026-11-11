/** Small, pre-norm Vision Transformer inference. No production weights bundled. */
import type { LocalLstmModel } from './lstm';
import { validateLocalLstmModel } from './lstm.ts';

export interface VitLinear { weights: number[]; bias: number[] }
export interface VitNorm { scale: number[]; bias: number[] }
export interface VitBlock {
  norm1: VitNorm;
  qkv: VitLinear;
  projection: VitLinear;
  norm2: VitNorm;
  mlp1: VitLinear;
  mlp2: VitLinear;
}
export interface LocalVitModel {
  version: 1;
  id: string;
  inputSchema: 'rgb-patches-v1';
  vehicleParts: LocalLstmModel['vehicleParts'];
  labels: LocalLstmModel['labels'];
  imageSize: number;
  patchSize: number;
  embeddingSize: number;
  heads: number;
  mlpSize: number;
  patchEmbedding: VitLinear;
  clsToken: number[];
  positions: number[];
  blocks: VitBlock[];
  norm: VitNorm;
  classifier: VitLinear;
}

function tensor(values: number[], length: number): void {
  if (!Array.isArray(values) || values.length !== length || values.some(v => !Number.isFinite(v) || Math.abs(v) > 1e6)) {
    throw new Error('Invalid ViT tensor dimensions or values.');
  }
}
function linearShape(layer: VitLinear, input: number, output: number): void {
  tensor(layer.weights, input * output); tensor(layer.bias, output);
}
function normShape(layer: VitNorm, size: number): void {
  tensor(layer.scale, size); tensor(layer.bias, size);
}
export function validateLocalVitModel(m: LocalVitModel): void {
  const d = m.embeddingSize;
  if (m.version !== 1 || m.inputSchema !== 'rgb-patches-v1' ||
      !Number.isInteger(m.imageSize) || m.imageSize < 8 || m.imageSize > 64 ||
      !Number.isInteger(m.patchSize) || m.patchSize < 2 || m.imageSize % m.patchSize !== 0 ||
      (m.imageSize / m.patchSize) ** 2 > 64 ||
      !Number.isInteger(d) || d < 2 || d > 64 ||
      !Number.isInteger(m.heads) || m.heads < 1 || d % m.heads !== 0 ||
      !Number.isInteger(m.mlpSize) || m.mlpSize < 1 || m.mlpSize > 256 ||
      !Array.isArray(m.blocks) || m.blocks.length < 1 || m.blocks.length > 4) {
    throw new Error('Invalid ViT architecture.');
  }
  // Reuse the SDK's damage-label and supported-part contract validation.
  validateLocalLstmModel({ version: 1, id: m.id, featureSchema: 'grid6x6-v1',
    hiddenSize: 1, vehicleParts: m.vehicleParts, labels: m.labels,
    inputWeights: Array(28).fill(0), recurrentWeights: [0, 0, 0, 0], bias: [0, 0, 0, 0],
    outputWeights: Array(m.labels.length).fill(0), outputBias: Array(m.labels.length).fill(0) });
  linearShape(m.patchEmbedding, m.patchSize ** 2 * 3, d);
  tensor(m.clsToken, d); tensor(m.positions, ((m.imageSize / m.patchSize) ** 2 + 1) * d);
  for (const b of m.blocks) {
    normShape(b.norm1, d); normShape(b.norm2, d);
    linearShape(b.qkv, d, 3 * d); linearShape(b.projection, d, d);
    linearShape(b.mlp1, d, m.mlpSize); linearShape(b.mlp2, m.mlpSize, d);
  }
  normShape(m.norm, d); linearShape(m.classifier, d, m.labels.length);
}

function linear(x: number[], layer: VitLinear): number[] {
  return layer.bias.map((bias, row) => x.reduce((sum, v, col) => sum + v * layer.weights[row * x.length + col], bias));
}
function norm(x: number[], layer: VitNorm): number[] {
  const mean = x.reduce((a, b) => a + b, 0) / x.length;
  const variance = x.reduce((sum, v) => sum + (v - mean) ** 2, 0) / x.length;
  return x.map((v, i) => (v - mean) / Math.sqrt(variance + 1e-5) * layer.scale[i] + layer.bias[i]);
}
const add = (a: number[], b: number[]): number[] => a.map((v, i) => v + b[i]);
const gelu = (x: number): number => 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)));

/** Nearest-neighbor square resize; row-major patches, interleaved RGB in [-1,1]. */
export function extractVitPatches(data: Uint8Array, width: number, height: number, m: LocalVitModel): number[][] {
  validateLocalVitModel(m);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || data.length !== width * height * 4) {
    throw new Error('Invalid ViT RGBA image.');
  }
  const patches: number[][] = [];
  for (let py = 0; py < m.imageSize; py += m.patchSize) {
    for (let px = 0; px < m.imageSize; px += m.patchSize) {
      const patch: number[] = [];
      for (let y = 0; y < m.patchSize; y++) for (let x = 0; x < m.patchSize; x++) {
        const sx = Math.floor((px + x) * width / m.imageSize);
        const sy = Math.floor((py + y) * height / m.imageSize);
        const offset = (sy * width + sx) * 4;
        for (let c = 0; c < 3; c++) patch.push(data[offset + c] / 127.5 - 1);
      }
      patches.push(patch);
    }
  }
  return patches;
}

export function predictLocalVit(m: LocalVitModel, patches: number[][]): number[] {
  validateLocalVitModel(m);
  const d = m.embeddingSize, headSize = d / m.heads;
  if (patches.length !== (m.imageSize / m.patchSize) ** 2 || patches.some(p =>
    p.length !== m.patchSize ** 2 * 3 || p.some(v => !Number.isFinite(v) || v < -1 || v > 1))) {
    throw new Error('Invalid ViT patch input.');
  }
  let tokens = [m.clsToken.slice(), ...patches.map(p => linear(p, m.patchEmbedding))]
    .map((t, i) => add(t, m.positions.slice(i * d, (i + 1) * d)));
  for (const b of m.blocks) {
    const qkv = tokens.map(t => linear(norm(t, b.norm1), b.qkv));
    tokens = tokens.map((token, i) => {
      const attended = Array<number>(d).fill(0);
      for (let head = 0; head < m.heads; head++) {
        const start = head * headSize;
        const logits = qkv.map(key => {
          let dot = 0;
          for (let c = start; c < start + headSize; c++) dot += qkv[i][c] * key[d + c];
          return dot / Math.sqrt(headSize);
        });
        const max = Math.max(...logits);
        const weights = logits.map(v => Math.exp(v - max));
        const total = weights.reduce((a, v) => a + v, 0);
        for (let j = 0; j < tokens.length; j++) for (let c = start; c < start + headSize; c++) {
          attended[c] += weights[j] / total * qkv[j][2 * d + c];
        }
      }
      return add(token, linear(attended, b.projection));
    });
    tokens = tokens.map(t => add(t, linear(linear(norm(t, b.norm2), b.mlp1).map(gelu), b.mlp2)));
  }
  const scores = linear(norm(tokens[0], m.norm), m.classifier).map(v => 1 / (1 + Math.exp(-v)));
  if (scores.some(v => !Number.isFinite(v))) throw new Error('Non-finite ViT prediction.');
  return scores;
}

let configured: LocalVitModel | undefined;
export function configureLocalVit(model?: LocalVitModel): void {
  if (!model) { configured = undefined; return; }
  validateLocalVitModel(model);
  configured = JSON.parse(JSON.stringify(model)) as LocalVitModel;
}
/** Internal inference access; callers configure through configureLocalVit. */
export function getLocalVitModel(): LocalVitModel | undefined { return configured; }
