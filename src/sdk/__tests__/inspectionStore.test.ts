import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createInspectionStore, type InspectionStoragePort } from '../inspectionStore.ts';
import type { InspectionResult, InspectionSession } from '../types.ts';

function memory() {
  const data = new Map<string, string>();
  const deleted: string[] = [];
  let fail = false;
  const port: InspectionStoragePort = {
    async getItem(key) { await Promise.resolve(); return data.get(key) ?? null; },
    async setItem(key, value) { if (fail) { fail = false; throw new Error('Disk full'); } data.set(key, value); },
    async removeItem(key) { data.delete(key); },
    async multiSet(pairs) { for (const [key, value] of pairs) data.set(key, value); },
  };
  const store = createInspectionStore(port, async uri => { deleted.push(uri); });
  return { store, port, deleted, failNext: () => { fail = true; } };
}
const session: InspectionSession = { id: 'session', createdAt: 1, status: 'draft', vehicle: { id: 'car', name: 'My car', make: '', model: '' } };
function photo(id: string, sessionId?: string): InspectionResult {
  return { id, sessionId, timestamp: 1, vehiclePart: 'front', imageUri: `file:///${id}.jpg`, imageSize: { width: 360, height: 240 }, analysisMode: 'local', requiresRetake: false, imageQuality: { level: 'good', caveats: [] }, damages: [{ type: 'rust', location: 'center', severity: 'minor', confidence: 0.5, description: 'Possible rust', region: { x: 0.5, y: 0.5, width: 1 / 6, height: 1 / 6 } }], overallSeverity: 'minor', summary: '', recommendations: [] };
}
test('concurrent photo saves survive restart with session and highlight metadata', async () => {
  const { store, port } = memory();
  await store.saveSession(session);
  await Promise.all([store.saveInspection(photo('a', 'session')), store.saveInspection(photo('b', 'session'))]);
  const reopened = createInspectionStore(port, async () => {});
  assert.deepEqual(await reopened.loadSessions(), [session]);
  const history = await reopened.loadHistory();
  assert.equal(history.length, 2);
  assert.deepEqual(history.find(r => r.id === 'a'), photo('a', 'session'));
});
test('a failed write rejects and does not poison later saves', async () => {
  const { store, failNext } = memory();
  failNext();
  await assert.rejects(store.saveInspection(photo('failed')), /Disk full/);
  await store.saveInspection(photo('saved'));
  assert.deepEqual((await store.loadHistory()).map(r => r.id), ['saved']);
});
test('deleting a session keeps unrelated scans and removes only its photos', async () => {
  const { store, deleted } = memory();
  await store.saveSession(session);
  await store.saveInspection(photo('member', 'session'));
  await store.saveInspection(photo('standalone'));
  await store.deleteSession('session');
  assert.deepEqual(await store.loadSessions(), []);
  assert.deepEqual((await store.loadHistory()).map(r => r.id), ['standalone']);
  assert.deepEqual(deleted, ['file:///member.jpg']);
});

test('photos cannot be added to missing or completed sessions', async () => {
  const { store } = memory();
  await assert.rejects(store.saveInspection(photo('orphan', 'session')), /Reopen/);
  await store.saveSession({ ...session, status: 'complete' });
  await assert.rejects(store.saveInspection(photo('late', 'session')), /Reopen/);
  assert.equal((await store.loadHistory()).length, 0);
});
