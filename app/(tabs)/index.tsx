import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InspectionCard } from '../../src/components/InspectionCard';
import { useInspection } from '../../src/context/InspectionContext';

const VEHICLE_PARTS = [
  { id: 'underbody', label: 'Underbody', icon: 'layers-outline', description: 'Chassis, floor pans, exhaust' },
  { id: 'front', label: 'Front', icon: 'arrow-forward-circle-outline', description: 'Bumper, hood, grille' },
  { id: 'rear', label: 'Rear', icon: 'arrow-back-circle-outline', description: 'Bumper, trunk, taillights' },
  { id: 'driver_side', label: 'Driver Side', icon: 'car-outline', description: 'Panels and doors' },
  { id: 'passenger_side', label: 'Passenger Side', icon: 'car-outline', description: 'Panels and doors' },
  { id: 'engine_bay', label: 'Engine Bay', icon: 'settings-outline', description: 'Engine, fluid lines' },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const { history } = useInspection();
  const recentInspections = history.slice(0, 3);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>CheckMyCar</Text>
            <Text style={styles.subtitle}>AI-powered vehicle inspection</Text>
          </View>
          <View style={styles.carIcon}>
            <Ionicons name="car" size={28} color="#3b82f6" />
          </View>
        </View>

        {/* Quick start */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>New Inspection</Text>
          <Text style={styles.sectionSubtitle}>Select the area you want to inspect</Text>
          <View style={styles.partsGrid}>
            {VEHICLE_PARTS.map((part) => (
              <TouchableOpacity
                key={part.id}
                style={styles.partCard}
                activeOpacity={0.7}
                onPress={() =>
                  router.push({ pathname: '/camera', params: { vehiclePart: part.id } })
                }
              >
                <Ionicons name={part.icon as any} size={24} color="#3b82f6" />
                <Text style={styles.partLabel}>{part.label}</Text>
                <Text style={styles.partDesc}>{part.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tips banner */}
        <View style={styles.tipBanner}>
          <Ionicons name="information-circle-outline" size={18} color="#3b82f6" />
          <Text style={styles.tipText}>
            For best results, photograph in good lighting and keep the camera steady.
          </Text>
        </View>

        {/* Recent inspections */}
        {recentInspections.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Recent</Text>
              <TouchableOpacity onPress={() => router.push('/history')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            {recentInspections.map((inspection) => (
              <InspectionCard key={inspection.id} inspection={inspection} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  carIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#1a2a3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: 28,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 14,
  },
  seeAll: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '600',
  },
  partsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  partCard: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 6,
  },
  partLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  partDesc: {
    fontSize: 11,
    color: '#666',
  },
  tipBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#0d1f33',
    borderRadius: 10,
    padding: 14,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#1a3a5a',
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#7ab3e0',
    lineHeight: 18,
  },
});
