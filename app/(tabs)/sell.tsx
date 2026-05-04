import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SeverityBadge } from '../../src/components/SeverityBadge';
import { useSellingPrice } from '../../src/hooks/useSellingPrice';
import { analyzeVehicleImage } from '../../src/sdk/analyze';
import type {
  InspectionResult,
  PlatformListing,
  SellingPriceEstimate,
  Severity,
  VehicleCategory,
  VehiclePart,
} from '../../src/sdk/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const VEHICLE_CATEGORIES: { value: VehicleCategory; label: string }[] = [
  { value: 'economy',  label: 'Economy'  },
  { value: 'midsize',  label: 'Midsize'  },
  { value: 'suv',      label: 'SUV'      },
  { value: 'truck',    label: 'Truck'    },
  { value: 'luxury',   label: 'Luxury'   },
  { value: 'sports',   label: 'Sports'   },
  { value: 'electric', label: 'Electric' },
];

const CONDITIONS: { value: Severity; label: string; desc: string }[] = [
  { value: 'none',     label: 'Excellent', desc: 'No damage'      },
  { value: 'minor',    label: 'Good',      desc: 'Minor wear'     },
  { value: 'moderate', label: 'Fair',      desc: 'Visible damage' },
  { value: 'severe',   label: 'Poor',      desc: 'Major issues'   },
];

const CONDITION_COLOR: Record<Severity, string> = {
  none:     '#4ade80',
  minor:    '#facc15',
  moderate: '#fb923c',
  severe:   '#f87171',
};

const SCAN_PARTS: { id: VehiclePart; label: string; icon: string; hint: string }[] = [
  { id: 'underbody',      label: 'Underbody',     icon: 'layers-outline',               hint: 'Frame rails, floor pans, exhaust, brake lines.' },
  { id: 'front',          label: 'Front',          icon: 'arrow-forward-circle-outline', hint: 'Bumper, hood, headlights, grille.' },
  { id: 'rear',           label: 'Rear',           icon: 'arrow-back-circle-outline',    hint: 'Rear bumper, trunk lid, taillights.' },
  { id: 'driver_side',    label: 'Driver Side',    icon: 'car-outline',                  hint: 'Driver-side panels and doors.' },
  { id: 'passenger_side', label: 'Passenger Side', icon: 'car-outline',                  hint: 'Passenger-side panels and doors.' },
  { id: 'engine_bay',     label: 'Engine Bay',     icon: 'settings-outline',             hint: 'Engine, fluid lines, hoses, and belts.' },
];

// Derive worst-case severity across all scan results
function deriveSeverity(results: Partial<Record<VehiclePart, InspectionResult>>): Severity | null {
  const vals = Object.values(results).filter(Boolean) as InspectionResult[];
  if (vals.length === 0) return null;
  if (vals.some((r) => r.overallSeverity === 'severe'))   return 'severe';
  if (vals.some((r) => r.overallSeverity === 'moderate')) return 'moderate';
  if (vals.some((r) => r.overallSeverity === 'minor'))    return 'minor';
  return 'none';
}

// ─── Scan camera modal ────────────────────────────────────────────────────────

