import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { InspectionResult } from '../sdk/types';
import { SeverityBadge } from './SeverityBadge';

const PART_LABELS: Record<string, string> = {
  underbody: 'Underbody',
  front: 'Front',
  rear: 'Rear',
  driver_side: 'Driver Side',
  passenger_side: 'Passenger Side',
  roof: 'Roof',
  engine_bay: 'Engine Bay',
  unknown: 'Vehicle',
};

interface Props {
  inspection: InspectionResult;
}

export function InspectionCard({ inspection }: Props) {
  const router = useRouter();
  const date = new Date(inspection.timestamp);
  const formatted = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() =>
        router.push({ pathname: '/analysis', params: { id: inspection.id } })
      }
    >
      <Image source={{ uri: inspection.imageUri }} style={styles.thumbnail} resizeMode="cover" />
      <View style={styles.info}>
        <Text style={styles.part}>{PART_LABELS[inspection.vehiclePart] ?? 'Vehicle'}</Text>
        <Text style={styles.date}>{formatted}</Text>
        <Text style={styles.summary} numberOfLines={2}>
          {inspection.summary}
        </Text>
        <View style={styles.footer}>
          <SeverityBadge severity={inspection.overallSeverity} size="sm" />
          <Text style={styles.damageCount}>
            {inspection.damages.length === 0
              ? 'No issues'
              : `${inspection.damages.length} issue${inspection.damages.length > 1 ? 's' : ''}`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  thumbnail: {
    width: 90,
    height: 90,
  },
  info: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  part: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  date: {
    color: '#888',
    fontSize: 12,
  },
  summary: {
    color: '#ccc',
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  damageCount: {
    color: '#888',
    fontSize: 12,
  },
});
