import AsyncStorage from '@react-native-async-storage/async-storage';
import type { InspectionResult } from '../sdk/types';

const HISTORY_KEY = 'checkmycar_history';

export async function loadHistory(): Promise<InspectionResult[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as InspectionResult[];
}

export async function saveInspection(result: InspectionResult): Promise<void> {
  const history = await loadHistory();
  const updated = [result, ...history];
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export async function deleteInspection(id: string): Promise<void> {
  const history = await loadHistory();
  const updated = history.filter((r) => r.id !== id);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}
