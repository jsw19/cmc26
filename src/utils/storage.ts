import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { createInspectionStore } from '../sdk/inspectionStore';

const store = createInspectionStore(AsyncStorage, uri => FileSystem.deleteAsync(uri, { idempotent: true }));
export const { loadSessions, saveSession, deleteSession, loadHistory, saveInspection, deleteInspection, updateInspection, clearHistory } = store;
