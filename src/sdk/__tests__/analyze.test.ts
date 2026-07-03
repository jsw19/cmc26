import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseResponse } from '../analyze.ts';

const VALID_BODY = JSON.stringify({
  overallSeverity: 'moderate',
  summary: 'Scaling rust on the rear frame rail.',
  damages: [
    {
      type: 'rust',
      location: 'lower-left frame rail',
      severity: 'moderate',
      confidence: 0.85,
      description: 'flaking rust layer',
    },
  ],
  recommendations: ['Have the frame rail inspected at a repair shop.'],
});

test('parses a clean JSON response into an InspectionResult', () => {
  const result = parseResponse(VALID_BODY, 'underbody', 'file:///img.jpg');
  assert.equal(result.vehiclePart, 'underbody');
  assert.equal(result.imageUri, 'file:///img.jpg');
  assert.equal(result.overallSeverity, 'moderate');
  assert.equal(result.damages.length, 1);
  assert.equal(result.damages[0].type, 'rust');
  assert.equal(result.damages[0].confidence, 0.85);
});

test('strips markdown code fences the model may wrap around the JSON', () => {
  const fenced = '```json\n' + VALID_BODY + '\n```';
  const result = parseResponse(fenced, 'underbody', 'file:///img.jpg');
  assert.equal(result.summary, 'Scaling rust on the rear frame rail.');
});

test('coerces invalid severities to "none" and clamps confidence to [0, 1]', () => {
  const raw = JSON.stringify({
    overallSeverity: 'catastrophic',
    summary: 's',
    damages: [
      { type: 'rust', location: 'x', severity: 'bad', confidence: 7, description: 'd' },
      { type: 'dent', location: 'y', severity: 'minor', confidence: -2, description: 'd' },
    ],
    recommendations: [],
  });
  const result = parseResponse(raw, 'front', 'uri');
  assert.equal(result.overallSeverity, 'none');
  assert.equal(result.damages[0].severity, 'none');
  assert.equal(result.damages[0].confidence, 1);
  assert.equal(result.damages[1].confidence, 0);
});

test('appends the repair-shop disclaimer for moderate/severe results when missing', () => {
  const raw = JSON.stringify({
    overallSeverity: 'severe',
    summary: 's',
    damages: [],
    recommendations: ['Replace the panel.'],
  });
  const result = parseResponse(raw, 'rear', 'uri');
  assert.ok(result.recommendations.some((r) => r.toLowerCase().includes('repair shop')));
});

test('does not duplicate the repair-shop disclaimer when the model already includes it', () => {
  const result = parseResponse(VALID_BODY, 'underbody', 'uri');
  const mentions = result.recommendations.filter((r) => r.toLowerCase().includes('repair shop'));
  assert.equal(mentions.length, 1);
});

test('tolerates missing optional fields with safe defaults', () => {
  const result = parseResponse('{"overallSeverity":"none"}', 'unknown', 'uri');
  assert.equal(result.summary, '');
  assert.deepEqual(result.damages, []);
  assert.deepEqual(result.recommendations, []);
});

test('throws on a non-JSON response', () => {
  assert.throws(() => parseResponse('Sorry, I cannot analyze this image.', 'front', 'uri'));
});
