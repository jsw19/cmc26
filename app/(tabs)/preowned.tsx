import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePreownedGuide } from '../../src/hooks/usePreownedGuide';
import type { MarketTier, VehicleCategory } from '../../src/sdk/types';

const CATEGORY_FILTERS: { value: VehicleCategory | 'all'; label: string; icon: string }[] = [
  { value: 'all',      label: 'All',      icon: 'apps-outline'            },
  { value: 'economy',  label: 'Economy',  icon: 'flash-outline'           },
  { value: 'midsize',  label: 'Midsize',  icon: 'car-outline'             },
  { value: 'suv',      label: 'SUV',      icon: 'car-sport-outline'       },
  { value: 'truck',    label: 'Truck',    icon: 'construct-outline'       },
  { value: 'luxury',   label: 'Luxury',   icon: 'diamond-outline'         },
  { value: 'sports',   label: 'Sports',   icon: 'speedometer-outline'     },
  { value: 'electric', label: 'Electric', icon: 'battery-charging-outline'},
];

const CATEGORY_ACCENT: Record<VehicleCategory, string> = {
  economy:  '#0369a1',
  midsize:  '#1d4ed8',
  suv:      '#7c3aed',
  truck:    '#b45309',
  luxury:   '#9333ea',
  sports:   '#dc2626',
  electric: '#059669',
};

