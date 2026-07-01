import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface SegmentOption<T extends string> {
  key: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (key: T) => void;
  /** Active-segment accent colour. Defaults to the app blue. */
  accent?: string;
}

/**
 * A pill-style segmented control for switching between sibling views inside a
 * single tab (e.g. Inspect ↔ History, Test ↔ Magazine). Pure presentational —
 * no navigation, no side effects.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accent = '#3b82f6',
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.track}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.segment, active && { backgroundColor: accent }]}
            activeOpacity={0.8}
            onPress={() => onChange(opt.key)}
          >
            <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 4,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  labelActive: {
    color: '#ffffff',
  },
  labelInactive: {
    color: '#888',
  },
});
