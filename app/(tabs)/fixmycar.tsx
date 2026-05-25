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

interface ProblemStarter {
  id: string;
  label: string;
  detail: string;
  icon: IoniconName;
  category: CategoryFilter;
  query: string;
}

const CATEGORY_FILTERS: CategoryFilter[] = ['all', 'suspension', 'steering', 'brakes', 'drivetrain', 'engine'];

const PROBLEM_STARTERS: ProblemStarter[] = [
  {
    id: 'noise',
    label: 'I Hear a Noise',
    detail: 'Clicking, clunking, squealing',
    icon: 'volume-high-outline',
    category: 'all',
    query: 'click',
  },
  {
    id: 'brakes',
    label: 'Brakes Feel Weird',
    detail: 'Spongy, grinding, scraping',
    icon: 'disc-outline',
    category: 'brakes',
    query: '',
  },
  {
    id: 'steering',
    label: 'Steering Feels Off',
    detail: 'Stiff, heavy, binding',
    icon: 'radio-button-on-outline',
    category: 'steering',
    query: '',
  },
  {
    id: 'turning',
    label: 'Clicks While Turning',
    detail: 'Parking-lot turns, CV axle signs',
    icon: 'return-up-forward-outline',
    category: 'drivetrain',
    query: 'turning click',
  },
  {
    id: 'wont-start',
    label: "Won't Start",
    detail: 'Cranks but does not catch',
    icon: 'flash-outline',
    category: 'engine',
    query: '',
  },
  {
    id: 'suspension',
    label: 'Over Bumps',
    detail: 'Knock over potholes or driveway lips',
    icon: 'git-branch-outline',
    category: 'suspension',
    query: 'bump',
  },
];

const URGENCY_META: Record<FixUrgency, { label: string; color: string; background: string; drive: string }> = {
  monitor: { label: 'Monitor', color: '#38bdf8', background: '#082f49', drive: 'Usually OK' },
  soon: { label: 'Fix Soon', color: '#facc15', background: '#3a2f05', drive: 'Short trips' },
  urgent: { label: 'Urgent', color: '#fb923c', background: '#3b1d05', drive: 'Limit driving' },
  do_not_drive: { label: 'Do Not Drive', color: '#f87171', background: '#3b0a0a', drive: 'Tow it' },
};

