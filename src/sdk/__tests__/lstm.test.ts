import assert from 'node:assert/strict';
import { test } from 'node:test';
import { configureLocalLstm, predictLocalLstm, validateLocalLstmModel } from '../lstm.ts';
import type { LocalLstmModel } from '../lstm.ts';
import { analyzeVehicleImageLocally } from '../analyzeLocal.ts';
import jpeg from 'jpeg-js';

function fixture(): LocalLstmModel {
  return {
    version: 1, id: 'test-only', featureSchema: 'grid6x6-v1', vehicleParts: ['underbody'], hiddenSize: 1,
    inputWeights: Array(28).fill(0), recurrentWeights: [0, 0, 0, 0], bias: [0, 0, 0, 0],
    outputWeights: [1], outputBias: [0], labels: [{ type: 'rust', severity: 'minor', threshold: 0.8 }],
  };
}

test('LSTM gate computation and per-call state reset match analytical recurrence', () => {
  const model = fixture();
  model.inputWeights[14] = 1; // candidate gate reads feature zero
  const rows = Array.from({ length: 36 }, () => [1, 0, 0, 0, 0, 0, 0]);
  const expectedCell = Math.tanh(1) * (1 - 0.5 ** 36);
  const expectedScore = 1 / (1 + Math.exp(-0.5 * Math.tanh(expectedCell)));
  assert.ok(Math.abs(predictLocalLstm(model, rows)[0] - expectedScore) < 1e-12);
  assert.deepEqual(predictLocalLstm(model, rows), predictLocalLstm(model, rows));
});

test('rejects malformed weights and feature sequences', () => {
  const model = fixture();
  model.recurrentWeights[0] = NaN;
  assert.throws(() => validateLocalLstmModel(model), /tensor/);
  assert.throws(() => predictLocalLstm(fixture(), []), /36/);
});

test('configured LSTM integrates only for supported parts and readable images', async () => {
  const model = fixture();
  model.outputBias[0] = 3; // Synthetic fixture, never a production model.
  const data = new Uint8Array(240 * 240 * 4).fill(100);
  const base64 = Buffer.from(jpeg.encode({ data, width: 240, height: 240 }, 85).data).toString('base64');
  configureLocalLstm(model);
  try {
    const result = await analyzeVehicleImageLocally(base64, 'test.jpg', { vehiclePart: 'underbody' });
    assert.ok(result.damages.some(d => d.description.includes('LSTM')));
    const other = await analyzeVehicleImageLocally(base64, 'test.jpg', { vehiclePart: 'roof' });
    assert.ok(other.damages.every(d => !d.description.includes('LSTM')));
    const black = Buffer.from(jpeg.encode({ data: new Uint8Array(240 * 240 * 4), width: 240, height: 240 }, 85).data).toString('base64');
    const retake = await analyzeVehicleImageLocally(black, 'black.jpg', { vehiclePart: 'underbody' });
    assert.equal(retake.requiresRetake, true);
    assert.equal(retake.damages.length, 0);
  } finally {
    configureLocalLstm();
  }
  const disabled = await analyzeVehicleImageLocally(base64, 'test.jpg', { vehiclePart: 'underbody' });
  assert.ok(disabled.damages.every(d => !d.description.includes('LSTM')));
});
