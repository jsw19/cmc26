import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { InspectionResult } from '../sdk/types';

/** Uses the decoded photo aspect ratio so overlays never drift due to cropping. */
export function InspectionPhoto({ inspection }: { inspection: InspectionResult }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [visible, setVisible] = useState(true);
  const [failed, setFailed] = useState(false);
  const size = inspection.imageSize;
  const canLocate = size && size.width > 0 && size.height > 0 && !inspection.requiresRetake;
  const located = canLocate ? inspection.damages.flatMap((damage, index) => {
    const r = damage.region;
    return r && [r.x, r.y, r.width, r.height].every(Number.isFinite) &&
      r.x >= 0 && r.y >= 0 && r.width > 0 && r.height > 0 &&
      r.x + r.width <= 1.000001 && r.y + r.height <= 1.000001
      ? [{ damage, index, r }] : [];
  }) : [];
  const active = selected === null ? undefined : inspection.damages[selected];
  return (
    <View>
      <View style={{ width: '100%', aspectRatio: canLocate ? size.width / size.height : 4 / 3, backgroundColor: '#181818' }}>
        <Image source={{ uri: inspection.imageUri }} style={StyleSheet.absoluteFill} resizeMode="contain" onError={() => setFailed(true)} accessibilityLabel="Inspection photo" />
        {!failed && visible && located.map(({ damage, index, r }) => (
          <Pressable key={index} accessibilityRole="button" accessibilityLabel={`Finding ${index + 1}: possible ${damage.type}, ${damage.location}`} accessibilityState={{ selected: selected === index }}
            onPress={() => setSelected(index)}
            style={[styles.region, { left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.width * 100}%`, height: `${r.height * 100}%`, borderColor: selected === index ? '#fff' : '#fbbf24' }]}>
            <Text style={styles.number}>{index + 1}</Text>
          </Pressable>
        ))}
      </View>
      {failed ? <Text style={styles.note}>Photo unavailable.</Text> : located.length > 0 ? (
        <View style={styles.controls}>
          <Pressable accessibilityRole="button" onPress={() => setVisible(!visible)}><Text style={styles.link}>{visible ? 'Hide' : 'Show'} highlights</Text></Pressable>
          <Text style={styles.note}>Boxes mark the strongest supporting scan zones, not exact damage boundaries. Tap a box or finding below.</Text>
          <View style={styles.row}>{located.map(({ damage, index }) => (
            <Pressable key={index} accessibilityRole="button" accessibilityState={{ selected: selected === index }} onPress={() => { setSelected(index); setVisible(true); }} style={[styles.chip, selected === index && styles.active]}>
              <Text style={styles.text}>{index + 1}. Possible {damage.type.replace(/_/g, ' ')}</Text>
            </Pressable>
          ))}</View>
          {active && <Text accessibilityLiveRegion="polite" style={styles.text}>{active.description}</Text>}
        </View>
      ) : inspection.damages.length > 0 && !inspection.requiresRetake ? <Text style={styles.note}>This scan has no saved photo coordinates. Take a new photo to see highlights.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  region: { position: 'absolute', borderWidth: 2, backgroundColor: '#fbbf2426' },
  number: { backgroundColor: '#fbbf24', color: '#111', fontWeight: '800', alignSelf: 'flex-start', paddingHorizontal: 5 },
  controls: { padding: 16, gap: 10 },
  note: { color: '#aaa', fontSize: 12, lineHeight: 18, padding: 4 },
  link: { color: '#5eead4', paddingVertical: 8, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { padding: 12, borderRadius: 8, backgroundColor: '#252525', borderWidth: 1, borderColor: '#555' },
  active: { borderColor: '#fbbf24' },
  text: { color: '#eee', fontSize: 13, lineHeight: 20 },
});
