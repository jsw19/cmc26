import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  DIAGNOSIS_SUGGESTIONS,
  type DiagnosisSuggestion,
  type FixCategory,
  type FixDifficulty,
  type FixUrgency,
} from '../../src/data/diagnosisSuggestions';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type CategoryFilter = FixCategory | 'all';

const CATEGORY_FILTERS: CategoryFilter[] = ['all', 'suspension', 'steering', 'brakes', 'drivetrain', 'engine'];

const URGENCY_META: Record<FixUrgency, { label: string; color: string; background: string }> = {
  monitor: { label: 'Monitor', color: '#38bdf8', background: '#082f49' },
  soon: { label: 'Fix Soon', color: '#facc15', background: '#3a2f05' },
  urgent: { label: 'Urgent', color: '#fb923c', background: '#3b1d05' },
  do_not_drive: { label: 'Do Not Drive', color: '#f87171', background: '#3b0a0a' },
};

const DIFFICULTY_META: Record<FixDifficulty, { label: string; icon: IoniconName }> = {
  easy: { label: 'Home garage', icon: 'home-outline' },
  moderate: { label: 'DIY+', icon: 'construct-outline' },
  advanced: { label: 'Advanced', icon: 'warning-outline' },
};

function InfoList({ title, icon, items }: { title: string; icon: IoniconName; items: string[] }) {
  return (
    <View style={styles.infoBlock}>
      <View style={styles.infoTitleRow}>
        <Ionicons name={icon} size={14} color="#94a3b8" />
        <Text style={styles.infoTitle}>{title}</Text>
      </View>
      {items.map((item) => (
        <View key={item} style={styles.bulletRow}>
          <View style={styles.bullet} />
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function DiagnosisCard({ suggestion }: { suggestion: DiagnosisSuggestion }) {
  const [expanded, setExpanded] = useState(false);
  const urgency = URGENCY_META[suggestion.urgency];
  const difficulty = DIFFICULTY_META[suggestion.difficulty];

  return (
    <View style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setExpanded((value) => !value)}
        style={styles.cardTop}
      >
        <View style={styles.cardIcon}>
          <Ionicons name={suggestion.icon} size={21} color="#60a5fa" />
        </View>
        <View style={styles.cardTitleCol}>
          <Text style={styles.cardTitle}>{suggestion.symptom}</Text>
          <Text style={styles.cardSignal}>{suggestion.shortSignal}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#64748b" />
      </TouchableOpacity>

      <View style={styles.metaRow}>
        <View style={[styles.urgencyBadge, { backgroundColor: urgency.background }]}>
          <Text style={[styles.urgencyText, { color: urgency.color }]}>{urgency.label}</Text>
        </View>
        <View style={styles.difficultyBadge}>
          <Ionicons name={difficulty.icon} size={12} color="#94a3b8" />
          <Text style={styles.difficultyText}>{difficulty.label}</Text>
        </View>
      </View>

      {expanded && (
        <View style={styles.expanded}>
          <InfoList title="Likely Causes" icon="search-outline" items={suggestion.likelyCauses} />
          <InfoList title="Quick Checks" icon="checkbox-outline" items={suggestion.quickChecks} />
          <InfoList title="Temporary Help" icon="flash-outline" items={suggestion.tempFixes} />
          <InfoList title="DIY Garage Fix" icon="hammer-outline" items={suggestion.diyFixes} />
          {suggestion.buyingChecks && (
            <InfoList title="Buy / Check These Parts" icon="cart-outline" items={suggestion.buyingChecks} />
          )}
          {suggestion.repairSteps && (
            <InfoList title="Repair Steps" icon="list-outline" items={suggestion.repairSteps} />
          )}

          <View style={styles.partsToolsRow}>
            <View style={styles.partsToolsBox}>
              <Text style={styles.partsToolsTitle}>Parts</Text>
              <Text style={styles.partsToolsText}>{suggestion.parts.join(', ')}</Text>
            </View>
            <View style={styles.partsToolsBox}>
              <Text style={styles.partsToolsTitle}>Tools</Text>
              <Text style={styles.partsToolsText}>{suggestion.tools.join(', ')}</Text>
            </View>
          </View>

          <View style={styles.safetyBox}>
            <Ionicons name="alert-circle-outline" size={15} color="#f87171" style={{ marginTop: 1 }} />
            <Text style={styles.safetyText}>{suggestion.safetyNote}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

export default function FixMyCarScreen() {
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [query, setQuery] = useState('');

  const filteredSuggestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return DIAGNOSIS_SUGGESTIONS.filter((suggestion) => {
      const matchesCategory = category === 'all' || suggestion.category === category;
      if (!matchesCategory) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchable = [
        suggestion.symptom,
        suggestion.shortSignal,
        ...suggestion.likelyCauses,
        ...suggestion.quickChecks,
        ...suggestion.tempFixes,
        ...suggestion.diyFixes,
        ...suggestion.parts,
      ].join(' ').toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [category, query]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Fix My Car</Text>
          <Text style={styles.subtitle}>
            Match common symptoms to likely causes, quick checks, temporary actions, and DIY repairs.
          </Text>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search clicking, stiff steering, spongy brakes..."
            placeholderTextColor="#475569"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          {CATEGORY_FILTERS.map((filter) => {
            const active = category === filter;
            return (
              <TouchableOpacity
                key={filter}
                activeOpacity={0.75}
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => setCategory(filter)}
              >
                <Ionicons
                  name={CATEGORY_ICONS[filter]}
                  size={14}
                  color={active ? '#fff' : '#94a3b8'}
                />
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {CATEGORY_LABELS[filter]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.summaryStrip}>
          <Ionicons name="shield-checkmark-outline" size={16} color="#22c55e" />
          <Text style={styles.summaryText}>
            Start with checks before buying parts. When brakes, steering, or wheel play feel unsafe, tow it.
          </Text>
        </View>

        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>
            {filteredSuggestions.length} diagnosis suggestion{filteredSuggestions.length === 1 ? '' : 's'}
          </Text>
        </View>

        {filteredSuggestions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="construct-outline" size={42} color="#334155" />
            <Text style={styles.emptyTitle}>No matching symptom yet</Text>
            <Text style={styles.emptyBody}>Try a broader search like brake, steering, click, or suspension.</Text>
          </View>
        ) : (
          filteredSuggestions.map((suggestion) => (
            <DiagnosisCard key={suggestion.id} suggestion={suggestion} />
          ))
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
    marginBottom: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: '#777',
    lineHeight: 18,
    marginTop: 4,
  },
  searchBox: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#151515',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: 12,
  },
  filterScroll: {
    marginBottom: 14,
  },
  filterContent: {
    gap: 8,
    paddingRight: 8,
  },
  filterPill: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: '#111',
  },
  filterPillActive: {
    backgroundColor: '#1e3a5f',
    borderColor: '#3b82f6',
  },
  filterText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: '#08240f',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#14532d',
    padding: 12,
    marginBottom: 18,
  },
  summaryText: {
    flex: 1,
    fontSize: 12,
    color: '#86efac',
    lineHeight: 17,
  },
  resultsHeader: {
    marginBottom: 10,
  },
  resultsTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 14,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d1f33',
  },
  cardTitleCol: {
    flex: 1,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  cardSignal: {
    color: '#777',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  urgencyBadge: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#111',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  difficultyText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  expanded: {
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    marginTop: 14,
    paddingTop: 14,
    gap: 12,
  },
  infoBlock: {
    gap: 7,
  },
  infoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoTitle: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3b82f6',
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    color: '#a1a1aa',
    fontSize: 12,
    lineHeight: 17,
  },
  partsToolsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  partsToolsBox: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#111',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 10,
  },
  partsToolsTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 5,
  },
  partsToolsText: {
    color: '#888',
    fontSize: 11,
    lineHeight: 16,
  },
  safetyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#240b0b',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#451a1a',
    padding: 10,
  },
  safetyText: {
    flex: 1,
    color: '#fca5a5',
    fontSize: 12,
    lineHeight: 17,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 52,
    gap: 10,
  },
  emptyTitle: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyBody: {
    color: '#475569',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
});
