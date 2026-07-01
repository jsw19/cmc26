import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SegmentedControl } from '../../src/components/SegmentedControl';
import HistoryScreen from '../../src/screens/HistoryScreen';
import HomeScreen from '../../src/screens/HomeScreen';

type InspectSegment = 'inspect' | 'history';

/**
 * Inspect tab — groups the inspection launcher (Home) and past results
 * (History) under one tab with a segmented toggle. Header is hidden in the tab
 * layout; this container owns the top safe-area inset.
 */
export default function InspectTab() {
  const [segment, setSegment] = useState<InspectSegment>('inspect');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SegmentedControl
        options={[
          { key: 'inspect', label: 'Inspect' },
          { key: 'history', label: 'History' },
        ]}
        value={segment}
        onChange={setSegment}
        accent="#3b82f6"
      />
      {segment === 'inspect' ? (
        <HomeScreen onSeeAllHistory={() => setSegment('history')} />
      ) : (
        <HistoryScreen />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
});
