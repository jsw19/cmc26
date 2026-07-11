import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import type { InspectionResult } from '../sdk/types';

const HISTORY_KEY = 'checkmycar_history';

function normalizeInspectionResult(result: InspectionResult): InspectionResult {
  return {
    ...result,
    analysisMode: result.analysisMode ?? 'ai',
    requiresRetake: result.requiresRetake ?? false,
    imageQuality: result.imageQuality ?? { level: 'good', caveats: [] },
  };
}

async function deleteImageFile(uri: string | undefined): Promise<void> {
  if (!uri) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Best-effort: a missing or locked image file must not block history updates.
  }
}

export async function loadHistory(): Promise<InspectionResult[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
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

export async function saveInspection(result: InspectionResult): Promise<void> {
  const history = await loadHistory();
  const updated = [result, ...history];
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export async function deleteInspection(id: string): Promise<void> {
  const history = await loadHistory();
  const removed = history.find((r) => r.id === id);
  const updated = history.filter((r) => r.id !== id);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  await deleteImageFile(removed?.imageUri);
}

export async function updateInspection(result: InspectionResult): Promise<void> {
  const history = await loadHistory();
  const updated = history.map((r) => (r.id === result.id ? result : r));
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export async function clearHistory(): Promise<void> {
  const history = await loadHistory();
  await AsyncStorage.removeItem(HISTORY_KEY);
  await Promise.all(history.map((r) => deleteImageFile(r.imageUri)));
}
