import type { InspectionResult, InspectionSession } from './types';

export interface InspectionStoragePort {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  multiSet(pairs: [string, string][]): Promise<void>;
}

/** Storage logic is independent of React Native so persistence can be regression-tested. */
export function createInspectionStore(storage: InspectionStoragePort, removeImage: (uri: string) => Promise<void>) {
  const HISTORY_KEY = 'checkmycar_history';
  const SESSIONS_KEY = 'checkmycar_sessions';

  // Serialize read-modify-write operations so rapid captures/deletes cannot lose data.
  let writes: Promise<unknown> = Promise.resolve();
  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = writes.then(operation, operation);
    writes = next.catch(() => undefined);
    return next;
  }

  async function loadSessions(): Promise<InspectionSession[]> {
    const raw = await storage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Saved vehicle inspections could not be read.');
    const sessions: InspectionSession[] = [];
    for (const value of parsed as unknown[]) {
      if (!value || typeof value !== 'object') throw new Error('Invalid saved inspection.');
      const s = value as Record<string, unknown>;
      const v = s.vehicle as Record<string, unknown> | undefined;
      if (typeof s.id !== 'string' || typeof s.createdAt !== 'number' || !Number.isFinite(s.createdAt) ||
        (s.status !== 'draft' && s.status !== 'complete') || !v || typeof v.id !== 'string' ||
        typeof v.name !== 'string' || typeof v.make !== 'string' || typeof v.model !== 'string' ||
        (v.year !== undefined && (typeof v.year !== 'number' || !Number.isFinite(v.year)))) throw new Error('Invalid saved inspection.');
      sessions.push(value as InspectionSession);
    }
    return sessions;
  }

  function saveSession(session: InspectionSession): Promise<void> {
    return enqueue(async () => {
      const sessions = await loadSessions();
      await storage.setItem(SESSIONS_KEY, JSON.stringify([session, ...sessions.filter(s => s.id !== session.id)]));
    });
  }

  function deleteSession(id: string): Promise<void> {
    return enqueue(async () => {
      const sessions = await loadSessions();
      const history = await loadHistory();
      const removed = history.filter(r => r.sessionId === id);
      // Commit metadata together before best-effort image cleanup.
      await storage.multiSet([
        [SESSIONS_KEY, JSON.stringify(sessions.filter(s => s.id !== id))],
        [HISTORY_KEY, JSON.stringify(history.filter(r => r.sessionId !== id))],
      ]);
      await Promise.all(removed.map(r => deleteImageFile(r.imageUri)));
    });
  }

  function normalizeInspectionResult(result: InspectionResult): InspectionResult {
    return {
      ...result,
      analysisMode: result.analysisMode ?? 'local',
      requiresRetake: result.requiresRetake ?? false,
      imageQuality: result.imageQuality ?? { level: 'good', caveats: [] },
    };
  }

  async function deleteImageFile(uri: string | undefined): Promise<void> {
    if (!uri) return;
    try {
      await removeImage(uri);
    } catch {
      // Best-effort: a missing or locked image file must not block history updates.
    }
  }

  async function loadHistory(): Promise<InspectionResult[]> {
    const raw = await storage.getItem(HISTORY_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed)
        ? (parsed as InspectionResult[]).map(normalizeInspectionResult)
        : [];
    } catch {
      // Corrupted history would otherwise make every subsequent save fail too.
      return [];
    }
  }

  async function saveInspection(result: InspectionResult): Promise<void> {
    return enqueue(async () => {
      if (result.sessionId && !(await loadSessions()).some(s => s.id === result.sessionId && s.status === 'draft')) {
        throw new Error('Reopen the vehicle inspection before adding a photo.');
      }
      const history = await loadHistory();
      const updated = [result, ...history.filter(r => r.id !== result.id)];
      await storage.setItem(HISTORY_KEY, JSON.stringify(updated));
    });
  }

  async function deleteInspection(id: string): Promise<void> {
    return enqueue(async () => {
      const history = await loadHistory();
      const removed = history.find((r) => r.id === id);
      const updated = history.filter((r) => r.id !== id);
      await storage.setItem(HISTORY_KEY, JSON.stringify(updated));
      await deleteImageFile(removed?.imageUri);
    });
  }

  async function updateInspection(result: InspectionResult): Promise<void> {
    return enqueue(async () => {
      const history = await loadHistory();
      const updated = history.map((r) => (r.id === result.id ? result : r));
      await storage.setItem(HISTORY_KEY, JSON.stringify(updated));
    });
  }

  async function clearHistory(): Promise<void> {
    return enqueue(async () => {
      const history = await loadHistory();
      await storage.removeItem(HISTORY_KEY);
      await Promise.all(history.map((r) => deleteImageFile(r.imageUri)));
    });
  }

  return { loadSessions, saveSession, deleteSession, loadHistory, saveInspection, deleteInspection, updateInspection, clearHistory };
}