const DIFFICULTY_META: Record<FixDifficulty, { label: string; icon: IoniconName; time: string; cost: string }> = {
  easy: { label: 'Home garage', icon: 'home-outline', time: '1-2 hr', cost: '$-$$' },
  moderate: { label: 'DIY+', icon: 'construct-outline', time: '2-5 hr', cost: '$$' },
  advanced: { label: 'Advanced', icon: 'warning-outline', time: 'Shop likely', cost: '$$$' },
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

function StatChip({ icon, label, value }: { icon: IoniconName; label: string; value: string }) {
  return (
    <View style={styles.statChip}>
      <Ionicons name={icon} size={14} color="#93c5fd" />
      <View style={styles.statTextCol}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

function DiagnosisCard({ suggestion, featured = false }: { suggestion: DiagnosisSuggestion; featured?: boolean }) {
  const [expanded, setExpanded] = useState(featured);
  const urgency = URGENCY_META[suggestion.urgency];
  const difficulty = DIFFICULTY_META[suggestion.difficulty];

  return (
    <View style={[styles.card, featured && styles.featuredCard]}>
      {featured && (
        <View style={styles.featuredHeader}>
          <Ionicons name="sparkles-outline" size={14} color="#60a5fa" />
          <Text style={styles.featuredLabel}>Best Match From Your Symptoms</Text>
        </View>
      )}

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

      <View style={styles.statGrid}>
        <StatChip icon="car-outline" label="Drive?" value={urgency.drive} />
        <StatChip icon="time-outline" label="DIY Time" value={difficulty.time} />
        <StatChip icon="cash-outline" label="Cost" value={difficulty.cost} />
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
  const [activeStarter, setActiveStarter] = useState<string>('noise');

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
        ...(suggestion.buyingChecks ?? []),
        ...(suggestion.repairSteps ?? []),
        ...suggestion.parts,
        ...suggestion.tools,
      ].join(' ').toLowerCase();

      return normalizedQuery.split(/\s+/).every((word) => searchable.includes(word));
    });
  }, [category, query]);

  const featuredSuggestion = filteredSuggestions[0] ?? DIAGNOSIS_SUGGESTIONS[0];
  const remainingSuggestions = filteredSuggestions.filter((suggestion) => suggestion.id !== featuredSuggestion.id);

  const handleStarterPress = (starter: ProblemStarter) => {
    setActiveStarter(starter.id);
    setCategory(starter.category);
    setQuery(starter.query);
  };

  const clearGuidedSearch = () => {
    setActiveStarter('');
    setCategory('all');
    setQuery('');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIcon}>
              <Ionicons name="sparkles-outline" size={24} color="#60a5fa" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>Smart Diagnosis</Text>
              <Text style={styles.title}>What feels wrong?</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            Tap a symptom, then get likely causes, safety guidance, parts to check, and DIY repair steps.
          </Text>
          <View style={styles.heroActions}>
            <View style={styles.heroActionChip}>
              <Ionicons name="camera-outline" size={14} color="#93c5fd" />
              <Text style={styles.heroActionText}>Add photos during inspection</Text>
            </View>
            <View style={styles.heroActionChip}>
              <Ionicons name="receipt-outline" size={14} color="#93c5fd" />
              <Text style={styles.heroActionText}>Use notes for mechanic quotes</Text>
            </View>
          </View>
        </View>

        <View style={styles.starterGrid}>
          {PROBLEM_STARTERS.map((starter) => {
            const active = activeStarter === starter.id;
            return (
              <TouchableOpacity
                key={starter.id}
                activeOpacity={0.78}
                style={[styles.starterCard, active && styles.starterCardActive]}
                onPress={() => handleStarterPress(starter)}
              >
                <View style={[styles.starterIcon, active && styles.starterIconActive]}>
                  <Ionicons name={starter.icon} size={20} color={active ? '#fff' : '#60a5fa'} />
                </View>
                <Text style={styles.starterLabel}>{starter.label}</Text>
                <Text style={styles.starterDetail}>{starter.detail}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={(value) => {
              setQuery(value);
              setActiveStarter('');
            }}
            placeholder="Search clicking, stiff steering, spongy brakes..."
            placeholderTextColor="#475569"
            returnKeyType="search"
          />
          {(query.length > 0 || category !== 'all') && (
            <TouchableOpacity onPress={clearGuidedSearch} hitSlop={10}>
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
                onPress={() => {
                  setCategory(filter);
                  setActiveStarter('');
                }}
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

        {filteredSuggestions.length > 0 ? (
          <>
            <DiagnosisCard suggestion={featuredSuggestion} featured />

            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>
                More possible matches ({remainingSuggestions.length})
              </Text>
            </View>

            {remainingSuggestions.length === 0 ? (
              <View style={styles.emptyStateSmall}>
                <Text style={styles.emptyBody}>Change the symptom or category to compare other possibilities.</Text>
              </View>
            ) : (
              remainingSuggestions.map((suggestion) => (
                <DiagnosisCard key={suggestion.id} suggestion={suggestion} />
              ))
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="construct-outline" size={42} color="#334155" />
            <Text style={styles.emptyTitle}>No matching symptom yet</Text>
            <Text style={styles.emptyBody}>Try a broader search like brake, steering, click, or suspension.</Text>
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
  hero: {
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f3b5c',
    padding: 16,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d1f33',
  },
  eyebrow: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 19,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  heroActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  heroActionText: {
    color: '#bfdbfe',
    fontSize: 11,
    fontWeight: '700',
  },
  starterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  starterCard: {
    width: '48%',
    minHeight: 118,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 12,
  },
  starterCardActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#0d1f33',
  },
  starterIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d1f33',
    marginBottom: 9,
  },
  starterIconActive: {
    backgroundColor: '#1d4ed8',
  },
  starterLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 17,
  },
  starterDetail: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 15,
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
  resultsHeader: {
    marginBottom: 10,
    marginTop: 4,
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
  featuredCard: {
    borderColor: '#1d4ed8',
    backgroundColor: '#151923',
  },
  featuredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  featuredLabel: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
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
    color: '#94a3b8',
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
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  statChip: {
    flex: 1,
    minWidth: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#111',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  statTextCol: {
    flex: 1,
  },
  statLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statValue: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 1,
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
  emptyStateSmall: {
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 14,
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyBody: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
});
