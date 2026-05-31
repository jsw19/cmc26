import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Severity } from '../sdk/types';

const COLORS: Record<Severity, { bg: string; text: string; label: string }> = {
  none: { bg: '#1a3a1a', text: '#4caf50', label: 'No Damage' },
  minor: { bg: '#3a3a00', text: '#ffeb3b', label: 'Minor' },
  moderate: { bg: '#3a1a00', text: '#ff9800', label: 'Moderate' },
  severe: { bg: '#3a0000', text: '#f44336', label: 'Severe' },
};

/**
 * Subtle background + border tints for cards keyed by severity. The accent
 * field is the brighter foreground colour (icons, ratings, highlights).
 * Designed to read at a glance against the app's #0f0f0f canvas.
 */
export const SEVERITY_TINTS: Record<Severity, { bg: string; border: string; accent: string }> = {
  none:     { bg: '#11221a', border: '#1f3a2c', accent: '#4ade80' },
  minor:    { bg: '#221d0a', border: '#3a3318', accent: '#facc15' },
  moderate: { bg: '#221608', border: '#3a2614', accent: '#fb923c' },
  severe:   { bg: '#220e0e', border: '#3a1818', accent: '#f87171' },
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
