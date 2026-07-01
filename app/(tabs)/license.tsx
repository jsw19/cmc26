import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SegmentedControl } from '../../src/components/SegmentedControl';
import LicenseScreen from '../../src/screens/LicenseScreen';
import MagazineScreen from '../../src/screens/MagazineScreen';

type LearnSegment = 'test' | 'magazine';

/**
 * Learn tab — groups the license-test review and the car magazine under one
 * tab with a segmented toggle. Header is hidden in the tab layout; this
 * container owns the top safe-area inset.
 */
export default function LearnTab() {
  const [segment, setSegment] = useState<LearnSegment>('test');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SegmentedControl
        options={[
          { key: 'test', label: 'License Test' },
          { key: 'magazine', label: 'Magazine' },
        ]}
        value={segment}
        onChange={setSegment}
        accent="#38bdf8"
      />
      {segment === 'test' ? <LicenseScreen /> : <MagazineScreen />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
});
