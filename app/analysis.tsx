import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SeverityBadge } from '../src/components/SeverityBadge';
import { useInspection } from '../src/context/InspectionContext';
import type { DamageItem } from '../src/sdk/types';

const DAMAGE_ICONS: Record<string, string> = {
  rust: 'warning-outline',
  corrosion: 'alert-circle-outline',
  structural_damage: 'construct-outline',
  dent: 'remove-circle-outline',
  scratch: 'cut-outline',
  crack: 'git-branch-outline',
  leak: 'water-outline',
  wear: 'hourglass-outline',
  other: 'ellipse-outline',
};

function DamageCard({ damage }: { damage: DamageItem }) {
  const icon = DAMAGE_ICONS[damage.type] ?? 'ellipse-outline';
  return (
    <View style={styles.damageCard}>
      <View style={styles.damageHeader}>
        <Ionicons name={icon as any} size={18} color="#aaa" />
        <Text style={styles.damageType}>
          {damage.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        </Text>
        <SeverityBadge severity={damage.severity} size="sm" />
      </View>
      <Text style={styles.damageLocation}>{damage.location}</Text>
      <Text style={styles.damageDesc}>{damage.description}</Text>
      <Text style={styles.confidence}>
        Confidence: {Math.round(damage.confidence * 100)}%
      </Text>
    </View>
  );
}

export default function AnalysisScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { history, removeResult } = useInspection();

  const inspection = history.find((r) => r.id === id);

  if (!inspection) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Inspection not found.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleDelete = () => {
    Alert.alert('Delete Inspection', 'Remove this inspection from history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeResult(inspection.id);
          router.back();
        },
      },
    ]);
  };

  const date = new Date(inspection.timestamp).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Photo */}
        <Image source={{ uri: inspection.imageUri }} style={styles.photo} resizeMode="cover" />

        {/* Overall result */}
        <View style={styles.resultCard}>
          <View style={styles.resultRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.partLabel}>
                {inspection.vehiclePart.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </Text>
              <Text style={styles.dateText}>{date}</Text>
            </View>
            <SeverityBadge severity={inspection.overallSeverity} size="lg" />
          </View>
          <Text style={styles.summary}>{inspection.summary}</Text>
        </View>

        {/* Damage items */}
        {inspection.damages.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {inspection.damages.length} Issue{inspection.damages.length > 1 ? 's' : ''} Found
            </Text>
            {inspection.damages.map((d, i) => (
              <DamageCard key={i} damage={d} />
            ))}
          </View>
        ) : (
          <View style={styles.noDamage}>
            <Ionicons name="checkmark-circle" size={40} color="#4caf50" />
            <Text style={styles.noDamageText}>No damage detected</Text>
          </View>
        )}

        {/* Recommendations */}
        {inspection.recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recommendations</Text>
            <View style={styles.recCard}>
              {inspection.recommendations.map((rec, i) => (
                <View key={i} style={styles.recRow}>
                  <Ionicons name="chevron-forward" size={14} color="#3b82f6" />
                  <Text style={styles.recText}>{rec}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={14} color="#555" />
          <Text style={styles.disclaimerText}>
            This analysis is AI-generated and for informational purposes only. Always consult a
            qualified mechanic before making repair decisions.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.newInspectionBtn}
            onPress={() => router.replace('/')}
          >
            <Ionicons name="camera-outline" size={18} color="#fff" />
            <Text style={styles.newInspectionText}>New Inspection</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color="#f44336" />
          </TouchableOpacity>
        </View>
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
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: {
    color: '#888',
    fontSize: 16,
  },
  backLink: {
    color: '#3b82f6',
    fontSize: 15,
  },
  photo: {
    width: '100%',
    height: 240,
  },
  resultCard: {
    margin: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  partLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  dateText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  summary: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
  },
  damageCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 6,
  },
  damageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  damageType: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  damageLocation: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  damageDesc: {
    fontSize: 13,
    color: '#bbb',
    lineHeight: 18,
  },
  confidence: {
    fontSize: 11,
    color: '#555',
  },
  noDamage: {
    alignItems: 'center',
    padding: 32,
    gap: 10,
  },
  noDamageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4caf50',
  },
  recCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 10,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  recText: {
    flex: 1,
    fontSize: 13,
    color: '#ccc',
    lineHeight: 18,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: '#555',
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
  },
  newInspectionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  newInspectionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  deleteBtn: {
    width: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a1a1a',
    backgroundColor: '#1a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
