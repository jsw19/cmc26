import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View, FlatList, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InspectionCard } from '../../src/components/InspectionCard';
import { useInspection } from '../../src/context/InspectionContext';

export default function HistoryScreen() {
  const { history, removeResult, loading } = useInspection();

  const handleClearAll = () => {
    Alert.alert('Clear History', 'Delete all inspections? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete All',
        style: 'destructive',
        onPress: () => history.forEach((r) => removeResult(r.id)),
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Inspection History</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={styles.clearText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {history.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="time-outline" size={48} color="#444" />
          <Text style={styles.emptyTitle}>No inspections yet</Text>
          <Text style={styles.emptyText}>
            Start a new inspection from the Home tab to see results here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <InspectionCard inspection={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  clearText: {
    fontSize: 13,
    color: '#f44336',
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#555',
  },
  emptyText: {
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
    lineHeight: 20,
  },
});
