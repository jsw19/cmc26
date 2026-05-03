import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SeverityBadge } from '../src/components/SeverityBadge';
import { useInspection } from '../src/context/InspectionContext';
import { useLocationCostEstimate } from '../src/hooks/useLocationCostEstimate';
import { useTradeInEstimate } from '../src/hooks/useTradeInEstimate';
import type { CostEstimate, DamageItem, TradeInEstimate, VehicleCategory } from '../src/sdk/types';

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

function CostEstimateCard({ estimate }: { estimate: CostEstimate }) {
  const { currencySymbol, items, totalMin, totalMax, location, disclaimer } = estimate;
  const fmt = (n: number) => `${currencySymbol}${n.toLocaleString()}`;

  return (
    <View style={styles.estimateCard}>
      <View style={styles.estimateLocationRow}>
        <Ionicons name="location" size={14} color="#3b82f6" />
        <Text style={styles.estimateLocation}>{location.label}</Text>
      </View>

      {items.map((item, i) => (
        <View key={i} style={styles.costRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.costItemLabel}>
              {item.damageType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </Text>
            <Text style={styles.costItemSub} numberOfLines={1}>{item.description}</Text>
          </View>
          <Text style={styles.costRange}>
            {fmt(item.minCost)} – {fmt(item.maxCost)}
          </Text>
        </View>
      ))}

      <View style={styles.costTotal}>
        <Text style={styles.costTotalLabel}>Estimated Total</Text>
        <Text style={styles.costTotalValue}>{fmt(totalMin)} – {fmt(totalMax)}</Text>
      </View>

      <Text style={styles.estimateDisclaimer}>{disclaimer}</Text>
    </View>
  );
}

const VEHICLE_CATEGORIES: { value: VehicleCategory; label: string }[] = [
  { value: 'economy',  label: 'Economy'  },
  { value: 'midsize',  label: 'Midsize'  },
  { value: 'suv',      label: 'SUV'      },
  { value: 'truck',    label: 'Truck'    },
  { value: 'luxury',   label: 'Luxury'   },
  { value: 'sports',   label: 'Sports'   },
  { value: 'electric', label: 'Electric' },
];

interface VehicleForm {
  year: string;
  make: string;
  model: string;
  mileage: string;
  category: VehicleCategory;
}

function VehicleInfoModal({
  visible,
  form,
  onChangeForm,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  form: VehicleForm;
  onChangeForm: (f: VehicleForm) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Vehicle Details</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#888" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.inputLabel}>Year</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 2018"
              placeholderTextColor="#555"
              keyboardType="number-pad"
              maxLength={4}
              value={form.year}
              onChangeText={(v) => onChangeForm({ ...form, year: v })}
            />

            <Text style={styles.inputLabel}>Make</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Toyota"
              placeholderTextColor="#555"
              value={form.make}
              onChangeText={(v) => onChangeForm({ ...form, make: v })}
            />

            <Text style={styles.inputLabel}>Model</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Camry"
              placeholderTextColor="#555"
              value={form.model}
              onChangeText={(v) => onChangeForm({ ...form, model: v })}
            />

            <Text style={styles.inputLabel}>Mileage (miles)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 75000"
              placeholderTextColor="#555"
              keyboardType="number-pad"
              value={form.mileage}
              onChangeText={(v) => onChangeForm({ ...form, mileage: v })}
            />

            <Text style={styles.inputLabel}>Vehicle Type</Text>
            <View style={styles.categoryGrid}>
              {VEHICLE_CATEGORIES.map(({ value, label }) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.categoryPill, form.category === value && styles.categoryPillActive]}
                  onPress={() => onChangeForm({ ...form, category: value })}
                >
                  <Text style={[styles.categoryPillText, form.category === value && styles.categoryPillTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={onSubmit}>
              <Text style={styles.submitBtnText}>Get Trade-In Estimate</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function TradeInEstimateCard({
  estimate,
  onEdit,
}: {
  estimate: TradeInEstimate;
  onEdit: () => void;
}) {
  const { currencySymbol, tradeInValue, privatePartyValue, vehicleInfo, location, conditionLabel, factors, disclaimer } = estimate;
  const fmt = (n: number) => `${currencySymbol}${n.toLocaleString()}`;

  return (
    <View style={styles.tradeInCard}>
      <View style={styles.tradeInHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.tradeInVehicle}>
            {vehicleInfo.year} {vehicleInfo.make} {vehicleInfo.model}
          </Text>
          <View style={styles.tradeInMeta}>
            <Ionicons name="location" size={12} color="#3b82f6" />
            <Text style={styles.tradeInMetaText}>{location.label}</Text>
            <Text style={styles.tradeInMetaDot}>·</Text>
            <Text style={styles.tradeInMetaText}>{conditionLabel}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onEdit} style={styles.editBtn}>
          <Ionicons name="pencil-outline" size={15} color="#888" />
        </TouchableOpacity>
      </View>

      <View style={styles.tradeInValues}>
        <View style={styles.tradeInValueBlock}>
          <Text style={styles.tradeInValueLabel}>Dealer Trade-In</Text>
          <Text style={styles.tradeInValueAmount}>{fmt(tradeInValue.min)} – {fmt(tradeInValue.max)}</Text>
        </View>
        <View style={styles.tradeInDivider} />
        <View style={styles.tradeInValueBlock}>
          <Text style={styles.tradeInValueLabel}>Private Party</Text>
          <Text style={[styles.tradeInValueAmount, { color: '#4ade80' }]}>
            {fmt(privatePartyValue.min)} – {fmt(privatePartyValue.max)}
          </Text>
        </View>
      </View>

      <View style={styles.factorsBox}>
        {factors.map((f, i) => (
          <View key={i} style={styles.factorRow}>
            <Ionicons name="information-circle-outline" size={13} color="#555" />
            <Text style={styles.factorText}>{f}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.estimateDisclaimer}>{disclaimer}</Text>
    </View>
  );
}

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
  const { history, removeResult, updateResult } = useInspection();
  const { status: estimateStatus, error: estimateError, getEstimate } = useLocationCostEstimate();
  const { status: tradeInStatus, getEstimate: getTradeInEstimate } = useTradeInEstimate();
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vehicleForm, setVehicleForm] = useState<{
    year: string; make: string; model: string; mileage: string; category: VehicleCategory;
  }>({ year: '', make: '', model: '', mileage: '', category: 'midsize' });

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

  const openTradeInModal = () => {
    if (inspection.vehicleInfo) {
      setVehicleForm({
        year: String(inspection.vehicleInfo.year),
        make: inspection.vehicleInfo.make,
        model: inspection.vehicleInfo.model,
        mileage: String(inspection.vehicleInfo.mileage),
        category: inspection.vehicleInfo.category,
      });
    }
    setShowVehicleModal(true);
  };

  const handleTradeInSubmit = async () => {
    const year = parseInt(vehicleForm.year, 10);
    const mileage = parseInt(vehicleForm.mileage, 10);
    const currentYear = new Date().getFullYear();

    if (!vehicleForm.year || !vehicleForm.make.trim() || !vehicleForm.model.trim() || !vehicleForm.mileage) {
      Alert.alert('Missing fields', 'Please fill in all vehicle details.');
      return;
    }
    if (isNaN(year) || year < 1970 || year > currentYear) {
      Alert.alert('Invalid year', `Enter a year between 1970 and ${currentYear}.`);
      return;
    }
    if (isNaN(mileage) || mileage < 0) {
      Alert.alert('Invalid mileage', 'Enter a valid odometer reading.');
      return;
    }

    setShowVehicleModal(false);

    const vehicleInfo = {
      year,
      make: vehicleForm.make.trim(),
      model: vehicleForm.model.trim(),
      mileage,
      category: vehicleForm.category,
    };

    const existingLocation = inspection.costEstimate?.location ?? inspection.tradeInEstimate?.location;
    const estimate = await getTradeInEstimate(vehicleInfo, inspection.overallSeverity, existingLocation);
    if (estimate) {
      await updateResult({ ...inspection, vehicleInfo, tradeInEstimate: estimate });
    }
  };

  const handleGetEstimate = async () => {
    if (!inspection || inspection.damages.length === 0) return;
    const estimate = await getEstimate(inspection.damages);
    if (estimate) {
      await updateResult({ ...inspection, costEstimate: estimate });
    }
  };

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

        {/* Cost Estimate — only shown when damage is present */}
        {inspection.damages.length > 0 && inspection.overallSeverity !== 'none' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estimated Repair Cost</Text>
            {inspection.costEstimate ? (
              <CostEstimateCard estimate={inspection.costEstimate} />
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.estimateBtn, estimateStatus === 'loading' && styles.estimateBtnDisabled]}
                  onPress={handleGetEstimate}
                  disabled={estimateStatus === 'loading'}
                >
                  {estimateStatus === 'loading' ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="location-outline" size={18} color="#fff" />
                      <Text style={styles.estimateBtnText}>
                        {estimateStatus === 'permission_denied'
                          ? 'Location access needed'
                          : estimateStatus === 'error'
                          ? 'Retry'
                          : 'Get Cost Estimate'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                {estimateStatus === 'permission_denied' && (
                  <Text style={styles.estimateHint}>
                    Enable location access in Settings to get region-adjusted estimates.
                  </Text>
                )}
                {estimateStatus === 'error' && estimateError && (
                  <Text style={styles.estimateHint}>{estimateError}</Text>
                )}
              </>
            )}
          </View>
        )}

        {/* Trade-In Estimate */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trade-In Value</Text>
          {inspection.tradeInEstimate ? (
            <TradeInEstimateCard estimate={inspection.tradeInEstimate} onEdit={openTradeInModal} />
          ) : (
            <TouchableOpacity
              style={[styles.estimateBtn, styles.tradeInBtn, tradeInStatus === 'loading' && styles.estimateBtnDisabled]}
              onPress={openTradeInModal}
              disabled={tradeInStatus === 'loading'}
            >
              {tradeInStatus === 'loading' ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="car-outline" size={18} color="#fff" />
                  <Text style={styles.estimateBtnText}>Get Trade-In Estimate</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

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

      <VehicleInfoModal
        visible={showVehicleModal}
        form={vehicleForm}
        onChangeForm={setVehicleForm}
        onSubmit={handleTradeInSubmit}
        onClose={() => setShowVehicleModal(false)}
      />
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
  estimateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1e3a5f',
    borderRadius: 10,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#2d5a8e',
  },
  estimateBtnDisabled: {
    opacity: 0.6,
  },
  estimateBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  estimateHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
  estimateCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 10,
  },
  estimateLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  estimateLocation: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
  },
  costItemLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ddd',
  },
  costItemSub: {
    fontSize: 11,
    color: '#666',
    marginTop: 1,
  },
  costRange: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },
  costTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  costTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  costTotalValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3b82f6',
  },
  estimateDisclaimer: {
    fontSize: 10,
    color: '#555',
    lineHeight: 14,
    marginTop: 2,
  },
  tradeInBtn: {
    backgroundColor: '#14532d',
    borderColor: '#166534',
  },
  tradeInCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 12,
  },
  tradeInHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tradeInVehicle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  tradeInMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  tradeInMetaText: {
    fontSize: 11,
    color: '#666',
  },
  tradeInMetaDot: {
    fontSize: 11,
    color: '#444',
  },
  editBtn: {
    padding: 4,
  },
  tradeInValues: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tradeInValueBlock: {
    flex: 1,
    padding: 12,
    gap: 4,
    alignItems: 'center',
  },
  tradeInDivider: {
    width: 1,
    backgroundColor: '#2a2a2a',
  },
  tradeInValueLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  tradeInValueAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3b82f6',
    textAlign: 'center',
  },
  factorsBox: {
    gap: 6,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  factorText: {
    flex: 1,
    fontSize: 11,
    color: '#666',
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalSheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    marginBottom: 6,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#111',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    color: '#fff',
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: '#111',
  },
  categoryPillActive: {
    backgroundColor: '#1e3a5f',
    borderColor: '#3b82f6',
  },
  categoryPillText: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  categoryPillTextActive: {
    color: '#fff',
  },
  submitBtn: {
    backgroundColor: '#166534',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
