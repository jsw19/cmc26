import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSessionReportHtml, sessionProgress } from '../sessionReport.ts';
import type { InspectionResult, InspectionSession } from '../types.ts';

const session: InspectionSession = { id: 'session-a', createdAt: 1, status: 'draft', vehicle: { id: 'car-a', name: '<My Car>', make: 'A&B', model: 'Model', year: 2020 } };
function scan(id: string, part: InspectionResult['vehiclePart'], retake = false): InspectionResult {
  return { id, sessionId: session.id, timestamp: 1, vehiclePart: part, imageUri: 'file:///photo.jpg', analysisMode: 'local', requiresRetake: retake, imageQuality: { level: retake ? 'retake_required' : 'good', caveats: [] }, damages: [], overallSeverity: 'none', summary: `Scan ${id}`, recommendations: [] };
}
test('coverage counts unique assessable areas and preserves retake count', () => {
  const progress = sessionProgress([scan('1', 'front'), scan('2', 'front'), scan('3', 'brakes', true)]);
  assert.deepEqual(progress.assessed, ['front']);
  assert.ok(progress.missing.includes('brakes'));
  assert.equal(progress.retakes, 1);
});
test('combined report isolates sessions, escapes profile fields and discloses missing photos', () => {
  const html = buildSessionReportHtml(session, [scan('one', 'front'), scan('two', 'rear'), { ...scan('foreign', 'brakes'), sessionId: 'different' }], { one: 'data:image/jpeg;base64,AAAA' });
  assert.match(html, /&lt;My Car&gt;/);
  assert.match(html, /A&amp;B/);
  assert.match(html, /2 photos \/ 2 of 7 areas assessed/);
  assert.match(html, /Scan one/);
  assert.match(html, /Scan two/);
  assert.doesNotMatch(html, /Scan foreign/);
  assert.match(html, /Saved photo unavailable/);
  assert.equal((html.match(/<!DOCTYPE html>/g) ?? []).length, 1);
  assert.equal((html.match(/<body>/g) ?? []).length, 1);
});
