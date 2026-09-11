import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useInspection } from '../src/context/InspectionContext';
import { InspectionCard } from '../src/components/InspectionCard';
import { buildSessionReportHtml, SESSION_PARTS, sessionProgress } from '../src/sdk/sessionReport';
import type { VehicleProfile } from '../src/sdk/types';

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const label = (value: string) => value.replace(/_/g, ' ');

export default function VehicleInspectionsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { sessions, history, loading, loadError, upsertSession, removeSession } = useInspection();
  const [name, setName] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const session = sessions.find(s => s.id === id);
  const results = history.filter(r => r.sessionId === id);
  const progress = sessionProgress(results);
  const profiles = [...new Map(sessions.map(s => [s.vehicle.id, s.vehicle])).values()];

  async function start(vehicle?: VehicleProfile) {
    if (busy) return;
    if (!vehicle && !name.trim()) { setError('Enter a vehicle name, such as My Civic.'); return; }
    if (!vehicle && year && (!/^\d{4}$/.test(year) || +year < 1886 || +year > new Date().getFullYear() + 1)) { setError('Enter a valid four-digit model year.'); return; }
    setBusy(true); setError(null);
    try {
      const next = { id: newId(), vehicle: vehicle ?? { id: newId(), name: name.trim(), make: make.trim(), model: model.trim(), year: year ? +year : undefined }, createdAt: Date.now(), status: 'draft' as const };
      await upsertSession(next);
      router.push({ pathname: '/vehicle-inspections', params: { id: next.id } });
    } catch { setError('Could not save this inspection. Please try again.'); }
    finally { setBusy(false); }
  }

  async function toggleStatus() {
    if (!session || busy) return;
    if (session.status === 'draft' && (!results.length || progress.retakes)) { setError('Add at least one photo and retake or remove unreadable photos before completing.'); return; }
    setBusy(true); setError(null);
    try { await upsertSession({ ...session, status: session.status === 'draft' ? 'complete' : 'draft' }); }
    catch { setError('Could not save the session status.'); }
    finally { setBusy(false); }
  }

  async function exportReport() {
    if (!session || busy) return;
    setBusy(true); setError(null);
    try {
      if (!await Sharing.isAvailableAsync()) throw new Error('Sharing is not available on this device.');
      const images: Record<string, string> = {};
      for (const result of results) {
        try { images[result.id] = `data:image/jpeg;base64,${await FileSystem.readAsStringAsync(result.imageUri, { encoding: FileSystem.EncodingType.Base64 })}`; }
        catch { /* The report explicitly marks missing photos. */ }
      }
      const file = await Print.printToFileAsync({ html: buildSessionReportHtml(session, history, images) });
      await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: '.pdf', dialogTitle: 'Vehicle inspection report' });
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not export the report.'); }
    finally { setBusy(false); }
  }

  if (loading) return <ActivityIndicator style={{ margin: 40 }} />;
  if (loadError) return <Text style={styles.error}>{loadError}</Text>;
  if (id && !session) return <Text style={styles.error}>Inspection not found.</Text>;
  return <ScrollView contentContainerStyle={styles.page}>
    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {busy && <ActivityIndicator />}
    {session ? <>
      <Text style={styles.title}>{session.vehicle.name}</Text>
      <Text style={styles.muted}>{[session.vehicle.year, session.vehicle.make, session.vehicle.model].filter(Boolean).join(' ')}</Text>
      <Text style={styles.text}>{session.status === 'draft' ? 'In progress · saved automatically' : 'Completed session'} · {results.length} photos</Text>
      <Text style={styles.text}>{progress.assessed.length}/{SESSION_PARTS.length} areas assessed · {progress.retakes} retakes needed</Text>
      {progress.missing.length > 0 && <Text style={styles.muted}>Not assessed: {progress.missing.map(label).join(', ')}</Text>}
      {session.status === 'draft' && <>
        <Text style={styles.heading}>Add a photo</Text>
        <Text style={styles.muted}>Take several views of an area when needed. Each view stays in this inspection.</Text>
        <View style={styles.wrap}>{SESSION_PARTS.map(part => <Pressable accessibilityRole="button" key={part} disabled={busy} style={styles.button} onPress={() => router.push({ pathname: '/camera', params: { vehiclePart: part, sessionId: session.id } })}><Text style={styles.text}>{label(part)}</Text></Pressable>)}</View>
      </>}
      <Pressable accessibilityRole="button" disabled={busy} style={styles.button} onPress={() => {
        if (session.status === 'draft' && progress.missing.length && results.length && !progress.retakes) {
          Alert.alert('Complete a partial inspection?', `${progress.missing.length} areas remain unassessed and will be listed in your report.`, [{ text: 'Keep inspecting', style: 'cancel' }, { text: 'Complete', onPress: () => void toggleStatus() }]);
        } else void toggleStatus();
      }}><Text style={styles.text}>{session.status === 'draft' ? 'Complete inspection' : 'Reopen inspection'}</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={busy || !results.length} style={[styles.button, !results.length && { opacity: 0.4 }]} onPress={exportReport}><Text style={styles.text}>Share combined PDF report</Text></Pressable>
      <Text style={styles.heading}>Saved views</Text>
      {results.map(result => <InspectionCard key={result.id} inspection={result} />)}
      <Pressable accessibilityRole="button" disabled={busy} style={styles.button} onPress={() => Alert.alert('Delete vehicle inspection?', 'This removes this session and all of its saved photos. Other inspections are kept.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => {
        setBusy(true);
        try { await removeSession(session.id); router.replace('/vehicle-inspections'); }
        catch { setError('Could not delete this inspection. Please try again.'); }
        finally { setBusy(false); }
      } }])}><Text style={{ color: '#fca5a5' }}>Delete this vehicle inspection</Text></Pressable>
    </> : <>
      <Text style={styles.title}>Vehicle inspections</Text>
      <Text style={styles.muted}>Keep multiple photos together and return anytime to finish.</Text>
      <Text style={styles.heading}>New vehicle</Text>
      {([{ title: 'Vehicle name', value: name, change: setName }, { title: 'Make (optional)', value: make, change: setMake }, { title: 'Model (optional)', value: model, change: setModel }, { title: 'Year (optional)', value: year, change: setYear }] as const).map(field => <View key={field.title}><Text style={styles.muted}>{field.title}</Text><TextInput accessibilityLabel={field.title} style={styles.input} value={field.value} onChangeText={field.change} maxLength={field.title.startsWith('Year') ? 4 : 80} keyboardType={field.title.startsWith('Year') ? 'number-pad' : 'default'} /></View>)}
      <Pressable accessibilityRole="button" disabled={busy} style={styles.button} onPress={() => void start()}><Text style={styles.text}>Start inspection</Text></Pressable>
      {!!profiles.length && <Text style={styles.heading}>Inspect an existing vehicle</Text>}
      {profiles.map(vehicle => <Pressable accessibilityRole="button" key={vehicle.id} disabled={busy} style={styles.button} onPress={() => void start(vehicle)}><Text style={styles.text}>{vehicle.name} · New inspection</Text></Pressable>)}
      <Text style={styles.heading}>Saved inspections</Text>
      {!sessions.length && <Text style={styles.muted}>No vehicle inspections yet.</Text>}
      {sessions.map(saved => <Pressable accessibilityRole="button" key={saved.id} style={styles.button} onPress={() => router.push({ pathname: '/vehicle-inspections', params: { id: saved.id } })}><Text style={styles.text}>{saved.vehicle.name}</Text><Text style={styles.muted}>{new Date(saved.createdAt).toLocaleDateString()} · {saved.status === 'draft' ? 'Resume inspection' : 'View report'}</Text></Pressable>)}
    </>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 48, gap: 12 },
  title: { color: '#fff', fontSize: 26, fontWeight: '800' },
  heading: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 12 },
  text: { color: '#eee', fontSize: 15, lineHeight: 22, textTransform: 'none' },
  muted: { color: '#aaa', fontSize: 13, lineHeight: 20 },
  error: { color: '#fca5a5', padding: 16 },
  input: { color: '#fff', borderWidth: 1, borderColor: '#555', borderRadius: 8, padding: 12, marginTop: 4 },
  button: { padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#23554e', backgroundColor: '#102b27', gap: 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