function MarketTierCard({ tier }: { tier: MarketTier }) {
  const { currencySymbol, priceRange, yearRange, mileageRange, distanceUnit } = tier;
  const fmt    = (n: number) => `${currencySymbol}${n.toLocaleString()}`;
  const fmtDst = (n: number) => `${n.toLocaleString()} ${distanceUnit}`;
  const accent = CATEGORY_ACCENT[tier.category];

  return (
    <View style={[styles.card, { borderLeftColor: accent, borderLeftWidth: 3 }]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{tier.categoryLabel}</Text>
          <Text style={styles.cardDesc}>{tier.categoryDescription}</Text>
        </View>
        <View style={styles.priceCol}>
          <Text style={[styles.priceRange, { color: accent }]}>{fmt(priceRange.min)}</Text>
          <Text style={styles.priceSep}>to</Text>
          <Text style={[styles.priceRange, { color: accent }]}>{fmt(priceRange.max)}</Text>
        </View>
      </View>

      <View style={styles.specsRow}>
        <View style={styles.specChip}>
          <Ionicons name="calendar-outline" size={13} color="#888" />
          <Text style={styles.specText}>{yearRange.min} – {yearRange.max}</Text>
        </View>
        <View style={styles.specChip}>
          <Ionicons name="speedometer-outline" size={13} color="#888" />
          <Text style={styles.specText}>{fmtDst(mileageRange.min)} – {fmtDst(mileageRange.max)}</Text>
        </View>
      </View>

      <View style={styles.expectationBox}>
        <Ionicons name="information-circle-outline" size={14} color="#555" style={{ marginTop: 1 }} />
        <Text style={styles.expectationText}>{tier.expectation}</Text>
      </View>
    </View>
  );
}

export default function PreownedScreen() {
  const [budget, setBudget] = useState('');
  const [category, setCategory] = useState<VehicleCategory | 'all'>('all');
  const { status, result, error, getRecommendations } = usePreownedGuide();

  const handleSearch = async () => {
    const parsed = parseFloat(budget.replace(/[^0-9.]/g, ''));
    if (!budget.trim() || isNaN(parsed) || parsed <= 0) {
      Alert.alert('Enter a budget', 'Please enter a valid budget amount.');
      return;
    }
    await getRecommendations(parsed, category === 'all' ? undefined : category);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Pre-Owned Guide</Text>
          <Text style={styles.subtitle}>
            See what your budget realistically buys in your local market — by vehicle segment.
          </Text>
        </View>

        {/* Input card */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>
            Your Budget{result ? ` (${result.currency})` : ''}
          </Text>
          <TextInput
            style={styles.budgetInput}
            placeholder="e.g. 15000"
            placeholderTextColor="#555"
            keyboardType="numeric"
            value={budget}
            onChangeText={setBudget}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />

          <Text style={[styles.inputLabel, { marginTop: 16 }]}>Segment</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {CATEGORY_FILTERS.map(({ value, label, icon }) => (
              <TouchableOpacity
                key={value}
                style={[styles.filterPill, category === value && styles.filterPillActive]}
                onPress={() => setCategory(value)}
              >
                <Ionicons name={icon as any} size={14} color={category === value ? '#fff' : '#888'} />
                <Text style={[styles.filterPillText, category === value && styles.filterPillTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.searchBtn, status === 'loading' && styles.searchBtnDisabled]}
            onPress={handleSearch}
            disabled={status === 'loading'}
          >
            {status === 'loading' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="location-outline" size={18} color="#fff" />
                <Text style={styles.searchBtnText}>Show Market Ranges Near Me</Text>
              </>
            )}
          </TouchableOpacity>

          {status === 'permission_denied' && (
            <Text style={styles.statusNote}>
              Location access is needed to apply regional pricing. Enable it in Settings.
            </Text>
          )}
          {status === 'error' && error && (
            <Text style={styles.statusNote}>{error}</Text>
          )}
        </View>

        {/* Results */}
        {result && (
          <>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>
                {result.tiers.length} segment{result.tiers.length !== 1 ? 's' : ''} match your budget
              </Text>
              <View style={styles.locationBadge}>
                <Ionicons name="location" size={12} color="#3b82f6" />
                <Text style={styles.locationText}>{result.location.label}</Text>
              </View>
            </View>

            {result.tiers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="car-outline" size={44} color="#333" />
                <Text style={styles.emptyTitle}>No segments match</Text>
                <Text style={styles.emptyBody}>
                  Try a different budget or remove the segment filter.
                </Text>
              </View>
            ) : (
              result.tiers.map((tier) => (
                <MarketTierCard key={tier.category} tier={tier} />
              ))
            )}

            <View style={styles.disclaimer}>
              <Ionicons name="information-circle-outline" size={13} color="#444" />
              <Text style={styles.disclaimerText}>{result.disclaimer}</Text>
            </View>
          </>
        )}

        {status === 'idle' && (
          <View style={styles.idleState}>
            <Ionicons name="bar-chart-outline" size={48} color="#222" />
            <Text style={styles.idleTitle}>Enter your budget above</Text>
            <Text style={styles.idleBody}>
              We'll show regional price ranges, typical model years, and expected mileage
              for each vehicle segment — based on local market depreciation data.
            </Text>
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
    padding: 16,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    lineHeight: 18,
  },
  inputCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  budgetInput: {
    backgroundColor: '#111',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: '#111',
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: '#1e3a5f',
    borderColor: '#3b82f6',
  },
  filterPillText: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: '#fff',
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    paddingVertical: 14,
  },
  searchBtnDisabled: {
    opacity: 0.6,
  },
  searchBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  statusNote: {
    fontSize: 12,
    color: '#f87171',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 16,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    flexWrap: 'wrap',
    gap: 6,
  },
  resultsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0d1f33',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  locationText: {
    fontSize: 11,
    color: '#3b82f6',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  cardDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
    lineHeight: 16,
  },
  priceCol: {
    alignItems: 'flex-end',
    gap: 1,
  },
  priceRange: {
    fontSize: 13,
    fontWeight: '700',
  },
  priceSep: {
    fontSize: 10,
    color: '#555',
  },
  specsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#111',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  specText: {
    fontSize: 12,
    color: '#aaa',
  },
  expectationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 10,
  },
  expectationText: {
    flex: 1,
    fontSize: 12,
    color: '#888',
    lineHeight: 17,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 10,
    color: '#444',
    lineHeight: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
  },
  emptyBody: {
    fontSize: 13,
    color: '#444',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  idleState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
    paddingHorizontal: 20,
  },
  idleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
  },
  idleBody: {
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
    lineHeight: 18,
  },
});
