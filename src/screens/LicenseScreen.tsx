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
  LICENSE_CATEGORY_ICONS,
  LICENSE_CATEGORY_LABELS,
  LICENSE_REVIEW_TOPICS,
  type LicenseReviewCategory,
  type LicenseReviewTopic,
} from '../data/licenseKnowledgeReview';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type CategoryFilter = LicenseReviewCategory | 'all';

const CATEGORY_FILTERS: CategoryFilter[] = [
  'all',
  'signs',
  'right_of_way',
  'parking',
  'safe_driving',
  'impairment',
  'emergencies',
];

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

function PracticeQuestionCard({
  question,
  index,
}: {
  question: LicenseReviewTopic['practice'][number];
  index: number;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={styles.questionCard}>
      <Text style={styles.questionText}>{index + 1}. {question.question}</Text>
      <View style={styles.choiceList}>
        {question.choices.map((choice) => {
          const isAnswer = revealed && choice === question.answer;
          return (
            <View key={choice} style={[styles.choiceRow, isAnswer && styles.choiceRowAnswer]}>
              <Ionicons
                name={isAnswer ? 'checkmark-circle' : 'ellipse-outline'}
                size={14}
                color={isAnswer ? '#22c55e' : '#64748b'}
              />
              <Text style={[styles.choiceText, isAnswer && styles.choiceTextAnswer]}>{choice}</Text>
            </View>
          );
        })}
      </View>
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.answerButton}
        onPress={() => setRevealed((value) => !value)}
      >
        <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={14} color="#fff" />
        <Text style={styles.answerButtonText}>{revealed ? 'Hide Answer' : 'Show Answer'}</Text>
      </TouchableOpacity>
      {revealed && <Text style={styles.explanationText}>{question.explanation}</Text>}
    </View>
  );
}

function ReviewTopicCard({ topic }: { topic: LicenseReviewTopic }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setExpanded((value) => !value)}
        style={styles.cardTop}
      >
        <View style={styles.cardIcon}>
          <Ionicons name={topic.icon} size={21} color="#60a5fa" />
        </View>
        <View style={styles.cardTitleCol}>
          <Text style={styles.cardTitle}>{topic.title}</Text>
          <Text style={styles.cardSummary}>{topic.summary}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#64748b" />
      </TouchableOpacity>

      <View style={styles.categoryBadge}>
        <Ionicons name={LICENSE_CATEGORY_ICONS[topic.category]} size={12} color="#93c5fd" />
        <Text style={styles.categoryBadgeText}>{LICENSE_CATEGORY_LABELS[topic.category]}</Text>
      </View>

      {expanded && (
        <View style={styles.expanded}>
          <InfoList title="Key Rules" icon="book-outline" items={topic.keyRules} />
          <InfoList title="Watch For" icon="alert-circle-outline" items={topic.watchFor} />

          <View style={styles.memoryBox}>
            <Ionicons name="bulb-outline" size={15} color="#facc15" style={{ marginTop: 1 }} />
            <Text style={styles.memoryText}>{topic.memoryTip}</Text>
          </View>

          <View style={styles.practiceBlock}>
            <View style={styles.infoTitleRow}>
              <Ionicons name="help-circle-outline" size={14} color="#94a3b8" />
              <Text style={styles.infoTitle}>Practice Questions</Text>
            </View>
            {topic.practice.map((question, index) => (
              <PracticeQuestionCard key={question.question} question={question} index={index} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

export default function LicenseKnowledgeScreen() {
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [query, setQuery] = useState('');

  const filteredTopics = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return LICENSE_REVIEW_TOPICS.filter((topic) => {
      const matchesCategory = category === 'all' || topic.category === category;
      if (!matchesCategory) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchable = [
        topic.title,
        topic.summary,
        topic.memoryTip,
        ...topic.keyRules,
        ...topic.watchFor,
        ...topic.practice.flatMap((practice) => [
          practice.question,
          practice.answer,
          practice.explanation,
          ...practice.choices,
        ]),
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
          <Text style={styles.title}>License Test Review</Text>
          <Text style={styles.subtitle}>
            Study common knowledge-test rules with quick reminders and answer-reveal practice.
          </Text>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search signs, right of way, parking, skids..."
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
                  name={LICENSE_CATEGORY_ICONS[filter]}
                  size={14}
                  color={active ? '#fff' : '#94a3b8'}
                />
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {LICENSE_CATEGORY_LABELS[filter]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.summaryStrip}>
          <Ionicons name="school-outline" size={16} color="#38bdf8" />
          <Text style={styles.summaryText}>
            Rules can vary by state. Use this as review, then check your state driver handbook before test day.
          </Text>
        </View>

        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>
            {filteredTopics.length} review topic{filteredTopics.length === 1 ? '' : 's'}
          </Text>
        </View>

        {filteredTopics.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={42} color="#334155" />
            <Text style={styles.emptyTitle}>No review topic found</Text>
            <Text style={styles.emptyBody}>Try a broader search like signs, parking, right of way, or emergency.</Text>
          </View>
        ) : (
          filteredTopics.map((topic) => (
            <ReviewTopicCard key={topic.id} topic={topic} />
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
    backgroundColor: '#082f49',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0c4a6e',
    padding: 12,
    marginBottom: 18,
  },
  summaryText: {
    flex: 1,
    fontSize: 12,
    color: '#bae6fd',
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
  cardSummary: {
    color: '#777',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#111',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginTop: 12,
  },
  categoryBadgeText: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
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
  memoryBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#2f2605',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#4a3a08',
    padding: 10,
  },
  memoryText: {
    flex: 1,
    color: '#fde68a',
    fontSize: 12,
    lineHeight: 17,
  },
  practiceBlock: {
    gap: 10,
  },
  questionCard: {
    backgroundColor: '#111',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 10,
    gap: 9,
  },
  questionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  choiceList: {
    gap: 6,
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    borderRadius: 7,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  choiceRowAnswer: {
    backgroundColor: '#052e16',
  },
  choiceText: {
    flex: 1,
    color: '#a1a1aa',
    fontSize: 12,
    lineHeight: 16,
  },
  choiceTextAnswer: {
    color: '#86efac',
    fontWeight: '700',
  },
  answerButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  answerButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  explanationText: {
    color: '#94a3b8',
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
    maxWidth: 280,
  },
});