function ScanCameraModal({
  part,
  onClose,
  onResult,
}: {
  part: typeof SCAN_PARTS[0];
  onClose: () => void;
  onResult: (r: InspectionResult) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [analyzing, setAnalyzing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const handleCapture = async () => {
    if (!cameraRef.current || analyzing) return;
    setAnalyzing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo?.uri) throw new Error('Failed to capture photo.');

      const resized = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      const filename = `sell_${part.id}_${Date.now()}.jpg`;
      const savedUri = `${FileSystem.documentDirectory}inspections/${filename}`;
      await FileSystem.makeDirectoryAsync(
        `${FileSystem.documentDirectory}inspections/`,
        { intermediates: true }
      );
      await FileSystem.moveAsync({ from: resized.uri, to: savedUri });

      const base64 = await FileSystem.readAsStringAsync(savedUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const apiKey =
        (Constants.expoConfig?.extra?.anthropicApiKey as string | undefined)
        ?? process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

      if (!apiKey) {
        Alert.alert('API Key Missing', 'Set EXPO_PUBLIC_ANTHROPIC_API_KEY in your .env file.');
        return;
      }

      const result = await analyzeVehicleImage(base64, savedUri, { apiKey, vehiclePart: part.id });
      onResult(result);
      onClose();
    } catch (err) {
      Alert.alert('Analysis Failed', err instanceof Error ? err.message : String(err));
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <View style={styles.cameraModal}>
      {!permission ? (
        <View style={styles.cameraCentered} />
      ) : !permission.granted ? (
        <View style={styles.cameraCentered}>
          <Ionicons name="camera-outline" size={48} color="#666" />
          <Text style={styles.cameraPermText}>Camera access is required.</Text>
          <TouchableOpacity style={styles.cameraGrantBtn} onPress={requestPermission}>
            <Text style={styles.cameraGrantBtnText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <CameraView ref={cameraRef} style={styles.cameraView} facing="back">
          <View style={styles.cameraTopBar}>
            <TouchableOpacity style={styles.cameraCloseBtn} onPress={onClose} disabled={analyzing}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.cameraTitleText}>{part.label}</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.cameraOverlay}>
            <View style={styles.cameraFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
          </View>

          <View style={styles.cameraBottom}>
            <Text style={styles.cameraHint}>{part.hint}</Text>
            {analyzing ? (
              <View style={styles.analyzingBox}>
                <ActivityIndicator size="large" color="#f59e0b" />
                <Text style={styles.analyzingText}>Analyzing with AI...</Text>
              </View>
            ) : (
              <View style={styles.captureRow}>
                <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
                  <View style={styles.captureBtnInner} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </CameraView>
      )}
    </View>
  );
}

// ─── Scan condition section ───────────────────────────────────────────────────

function ScanConditionSection({
  scanResults,
  onScanResult,
  onClear,
}: {
  scanResults: Partial<Record<VehiclePart, InspectionResult>>;
  onScanResult: (part: VehiclePart, result: InspectionResult) => void;
  onClear: () => void;
}) {
  const [activePart, setActivePart] = useState<typeof SCAN_PARTS[0] | null>(null);
  const derived = deriveSeverity(scanResults);
  const scannedCount = Object.keys(scanResults).length;

  return (
    <>
      {/* Derived condition banner */}
      {derived !== null && (
        <View style={[styles.derivedBanner, { borderColor: CONDITION_COLOR[derived] + '55', backgroundColor: CONDITION_COLOR[derived] + '10' }]}>
          <Ionicons name="camera" size={14} color={CONDITION_COLOR[derived]} />
          <Text style={[styles.derivedLabel, { color: CONDITION_COLOR[derived] }]}>
            AI detected: {CONDITIONS.find((c) => c.value === derived)?.label} condition
          </Text>
          <Text style={styles.derivedSub}>({scannedCount} area{scannedCount > 1 ? 's' : ''} scanned)</Text>
          <TouchableOpacity onPress={onClear} style={styles.clearScansBtn}>
            <Text style={styles.clearScansText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 2-column part grid */}
      <View style={styles.scanGrid}>
        {SCAN_PARTS.map((part) => {
          const result = scanResults[part.id];
          return (
            <TouchableOpacity
              key={part.id}
              style={[
                styles.scanPartCard,
                result && { borderColor: CONDITION_COLOR[result.overallSeverity] + '66' },
              ]}
              onPress={() => setActivePart(part)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={part.icon as any}
                size={20}
                color={result ? CONDITION_COLOR[result.overallSeverity] : '#3b82f6'}
              />
              <Text style={styles.scanPartLabel}>{part.label}</Text>
              {result ? (
                <SeverityBadge severity={result.overallSeverity} size="sm" />
              ) : (
                <View style={styles.scanPartTap}>
                  <Ionicons name="camera-outline" size={11} color="#555" />
                  <Text style={styles.scanPartTapText}>Scan</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Damage summary for scanned parts */}
      {scannedCount > 0 && (
        <View style={styles.scanSummaryCard}>
          {SCAN_PARTS.filter((p) => scanResults[p.id]).map((part) => {
            const r = scanResults[part.id]!;
            return (
              <View key={part.id} style={styles.scanSummaryRow}>
                <Ionicons name={part.icon as any} size={13} color="#555" />
                <Text style={styles.scanSummaryPart}>{part.label}</Text>
                <Text style={styles.scanSummarySev} numberOfLines={1}>
                  {r.damages.length === 0
                    ? 'No issues'
                    : r.damages.map((d) => d.type.replace(/_/g, ' ')).join(', ')}
                </Text>
                <SeverityBadge severity={r.overallSeverity} size="sm" />
              </View>
            );
          })}
        </View>
      )}

      {/* Scan camera modal */}
      {activePart && (
        <Modal visible animationType="slide" onRequestClose={() => setActivePart(null)}>
          <ScanCameraModal
            part={activePart}
            onClose={() => setActivePart(null)}
            onResult={(result) => {
              onScanResult(activePart.id, result);
              setActivePart(null);
            }}
          />
        </Modal>
      )}
    </>
  );
}

// ─── Price results ────────────────────────────────────────────────────────────

function PriceResults({ estimate }: { estimate: SellingPriceEstimate }) {
  const [activePlatform, setActivePlatform] = useState<'Facebook Marketplace' | 'Craigslist'>('Facebook Marketplace');
  const {
    currencySymbol, vehicleInfo, location, conditionLabel,
    idealSalePrice, listingPrice, quickSalePrice, negotiationBuffer,
    platforms, listingTips, factors, disclaimer,
  } = estimate;
  const fmt = (n: number) => `${currencySymbol}${n.toLocaleString()}`;
  const platform = platforms.find((p) => p.platform === activePlatform) as PlatformListing;

  return (
    <>
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsVehicle}>
          {vehicleInfo.year} {vehicleInfo.make} {vehicleInfo.model}
        </Text>
        <View style={styles.locationBadge}>
          <Ionicons name="location" size={12} color="#f59e0b" />
          <Text style={styles.locationText}>{location.label}</Text>
        </View>
        <Text style={styles.conditionText}>{conditionLabel} condition</Text>
      </View>

      <View style={styles.priceGrid}>
        <View style={styles.priceTier}>
          <Text style={styles.tierLabel}>Quick Sale</Text>
          <Text style={[styles.tierValue, { color: '#f87171' }]}>{fmt(quickSalePrice.min)}</Text>
          <Text style={styles.tierSub}>Price to move fast</Text>
        </View>
        <View style={styles.priceDivider} />
        <View style={styles.priceTier}>
          <Text style={styles.tierLabel}>Ideal Price</Text>
          <Text style={[styles.tierValue, { color: '#4ade80' }]}>{fmt(idealSalePrice.max)}</Text>
          <Text style={styles.tierSub}>What you should get</Text>
        </View>
        <View style={styles.priceDivider} />
        <View style={styles.priceTier}>
          <Text style={styles.tierLabel}>List At</Text>
          <Text style={[styles.tierValue, { color: '#f59e0b' }]}>{fmt(listingPrice.max)}</Text>
          <Text style={styles.tierSub}>{negotiationBuffer}% wiggle room</Text>
        </View>
      </View>

      <View style={styles.platformTabs}>
        {(['Facebook Marketplace', 'Craigslist'] as const).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.platformTab, activePlatform === p && styles.platformTabActive]}
            onPress={() => setActivePlatform(p)}
          >
            <Ionicons
              name={p === 'Facebook Marketplace' ? 'logo-facebook' : 'list-outline'}
              size={14}
              color={activePlatform === p ? '#fff' : '#666'}
            />
            <Text style={[styles.platformTabText, activePlatform === p && styles.platformTabTextActive]}>
              {p === 'Facebook Marketplace' ? 'FB Marketplace' : 'Craigslist'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.platformPriceRow}>
        <Text style={styles.platformPriceLabel}>Suggested listing price</Text>
        <Text style={styles.platformPriceValue}>
          {fmt(platform.listingPrice.min)} – {fmt(platform.listingPrice.max)}
        </Text>
      </View>

      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>Tips for {activePlatform}</Text>
        {platform.tips.map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <Ionicons name="checkmark-circle-outline" size={15} color="#f59e0b" />
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>

      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>Listing Tips</Text>
        {listingTips.map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <Ionicons name="bulb-outline" size={15} color="#888" />
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>

      <View style={styles.factorsCard}>
        {factors.map((f, i) => (
          <View key={i} style={styles.factorRow}>
            <Ionicons name="information-circle-outline" size={13} color="#555" />
            <Text style={styles.factorText}>{f}</Text>
          </View>
        ))}
      </View>

      <View style={styles.disclaimer}>
        <Ionicons name="information-circle-outline" size={13} color="#444" />
        <Text style={styles.disclaimerText}>{disclaimer}</Text>
      </View>
    </>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SellScreen() {
  const [year, setYear]       = useState('');
  const [make, setMake]       = useState('');
  const [model, setModel]     = useState('');
  const [mileage, setMileage] = useState('');
  const [category, setCategory]   = useState<VehicleCategory>('midsize');
  const [manualCondition, setManualCondition] = useState<Severity>('none');
  const [scanResults, setScanResults] = useState<Partial<Record<VehiclePart, InspectionResult>>>({});
  const { status, result, error, getEstimate } = useSellingPrice();

  const derivedCondition = deriveSeverity(scanResults);
  // AI-derived condition takes priority; manual picker is the fallback
  const effectiveCondition = derivedCondition ?? manualCondition;
  const usingAI = derivedCondition !== null;

  const handleGetPrice = async () => {
    const yearNum    = parseInt(year, 10);
    const mileageNum = parseInt(mileage, 10);
    const currentYear = new Date().getFullYear();

    if (!year || !make.trim() || !model.trim() || !mileage) {
      Alert.alert('Missing fields', 'Please fill in all vehicle details.');
      return;
    }
    if (isNaN(yearNum) || yearNum < 1970 || yearNum > currentYear) {
      Alert.alert('Invalid year', `Enter a year between 1970 and ${currentYear}.`);
      return;
    }
    if (isNaN(mileageNum) || mileageNum < 0) {
      Alert.alert('Invalid mileage', 'Enter a valid odometer reading.');
      return;
    }

    await getEstimate(
      { year: yearNum, make: make.trim(), model: model.trim(), mileage: mileageNum, category },
      effectiveCondition
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Pressable onPress={Keyboard.dismiss}>
          <View style={styles.header}>
            <Text style={styles.title}>Sell Your Car</Text>
            <Text style={styles.subtitle}>
              Scan your car for accurate AI-based condition detection, then get region-adjusted
              listing prices for FB Marketplace and Craigslist.
            </Text>
          </View>

          <View style={styles.inputCard}>
            {/* Year + Make */}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Year</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 2018"
                  placeholderTextColor="#555"
                  keyboardType="number-pad"
                  maxLength={4}
                  value={year}
                  onChangeText={setYear}
                />
              </View>
              <View style={{ flex: 2 }}>
                <Text style={styles.inputLabel}>Make</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Toyota"
                  placeholderTextColor="#555"
                  value={make}
                  onChangeText={setMake}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Model</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Camry"
              placeholderTextColor="#555"
              value={model}
              onChangeText={setModel}
            />

            <Text style={styles.inputLabel}>Mileage</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 75000"
              placeholderTextColor="#555"
              keyboardType="number-pad"
              value={mileage}
              onChangeText={setMileage}
            />

            <Text style={styles.inputLabel}>Vehicle Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
              {VEHICLE_CATEGORIES.map(({ value, label }) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.pill, category === value && styles.pillActive]}
                  onPress={() => setCategory(value)}
                >
                  <Text style={[styles.pillText, category === value && styles.pillTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Condition — scan first, manual fallback */}
            <View style={styles.conditionHeader}>
              <Text style={styles.inputLabel}>Condition</Text>
              {usingAI && (
                <View style={styles.aiTag}>
                  <Ionicons name="camera" size={11} color="#3b82f6" />
                  <Text style={styles.aiTagText}>AI Detected</Text>
                </View>
              )}
            </View>

            <ScanConditionSection
              scanResults={scanResults}
              onScanResult={(part, r) => setScanResults((prev) => ({ ...prev, [part]: r }))}
              onClear={() => setScanResults({})}
            />

            {/* Manual picker — dimmed when AI is active */}
            <View style={[styles.conditionRow, usingAI && styles.conditionRowDimmed]}>
              {CONDITIONS.map(({ value, label, desc }) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.conditionPill,
                    !usingAI && manualCondition === value && {
                      borderColor: CONDITION_COLOR[value],
                      backgroundColor: `${CONDITION_COLOR[value]}18`,
                    },
                    usingAI && effectiveCondition === value && {
                      borderColor: CONDITION_COLOR[value],
                      backgroundColor: `${CONDITION_COLOR[value]}18`,
                    },
                  ]}
                  onPress={() => {
                    if (!usingAI) setManualCondition(value);
                  }}
                  activeOpacity={usingAI ? 1 : 0.7}
                >
                  <Text style={[
                    styles.conditionLabel,
                    (usingAI ? effectiveCondition === value : manualCondition === value) && { color: CONDITION_COLOR[value] },
                  ]}>
                    {label}
                  </Text>
                  <Text style={styles.conditionDesc}>{desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {usingAI && (
              <Text style={styles.conditionNote}>
                Condition set by AI scan. Tap Clear above to enter manually.
              </Text>
            )}

            <TouchableOpacity
              style={[styles.searchBtn, status === 'loading' && styles.searchBtnDisabled]}
              onPress={handleGetPrice}
              disabled={status === 'loading'}
            >
              {status === 'loading' ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="pricetag-outline" size={18} color="#fff" />
                  <Text style={styles.searchBtnText}>Get Selling Price Near Me</Text>
                </>
              )}
            </TouchableOpacity>

            {status === 'permission_denied' && (
              <Text style={styles.statusNote}>
                Location access is needed for regional pricing. Enable it in Settings.
              </Text>
            )}
            {status === 'error' && error && (
              <Text style={styles.statusNote}>{error}</Text>
            )}
          </View>

          {result && <PriceResults estimate={result} />}

          {status === 'idle' && (
            <View style={styles.idleState}>
              <Ionicons name="pricetag-outline" size={48} color="#222" />
              <Text style={styles.idleTitle}>Scan or enter condition above</Text>
              <Text style={styles.idleBody}>
                Scan your car's areas for AI-detected condition accuracy, or pick condition
                manually. We'll calculate region-adjusted prices for each platform.
              </Text>
            </View>
          )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  scroll: { padding: 16, paddingBottom: 48 },
  header: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4, lineHeight: 18 },

  inputCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 20,
    gap: 4,
  },
  row: { flexDirection: 'row', gap: 10 },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
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
  pillScroll: { marginBottom: 4 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: '#111',
    marginRight: 8,
  },
  pillActive: { backgroundColor: '#78350f', borderColor: '#92400e' },
  pillText: { fontSize: 13, color: '#888', fontWeight: '500' },
  pillTextActive: { color: '#fff' },

  // Condition header
  conditionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 6,
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0d1f33',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1a3a5a',
  },
  aiTagText: { fontSize: 10, color: '#3b82f6', fontWeight: '600' },

  // Scan grid
  derivedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  derivedLabel: { fontSize: 12, fontWeight: '700' },
  derivedSub: { fontSize: 11, color: '#555', flex: 1 },
  clearScansBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333',
  },
  clearScansText: { fontSize: 11, color: '#888', fontWeight: '600' },
  scanGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  scanPartCard: {
    width: '31%',
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 4,
    alignItems: 'flex-start',
  },
  scanPartLabel: { fontSize: 11, fontWeight: '700', color: '#ddd' },
  scanPartTap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  scanPartTapText: { fontSize: 9, color: '#555' },

  // Scan summary card
  scanSummaryCard: {
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 6,
    marginBottom: 6,
  },
  scanSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scanSummaryPart: { fontSize: 11, fontWeight: '600', color: '#aaa', width: 80 },
  scanSummarySev: { flex: 1, fontSize: 11, color: '#666', textTransform: 'capitalize' },

  // Manual condition picker
  conditionRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  conditionRowDimmed: { opacity: 0.45 },
  conditionPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: '#111',
    alignItems: 'center',
    gap: 2,
  },
  conditionLabel: { fontSize: 12, fontWeight: '700', color: '#888' },
  conditionDesc: { fontSize: 9, color: '#555', textAlign: 'center' },
  conditionNote: { fontSize: 10, color: '#555', textAlign: 'center', marginBottom: 4 },

  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#92400e',
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 12,
  },
  searchBtnDisabled: { opacity: 0.6 },
  searchBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  statusNote: { fontSize: 12, color: '#f87171', textAlign: 'center', marginTop: 10, lineHeight: 16 },

  // Price results
  resultsHeader: { marginBottom: 16, gap: 4 },
  resultsVehicle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#1f1200',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  locationText: { fontSize: 11, color: '#f59e0b', fontWeight: '500' },
  conditionText: { fontSize: 12, color: '#666' },
  priceGrid: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    overflow: 'hidden',
    marginBottom: 16,
  },
  priceTier: { flex: 1, padding: 12, alignItems: 'center', gap: 3 },
  priceDivider: { width: 1, backgroundColor: '#2a2a2a' },
  tierLabel: { fontSize: 10, color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  tierValue: { fontSize: 15, fontWeight: '800' },
  tierSub: { fontSize: 9, color: '#555', textAlign: 'center' },
  platformTabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  platformTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: '#1a1a1a',
  },
  platformTabActive: { backgroundColor: '#78350f', borderColor: '#92400e' },
  platformTabText: { fontSize: 13, color: '#666', fontWeight: '500' },
  platformTabTextActive: { color: '#fff', fontWeight: '600' },
  platformPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  platformPriceLabel: { fontSize: 13, color: '#888' },
  platformPriceValue: { fontSize: 15, fontWeight: '700', color: '#f59e0b' },
  tipsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 10,
    marginBottom: 12,
  },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 2 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tipText: { flex: 1, fontSize: 13, color: '#bbb', lineHeight: 18 },
  factorsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 6,
    marginBottom: 12,
  },
  factorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  factorText: { flex: 1, fontSize: 11, color: '#666', lineHeight: 16 },
  disclaimer: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingHorizontal: 2 },
  disclaimerText: { flex: 1, fontSize: 10, color: '#444', lineHeight: 14 },
  idleState: { alignItems: 'center', paddingVertical: 48, gap: 12, paddingHorizontal: 20 },
  idleTitle: { fontSize: 16, fontWeight: '600', color: '#444' },
  idleBody: { fontSize: 13, color: '#333', textAlign: 'center', lineHeight: 18 },

  // Camera modal
  cameraModal: { flex: 1, backgroundColor: '#000' },
  cameraCentered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 },
  cameraPermText: { color: '#aaa', fontSize: 15, textAlign: 'center' },
  cameraGrantBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  cameraGrantBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cameraView: { flex: 1 },
  cameraTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cameraCloseBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  cameraTitleText: { flex: 1, color: '#fff', fontWeight: '700', fontSize: 16, textAlign: 'center' },
  cameraOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cameraFrame: { width: '85%', aspectRatio: 4 / 3, position: 'relative' },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: '#f59e0b', borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  cameraBottom: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingBottom: 50,
    paddingTop: 16,
    paddingHorizontal: 24,
    gap: 20,
  },
  cameraHint: { color: '#ccc', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  analyzingBox: { alignItems: 'center', height: 80, justifyContent: 'center', gap: 10 },
  analyzingText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  captureRow: { alignItems: 'center', height: 80, justifyContent: 'center' },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
});
