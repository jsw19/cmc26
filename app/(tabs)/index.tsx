import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
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
  { id: 'brakes', label: 'Brake System', icon: 'disc-outline', description: 'Pads, rotors, calipers' },
] as const;

const FIX_MY_CAR_ROUTE = '/fixmycar' as Href;

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

        {/* Buyer Check entry */}
        <TouchableOpacity
          style={styles.buyerCard}
          activeOpacity={0.8}
          onPress={() => router.push('/buyercheck')}
        >
          <View style={styles.buyerCardIcon}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#22c55e" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.buyerCardTitle}>Buying a Used Car?</Text>
            <Text style={styles.buyerCardDesc}>
              Pre-purchase checklist · Known issues by model · Buyer protection tips
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#444" />
        </TouchableOpacity>

        {/* Sell entry */}
        <TouchableOpacity
          style={styles.sellCard}
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/sell')}
        >
          <View style={styles.sellCardIcon}>
            <Ionicons name="pricetag-outline" size={22} color="#f59e0b" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sellCardTitle}>Selling Your Car?</Text>
            <Text style={styles.sellCardDesc}>
              FB Marketplace & Craigslist pricing · Negotiation tips · Region-adjusted value
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#444" />
        </TouchableOpacity>

        {/* Fix My Car entry */}
        <TouchableOpacity
          style={styles.fixCard}
          activeOpacity={0.8}
          onPress={() => router.push(FIX_MY_CAR_ROUTE)}
        >
          <View style={styles.fixCardIcon}>
            <Ionicons name="construct-outline" size={22} color="#60a5fa" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fixCardTitle}>Fix My Car</Text>
            <Text style={styles.fixCardDesc}>
              Diagnosis suggestions for clicks, stiff steering, spongy brakes, and DIY fixes
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#444" />
        </TouchableOpacity>

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
  buyerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0d1f0d',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1a3a1a',
  },
  buyerCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#14532d33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyerCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  buyerCardDesc: {
    fontSize: 11,
    color: '#4ade80',
    marginTop: 2,
    lineHeight: 15,
  },
  sellCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1f1200',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#3a2200',
  },
  sellCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#78350f33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  sellCardDesc: {
    fontSize: 11,
    color: '#f59e0b',
    marginTop: 2,
    lineHeight: 15,
  },
  fixCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0d1f33',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1a3a5a',
  },
  fixCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fixCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  fixCardDesc: {
    fontSize: 11,
    color: '#93c5fd',
    marginTop: 2,
    lineHeight: 15,
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
