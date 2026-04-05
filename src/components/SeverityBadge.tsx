import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Severity } from '../sdk/types';

const COLORS: Record<Severity, { bg: string; text: string; label: string }> = {
  none: { bg: '#1a3a1a', text: '#4caf50', label: 'No Damage' },
  minor: { bg: '#3a3a00', text: '#ffeb3b', label: 'Minor' },
  moderate: { bg: '#3a1a00', text: '#ff9800', label: 'Moderate' },
  severe: { bg: '#3a0000', text: '#f44336', label: 'Severe' },
};

interface Props {
  severity: Severity;
  size?: 'sm' | 'md' | 'lg';
}

export function SeverityBadge({ severity, size = 'md' }: Props) {
  const { bg, text, label } = COLORS[severity];
  return (
    <View style={[styles.badge, { backgroundColor: bg }, size === 'lg' && styles.badgeLg]}>
      <Text style={[styles.text, { color: text }, size === 'lg' && styles.textLg]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeLg: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textLg: {
    fontSize: 16,
  },
});
