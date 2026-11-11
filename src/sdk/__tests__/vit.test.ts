import assert from 'node:assert/strict';
import { test } from 'node:test';
import jpeg from 'jpeg-js';
import { configureLocalVit, extractVitPatches, predictLocalVit, validateLocalVitModel } from '../vit.ts';
import type { LocalVitModel, VitLinear } from '../vit.ts';
import { analyzeVehicleImageLocally } from '../analyzeLocal.ts';

function fixture(): LocalVitModel {
  const layer = (input: number, output: number): VitLinear => ({ weights: Array(input * output).fill(0), bias: Array(output).fill(0) });
  const norm = () => ({ scale: [1, 1], bias: [0, 0] });
  return {
    version: 1, id: 'synthetic-test-only', inputSchema: 'rgb-patches-v1', vehicleParts: ['underbody'],
    labels: [{ type: 'rust', severity: 'minor', threshold: 0.8 }],
    imageSize: 8, patchSize: 4, embeddingSize: 2, heads: 1, mlpSize: 2,
    patchEmbedding: layer(48, 2), clsToken: [0, 0], positions: Array(10).fill(0),
    blocks: [{ norm1: norm(), qkv: layer(2, 6), projection: layer(2, 2), norm2: norm(), mlp1: layer(2, 2), mlp2: layer(2, 2) }],
    norm: norm(), classifier: layer(2, 1),
  };
}

test('ViT patch extraction preserves row-major RGB and normalization', () => {
  const rgba = new Uint8Array(8 * 8 * 4);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const i = (y * 8 + x) * 4;
    rgba[i] = x < 4 ? 255 : 0; rgba[i + 1] = y < 4 ? 255 : 0;
  }
  const patches = extractVitPatches(rgba, 8, 8, fixture());
  assert.deepEqual(patches.map(p => p.slice(0, 3)), [[1, 1, -1], [-1, 1, -1], [1, -1, -1], [-1, -1, -1]]);
  assert.equal(patches[0].length, 48);
});

test('uniform attention transports patch content to CLS with analytical score', () => {
  const m = fixture();
  m.patchEmbedding.weights[0] = 1;
  // Q=K=0 gives uniform attention. V and projection are identity.
  m.blocks[0].qkv.weights[8] = 1;
  m.blocks[0].qkv.weights[11] = 1;
  m.blocks[0].projection.weights = [1, 0, 0, 1];
  m.classifier.weights = [1, 0];
  const patches = Array.from({ length: 4 }, () => Array(48).fill(1));
  const patchNorm = 0.5 / Math.sqrt(0.25 + 1e-5);
  const attended = 4 / 5 * patchNorm;
  const final = attended / Math.sqrt(attended ** 2 + 1e-5);
  const expected = 1 / (1 + Math.exp(-final));
  assert.ok(Math.abs(predictLocalVit(m, patches)[0] - expected) < 1e-12);
  assert.deepEqual(predictLocalVit(m, patches), predictLocalVit(m, patches));
  assert.equal(predictLocalVit(m, patches.map(p => p.map(v => -v)))[0] < 0.5, true);
});

test('ViT rejects bad architecture, weights and patch input', () => {
  const m = fixture(); m.heads = 3;
  assert.throws(() => validateLocalVitModel(m), /architecture/);
  const bad = fixture(); bad.positions[0] = NaN;
  assert.throws(() => configureLocalVit(bad), /tensor/);
  assert.throws(() => predictLocalVit(fixture(), []), /patch/);
});

test('ViT integrates with quality gates, part filtering, snapshot and disable', async () => {
  const m = fixture(); m.classifier.bias[0] = 3;
  const encode = (value: number) => Buffer.from(jpeg.encode({ width: 240, height: 240, data: new Uint8Array(240 * 240 * 4).fill(value) }, 85).data).toString('base64');
  const photo = encode(100);
  const scan = (part: 'underbody' | 'roof', image = photo) => analyzeVehicleImageLocally(image, 'test.jpg', { vehiclePart: part });
  configureLocalVit(m);
  m.classifier.bias[0] = -3;
  try {
    assert.ok((await scan('underbody')).damages.some(d => d.description.includes('ViT')));
    assert.ok((await scan('roof')).damages.every(d => !d.description.includes('ViT')));
    const retake = await scan('underbody', encode(0));
    assert.equal(retake.requiresRetake, true);
    assert.equal(retake.damages.length, 0);
  } finally { configureLocalVit(); }
  assert.ok((await scan('underbody')).damages.every(d => !d.description.includes('ViT')));
});
