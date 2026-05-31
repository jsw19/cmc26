import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SeverityBadge, SEVERITY_TINTS } from '../src/components/SeverityBadge';
import { INSPECTION_SYSTEMS } from '../src/data/inspectionChecklist';
import { ALL_MAKES, getIssuesForModel, getModelsForMake } from '../src/data/modelIssues';
import type { IssueSeverity } from '../src/data/modelIssues';
import { analyzeVehicleImage } from '../src/sdk/analyze';
import { analyzeCheckItem, PHOTO_HINTS, PHOTO_TARGETS } from '../src/sdk/analyzeCheckItem';
import type { CheckItemAnalysis } from '../src/sdk/analyzeCheckItem';
import type { InspectionResult, VehiclePart } from '../src/sdk/types';
import { preprocessImage } from '../src/utils/preprocessImage';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'scan' | 'checklist' | 'models' | 'tips';
type CheckStatus = 'pass' | 'fail' | null;

// ─── Scan parts ───────────────────────────────────────────────────────────────

const SCAN_PARTS: { id: VehiclePart; label: string; icon: string; hint: string; target?: string }[] = [
  { id: 'underbody',      label: 'Underbody',       icon: 'layers-outline',                 hint: 'Position below the car — chassis, floor pans, exhaust, brake lines.' },
  { id: 'front',          label: 'Front',            icon: 'arrow-forward-circle-outline',   hint: 'Capture the full front bumper, hood, headlights, and grille.' },
  { id: 'rear',           label: 'Rear',             icon: 'arrow-back-circle-outline',      hint: 'Capture the rear bumper, trunk lid, and taillights.' },
  { id: 'driver_side',    label: 'Driver Side',      icon: 'car-outline',                    hint: 'Stand back to capture the full driver-side panels and doors.' },
  { id: 'passenger_side', label: 'Passenger Side',   icon: 'car-outline',                    hint: 'Stand back to capture the full passenger-side panels and doors.' },
  { id: 'engine_bay',     label: 'Engine Bay',       icon: 'settings-outline',               hint: 'Open the hood fully — engine, fluid reservoirs, hoses, and belts.' },
  { id: 'brakes',         label: 'Brake System',     icon: 'disc-outline',                   hint: 'Turn wheel outward; capture rotor face, caliper, pad edge, and brake hose.' },
];

const SEVERITY_COLORS = {
  none: '#4ade80', minor: '#facc15', moderate: '#fb923c', severe: '#f87171',
} as const;

// ─── Camera modal ─────────────────────────────────────────────────────────────

function getScanTarget(part: typeof SCAN_PARTS[0]): string {
  if (part.target) return part.target;
  if (part.id === 'brakes') return 'brake caliper';
  if (part.id === 'underbody') return 'frame rail';
  if (part.id === 'engine_bay') return 'engine component';
  if (part.id === 'front') return 'front damage area';
  if (part.id === 'rear') return 'rear damage area';
  if (part.id === 'driver_side' || part.id === 'passenger_side') return 'side panel';
  return 'area of interest';
}

interface CameraModalProps {
  checkId: string;
  checkTitle: string;
  onClose: () => void;
  onResult: (result: CheckItemAnalysis) => void;
}

function CameraModal({ checkId, checkTitle, onClose, onResult }: CameraModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [analyzing, setAnalyzing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const hint = PHOTO_HINTS[checkId] ?? 'Point the camera at the relevant vehicle area.';
  const target = PHOTO_TARGETS[checkId] ?? 'area of interest';

  const analyzeImageUri = async (imageUri: string) => {
    setAnalyzing(true);
    try {
      const { savedUri, base64 } = await preprocessImage(
        imageUri,
        `check_${checkId}_${Date.now()}.jpg`,
      );

      const result = await analyzeCheckItem(base64, savedUri, checkId);
      onResult(result);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Analysis Failed', msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current || analyzing) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo?.uri) throw new Error('Failed to capture photo.');
      await analyzeImageUri(photo.uri);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Capture Failed', msg);
    }
  };

  const handlePickImage = async () => {
    if (analyzing) return;

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Photo Access Needed', 'Allow photo library access to upload an existing vehicle photo.');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: false,
    });

    if (pickerResult.canceled || !pickerResult.assets[0]?.uri) return;
    await analyzeImageUri(pickerResult.assets[0].uri);
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
        <CameraView ref={cameraRef} style={styles.cameraFull} facing="back">
          <View style={styles.cameraTopBar}>
            <TouchableOpacity style={styles.cameraCloseBtn} onPress={onClose} disabled={analyzing}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.cameraCheckTitle} numberOfLines={1}>{checkTitle}</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.scanOverlayContainer}>
            <View style={styles.scanOverlayFrame}>
              <View style={styles.targetBadge}>
                <Text style={styles.targetBadgeText}>Place {target} here</Text>
              </View>
              <View style={[styles.scanCorner, styles.cornerTL]} />
              <View style={[styles.scanCorner, styles.cornerTR]} />
              <View style={[styles.scanCorner, styles.cornerBL]} />
              <View style={[styles.scanCorner, styles.cornerBR]} />
            </View>
          </View>

          <View style={styles.cameraBottomBar}>
            <Text style={styles.cameraHint}>{hint}</Text>
            {analyzing ? (
              <View style={styles.cameraAnalyzing}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.cameraAnalyzingText}>Analyzing with AI...</Text>
              </View>
            ) : (
              <View style={styles.cameraControls}>
                <TouchableOpacity style={styles.uploadBtn} onPress={handlePickImage}>
                  <Ionicons name="image-outline" size={22} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
                  <View style={styles.captureBtnInner} />
                </TouchableOpacity>
                <View style={styles.captureSpacer} />
              </View>
            )}
          </View>
        </CameraView>
      )}
    </View>
  );
}

// ─── Photo result card ────────────────────────────────────────────────────────

const VERDICT_CONFIG = {
  ok:      { bg: '#071a07', border: '#14532d', color: '#22c55e', icon: 'checkmark-circle' as const, label: 'Looks OK' },
  concern: { bg: '#1a1000', border: '#7c3a00', color: '#f59e0b', icon: 'warning'          as const, label: 'Needs Attention' },
  problem: { bg: '#1a0707', border: '#7f1d1d', color: '#ef4444', icon: 'alert-circle'     as const, label: 'Problem Found' },
};

function PhotoResultCard({ result }: { result: CheckItemAnalysis }) {
  const cfg = VERDICT_CONFIG[result.verdict];
  return (
    <View style={[styles.photoResult, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <View style={styles.photoResultHeader}>
        <Ionicons name={cfg.icon} size={15} color={cfg.color} />
        <Text style={[styles.photoResultVerdict, { color: cfg.color }]}>{cfg.label}</Text>
        <Text style={styles.photoResultAI}>AI Photo Check</Text>
      </View>
      <Text style={styles.photoResultSummary}>{result.summary}</Text>
      {result.details.length > 0 && (
        <View style={styles.photoResultDetails}>
          {result.details.map((d, i) => (
            <View key={i} style={styles.photoResultDetailRow}>
              <View style={[styles.detailDot, { backgroundColor: cfg.color }]} />
              <Text style={styles.photoResultDetailText}>{d}</Text>
            </View>
          ))}
        </View>
      )}
      {result.maintenanceSuggestions.length > 0 && (
        <View style={styles.maintenanceBox}>
          <View style={styles.maintenanceHeader}>
            <Ionicons name="construct-outline" size={12} color="#38bdf8" />
            <Text style={styles.maintenanceTitle}>Maintenance Suggestions</Text>
          </View>
          {result.maintenanceSuggestions.map((suggestion, i) => (
            <View key={i} style={styles.maintenanceRow}>
              <Ionicons name="chevron-forward" size={11} color="#38bdf8" />
              <Text style={styles.maintenanceText}>{suggestion}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Scan camera modal ────────────────────────────────────────────────────────

interface ScanCameraModalProps {
  part: typeof SCAN_PARTS[0];
  onClose: () => void;
  onResult: (result: InspectionResult) => void;
}

function ScanCameraModal({ part, onClose, onResult }: ScanCameraModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [analyzing, setAnalyzing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const analyzeImageUri = async (imageUri: string) => {
    setAnalyzing(true);
    try {
      const { savedUri, base64 } = await preprocessImage(
        imageUri,
        `ppi_${part.id}_${Date.now()}.jpg`,
      );

      const apiKey =
        (Constants.expoConfig?.extra?.anthropicApiKey as string | undefined)
        ?? process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

      if (!apiKey) {
        Alert.alert('API Key Missing', 'Set EXPO_PUBLIC_ANTHROPIC_API_KEY in your .env file.');
        setAnalyzing(false);
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

  const handleCapture = async () => {
    if (!cameraRef.current || analyzing) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo?.uri) throw new Error('Failed to capture photo.');
      await analyzeImageUri(photo.uri);
    } catch (err) {
      Alert.alert('Capture Failed', err instanceof Error ? err.message : String(err));
    }
  };

  const handlePickImage = async () => {
    if (analyzing) return;

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Photo Access Needed', 'Allow photo library access to upload an existing vehicle photo.');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: false,
    });

    if (pickerResult.canceled || !pickerResult.assets[0]?.uri) return;
    await analyzeImageUri(pickerResult.assets[0].uri);
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
        <CameraView ref={cameraRef} style={styles.cameraFull} facing="back">
          <View style={styles.cameraTopBar}>
            <TouchableOpacity style={styles.cameraCloseBtn} onPress={onClose} disabled={analyzing}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.cameraCheckTitle}>{part.label} Scan</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Overlay frame */}
          <View style={styles.scanOverlayContainer}>
            <View style={styles.scanOverlayFrame}>
              <View style={styles.targetBadge}>
                <Text style={styles.targetBadgeText}>Place {getScanTarget(part)} here</Text>
              </View>
              <View style={[styles.scanCorner, styles.cornerTL]} />
              <View style={[styles.scanCorner, styles.cornerTR]} />
              <View style={[styles.scanCorner, styles.cornerBL]} />
              <View style={[styles.scanCorner, styles.cornerBR]} />
            </View>
          </View>

          <View style={styles.cameraBottomBar}>
            <Text style={styles.cameraHint}>{part.hint}</Text>
            {analyzing ? (
              <View style={styles.cameraAnalyzing}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.cameraAnalyzingText}>Analyzing with AI...</Text>
              </View>
            ) : (
              <View style={styles.cameraControls}>
                <TouchableOpacity style={styles.uploadBtn} onPress={handlePickImage}>
                  <Ionicons name="image-outline" size={22} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
                  <View style={styles.captureBtnInner} />
                </TouchableOpacity>
                <View style={styles.captureSpacer} />
              </View>
            )}
          </View>
        </CameraView>
      )}
    </View>
  );
}

// ─── Inline scan result card ──────────────────────────────────────────────────

function InlineScanResult({
  part,
  result,
  onRescan,
}: {
  part: typeof SCAN_PARTS[0];
  result: InspectionResult;
  onRescan: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const tint = SEVERITY_TINTS[result.overallSeverity];

  return (
    <View style={[styles.scanResult, { backgroundColor: tint.bg, borderColor: tint.border }]}>
      <TouchableOpacity style={styles.scanResultHeader} onPress={() => setExpanded((v) => !v)}>
        <Ionicons name={part.icon as any} size={16} color={tint.accent} />
        <Text style={styles.scanResultPart}>{part.label}</Text>
        <SeverityBadge severity={result.overallSeverity} size="sm" />
        <TouchableOpacity onPress={onRescan} style={styles.rescanBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="camera-outline" size={13} color="#3b82f6" />
          <Text style={styles.rescanBtnText}>Rescan</Text>
        </TouchableOpacity>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color="#555" />
      </TouchableOpacity>

      {expanded && (
        <>
          <Text style={styles.scanResultSummary}>{result.summary}</Text>

          {result.damages.length === 0 ? (
            <View style={styles.scanNoDamage}>
              <Ionicons name="checkmark-circle" size={15} color="#4ade80" />
              <Text style={styles.scanNoDamageText}>No damage detected</Text>
            </View>
          ) : (
            result.damages.map((d, i) => (
              <View key={i} style={styles.scanDamageRow}>
                <View style={styles.scanDamageLeft}>
                  <Text style={styles.scanDamageType}>
                    {d.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Text>
                  <Text style={styles.scanDamageLoc}>{d.location}</Text>
                  <Text style={styles.scanDamageDesc}>{d.description}</Text>
                </View>
                <View style={[styles.scanSeverityPill, { backgroundColor: SEVERITY_COLORS[d.severity] + '22', borderColor: SEVERITY_COLORS[d.severity] + '66' }]}>
                  <Text style={[styles.scanSeverityText, { color: SEVERITY_COLORS[d.severity] }]}>
                    {d.severity}
                  </Text>
                </View>
              </View>
            ))
          )}

          {result.recommendations.length > 0 && (
            <View style={styles.scanRecs}>
              {result.recommendations.map((rec, i) => (
                <View key={i} style={styles.scanRecRow}>
                  <Ionicons name="alert-circle-outline" size={12} color="#f59e0b" />
                  <Text style={styles.scanRecText}>{rec}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

// ─── Scan tab ─────────────────────────────────────────────────────────────────

function ScanTab() {
  const [scanResults, setScanResults] = useState<Partial<Record<VehiclePart, InspectionResult>>>({});
  const [activePart, setActivePart] = useState<typeof SCAN_PARTS[0] | null>(null);

  const scannedCount = Object.keys(scanResults).length;
  const problemCount = Object.values(scanResults).filter(
    (r) => r && (r.overallSeverity === 'moderate' || r.overallSeverity === 'severe')
  ).length;

  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
        {/* Summary bar */}
        <View style={styles.scanSummaryRow}>
          <Text style={styles.scanSummaryText}>{scannedCount}/{SCAN_PARTS.length} areas scanned</Text>
          {problemCount > 0 && (
            <View style={styles.failBadge}>
              <Ionicons name="warning" size={12} color="#ef4444" />
              <Text style={styles.failBadgeText}>{problemCount} concern{problemCount > 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>

        {/* Part grid */}
        <View style={styles.scanGrid}>
          {SCAN_PARTS.map((part) => {
            const result = scanResults[part.id];
            return (
              <TouchableOpacity
                key={part.id}
                style={[styles.scanPartCard, result && { borderColor: SEVERITY_COLORS[result.overallSeverity] + '55' }]}
                onPress={() => setActivePart(part)}
                activeOpacity={0.75}
              >
                <Ionicons name={part.icon as any} size={22} color={result ? SEVERITY_COLORS[result.overallSeverity] : '#3b82f6'} />
                <Text style={styles.scanPartLabel}>{part.label}</Text>
                {result ? (
                  <SeverityBadge severity={result.overallSeverity} size="sm" />
                ) : (
                  <Text style={styles.scanPartHint}>Tap to scan</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Inline results */}
        {SCAN_PARTS.filter((p) => scanResults[p.id]).map((part) => (
          <InlineScanResult
            key={part.id}
            part={part}
            result={scanResults[part.id]!}
            onRescan={() => setActivePart(part)}
          />
        ))}

        {scannedCount === 0 && (
          <View style={styles.emptyHint}>
            <Ionicons name="camera-outline" size={40} color="#222" />
            <Text style={styles.emptyHintText}>Tap any area above to start the AI scan</Text>
          </View>
        )}
      </ScrollView>

      {activePart && (
        <Modal visible animationType="slide" onRequestClose={() => setActivePart(null)}>
          <ScanCameraModal
            part={activePart}
            onClose={() => setActivePart(null)}
            onResult={(result) => {
              setScanResults((prev) => ({ ...prev, [activePart.id]: result }));
              setActivePart(null);
            }}
          />
        </Modal>
      )}
    </>
  );
}

// ─── Checklist tab ────────────────────────────────────────────────────────────

function ChecklistTab() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['engine']));
  const [statuses, setStatuses] = useState<Record<string, CheckStatus>>({});
  const [photoAnalyses, setPhotoAnalyses] = useState<Record<string, CheckItemAnalysis>>({});
  const [cameraCheck, setCameraCheck] = useState<{ id: string; title: string } | null>(null);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const setStatus = (checkId: string, status: CheckStatus) =>
    setStatuses((prev) => ({
      ...prev,
      [checkId]: prev[checkId] === status ? null : status,
    }));

  const total  = INSPECTION_SYSTEMS.reduce((n, s) => n + s.checks.length, 0);
  const passed = Object.values(statuses).filter((s) => s === 'pass').length;
  const failed = Object.values(statuses).filter((s) => s === 'fail').length;
  const done   = passed + failed;

  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
        {/* Progress summary */}
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>{done}/{total} checked</Text>
          {failed > 0 && (
            <View style={styles.failBadge}>
              <Ionicons name="warning" size={12} color="#ef4444" />
              <Text style={styles.failBadgeText}>{failed} flagged</Text>
            </View>
          )}
        </View>

        {INSPECTION_SYSTEMS.map((system) => {
          const isOpen = expanded.has(system.id);
          const systemFailed = system.checks.filter((c) => statuses[c.id] === 'fail').length;

          return (
            <View key={system.id} style={styles.systemCard}>
              <TouchableOpacity style={styles.systemHeader} onPress={() => toggle(system.id)}>
                <Ionicons name={system.icon as any} size={18} color="#3b82f6" />
                <Text style={styles.systemLabel}>{system.label}</Text>
                {systemFailed > 0 && (
                  <View style={styles.systemFailBadge}>
                    <Text style={styles.systemFailText}>{systemFailed}</Text>
                  </View>
                )}
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#555"
                  style={{ marginLeft: 'auto' }}
                />
              </TouchableOpacity>

              {isOpen && system.checks.map((check) => {
                const st = statuses[check.id];
                const photoResult = photoAnalyses[check.id];
                return (
                  <View key={check.id} style={styles.checkItem}>
                    <View style={styles.checkTitleRow}>
                      <Text style={styles.checkTitle}>{check.title}</Text>
                      <View style={styles.checkBtns}>
                        <TouchableOpacity
                          style={[styles.checkBtn, st === 'pass' && styles.checkBtnPass]}
                          onPress={() => setStatus(check.id, 'pass')}
                        >
                          <Ionicons name="checkmark" size={14} color={st === 'pass' ? '#fff' : '#555'} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.checkBtn, st === 'fail' && styles.checkBtnFail]}
                          onPress={() => setStatus(check.id, 'fail')}
                        >
                          <Ionicons name="close" size={14} color={st === 'fail' ? '#fff' : '#555'} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={styles.checkHow}>{check.how}</Text>

                    <View style={styles.redFlagList}>
                      {check.redFlags.map((flag, i) => (
                        <View key={i} style={styles.redFlagRow}>
                          <Ionicons name="alert-circle" size={12} color="#ef4444" />
                          <Text style={styles.redFlagText}>{flag}</Text>
                        </View>
                      ))}
                    </View>

                    {check.tip && (
                      <View style={styles.tipBox}>
                        <Ionicons name="bulb-outline" size={12} color="#f59e0b" />
                        <Text style={styles.tipText}>{check.tip}</Text>
                      </View>
                    )}

                    {check.maintenanceSuggestions && (
                      <View style={styles.maintenanceChecklistBox}>
                        <View style={styles.maintenanceHeader}>
                          <Ionicons name="construct-outline" size={12} color="#38bdf8" />
                          <Text style={styles.maintenanceTitle}>Maintenance Suggestions</Text>
                        </View>
                        {check.maintenanceSuggestions.map((suggestion, i) => (
                          <View key={i} style={styles.maintenanceRow}>
                            <Ionicons name="chevron-forward" size={11} color="#38bdf8" />
                            <Text style={styles.maintenanceText}>{suggestion}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Photo analysis */}
                    <TouchableOpacity
                      style={styles.photoBtn}
                      onPress={() => setCameraCheck({ id: check.id, title: check.title })}
                    >
                      <Ionicons name="camera-outline" size={14} color="#3b82f6" />
                      <Text style={styles.photoBtnText}>
                        {photoResult ? 'Re-analyze Photo' : 'Analyze with Camera'}
                      </Text>
                    </TouchableOpacity>

                    {photoResult && <PhotoResultCard result={photoResult} />}
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      {/* Camera modal */}
      {cameraCheck && (
        <Modal
          visible
          animationType="slide"
          onRequestClose={() => setCameraCheck(null)}
        >
          <CameraModal
            checkId={cameraCheck.id}
            checkTitle={cameraCheck.title}
            onClose={() => setCameraCheck(null)}
            onResult={(result) => {
              setPhotoAnalyses((prev) => ({ ...prev, [cameraCheck.id]: result }));
            }}
          />
        </Modal>
      )}
    </>
  );
}

// ─── Model Issues tab ─────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<IssueSeverity, string> = {
  low:    '#22c55e',
  medium: '#f59e0b',
  high:   '#ef4444',
};

function ModelIssuesTab() {
  const [selectedMake, setSelectedMake] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const models = selectedMake ? getModelsForMake(selectedMake) : [];
  const issues = selectedMake && selectedModel
    ? getIssuesForModel(selectedMake, selectedModel)
    : null;

  const selectMake = (make: string) => {
    setSelectedMake((prev) => (prev === make ? null : make));
    setSelectedModel(null);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
      <Text style={styles.sectionLabel}>Select Make</Text>
      <View style={styles.pillWrap}>
        {ALL_MAKES.map((make) => (
          <TouchableOpacity
            key={make}
            style={[styles.pill, selectedMake === make && styles.pillActive]}
            onPress={() => selectMake(make)}
          >
            <Text style={[styles.pillText, selectedMake === make && styles.pillTextActive]}>
              {make}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {selectedMake && (
        <>
          <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Select Model</Text>
          <View style={styles.pillWrap}>
            {models.map((model) => (
              <TouchableOpacity
                key={model}
                style={[styles.pill, selectedModel === model && styles.pillActive]}
                onPress={() => setSelectedModel((prev) => (prev === model ? null : model))}
              >
                <Text style={[styles.pillText, selectedModel === model && styles.pillTextActive]}>
                  {model}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {issues && (
        <View style={{ marginTop: 20 }}>
          <Text style={styles.issuesHeading}>
            {issues.issues.length} known issue{issues.issues.length !== 1 ? 's' : ''} — {issues.make} {issues.model}
          </Text>
          {issues.issues.map((issue, i) => (
            <View key={i} style={styles.issueCard}>
              <View style={styles.issueHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.issueTitle}>{issue.title}</Text>
                  <Text style={styles.issueSystem}>{issue.system} · {issue.yearsAffected}</Text>
                </View>
                <View style={[styles.severityBadge, { backgroundColor: SEVERITY_COLOR[issue.severity] + '22', borderColor: SEVERITY_COLOR[issue.severity] + '55' }]}>
                  <Text style={[styles.severityText, { color: SEVERITY_COLOR[issue.severity] }]}>
                    {issue.severity.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.issueDesc}>{issue.description}</Text>
              <View style={styles.whatToCheckBox}>
                <Ionicons name="search-outline" size={13} color="#3b82f6" />
                <Text style={styles.whatToCheckText}>{issue.whatToCheck}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {selectedMake && !selectedModel && (
        <View style={styles.emptyHint}>
          <Text style={styles.emptyHintText}>Select a model to see known issues.</Text>
        </View>
      )}

      {!selectedMake && (
        <View style={styles.emptyHint}>
          <Text style={styles.emptyHintText}>Select a make to get started.</Text>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Buyer Tips tab ────────────────────────────────────────────────────────────

const TIPS_SECTIONS = [
  {
    title: 'Complete Buying Process (CL / FB Marketplace)',
    icon: 'list-outline',
    color: '#3b82f6',
    items: [
      '1. Get the VIN before you go anywhere — run it free at vehiclehistory.gov (NMVTIS) and nhtsa.gov/recalls.',
      '2. Check the market value so you know your ceiling — use this app\'s Sell estimator on the same year/make/model for a private-party reference.',
      '3. Message the seller: ask why selling, request extra photos of the underbody and engine bay if not shown.',
      '4. Schedule the meeting — daytime only, bank or DMV parking lot, bring a friend.',
      '5. Do the AI Scan (this app\'s Scan tab) on all 6 areas before handing over any money.',
      '6. Test drive at least 15 minutes: cold start, city stop-and-go, highway, hard braking, sharp turns.',
      '7. OBD2 scan for stored and pending fault codes — a $15 Bluetooth ELM327 from Amazon does this.',
      '8. Negotiate based on findings: every flagged issue is a legitimate ask for a lower price.',
      '9. Verify the title is in the SELLER\'S name — not a third party\'s. A third-party seller may not have legal authority to sell.',
      '10. Confirm no lien: ask "Is there a loan on this vehicle?" — if yes, the lender\'s name is on the title. The loan must be paid off at or before the sale, or you take on their debt.',
      '11. Pay safely: cash, cashier\'s check, or Zelle/Venmo. Never personal checks, money orders from strangers, or wire transfers.',
      '12. Write a bill of sale: VIN, sale price, date, "sold as-is", both printed names and signatures. Two copies.',
      '13. Get insurance on the car BEFORE you drive it away — the moment you take possession, you\'re liable.',
      '14. Complete the title transfer at the DMV within your state\'s deadline (usually 10–30 days).',
    ],
  },
  {
    title: 'Title Types & What They Mean',
    icon: 'document-text-outline',
    color: '#a855f7',
    items: [
      '✅ CLEAN TITLE — No major incidents on record. Standard ownership. What you want. Still run a history report; "clean" just means no insurance event, not no accidents.',
      '⚠️ SALVAGE TITLE — Insurer declared the car a total loss (damage ≥ 70–80% of value, or theft recovery). Cannot be legally driven until repaired and re-inspected. Major value hit. Avoid unless you know exactly what you\'re doing.',
      '🔧 REBUILT / RECONSTRUCTED TITLE — Previously salvage, then repaired and passed a state safety inspection. Legal to drive and insure, but worth 20–40% less than a comparable clean-title car. Always get an independent pre-purchase inspection.',
      '🍋 LEMON LAW BUYBACK — Manufacturer was required by law to repurchase the vehicle after repeated unfixable defects. The underlying issue that triggered the buyback may still exist. Must be disclosed by law in most states.',
      '🌊 FLOOD / WATER DAMAGE TITLE — Some states brand titles after significant water exposure. Electrical gremlins, mold, and corrosion often surface months after purchase. Walk away unless the price is rock-bottom and you accept the risk.',
      '🗑️ JUNK / DISMANTLED TITLE — State has deemed the vehicle unfit for road use. Cannot be registered. Parts-only car. If someone is trying to sell you a road-ready car with this title, that\'s fraud.',
      '🔒 BONDED TITLE — Owner lost or couldn\'t produce the original title and obtained a surety bond as a workaround. Legal but carries extra risk; the previous owner could contest ownership within the bond period.',
      '💀 CERTIFICATE OF DESTRUCTION — Issued when a vehicle is so severely damaged it can NEVER be titled for road use again. No exceptions. Useful only as a parts donor.',
      'BILL OF SALE ONLY — Seller can\'t produce a title at all. This is a major red flag in most states; without a title you may be unable to register the vehicle. Do not buy without a plan to obtain a replacement title.',
    ],
  },
  {
    title: 'DMV Title Transfer — Step by Step',
    icon: 'business-outline',
    color: '#22c55e',
    items: [
      'BEFORE you leave the seller: Seller signs the back of the title in the "seller\'s signature" field. Do NOT let them sign in advance of a sale — a pre-signed title is a red flag.',
      'Odometer disclosure: Federal law requires written odometer disclosure for vehicles under 10 years old. Most titles have a built-in section; fill it in with both signatures.',
      'Bill of sale: Bring it even if your DMV doesn\'t require one — it\'s your proof of purchase price for sales tax calculation and protects you in disputes.',
      'What to bring to the DMV: signed title, bill of sale, your driver\'s license, proof of insurance, and payment for fees and taxes.',
      'Sales tax: Most states charge sales tax on the purchase price. Private-party rates are sometimes lower than dealership rates — check your state\'s DMV site.',
      'Smog / emissions: Some states (CA, TX, NY, etc.) require a passing smog certificate before you can transfer registration. Confirm with your state DMV before the sale.',
      'Temporary operating permit: If your tags are expired and you need to drive to the DMV, many states issue a TRP — ask your DMV if you can get one before the sale date.',
      'Lien release: If the seller had a car loan, they need a lien release letter from their bank BEFORE they can legally sign over a clean title. Get this in writing before handing over money.',
      'Deadline: Most states give you 10–30 days to complete the transfer. Missing it can result in fines. Don\'t wait.',
      'Out-of-state purchase: If buying from another state, you\'ll need to title it in your home state. You may also need a VIN verification and/or passing inspection in your state first.',
      'After the DMV: Keep the old title, bill of sale, and your new registration together in a safe place. Consider taking a photo of all documents.',
    ],
  },
  {
    title: 'FB Marketplace & Private Seller Red Flags',
    icon: 'warning-outline',
    color: '#ef4444',
    items: [
      'Refuses to meet at a mechanic or inspection shop',
      '"As-is, no test drive" listing',
      'Price significantly below market value with urgency to sell',
      'Won\'t provide the VIN until you arrive',
      'Account with no selling history, stock photos, or vague description',
      '"Cash only, meet at [unusual location]" — common scam pattern',
      '"I\'m moving" or "military deployment" stories to create urgency',
      'Title is "salvage" or "rebuilt" — not always disclosed upfront',
      'Refuses to show service records',
      'Wants to do the transaction through an escrow-style third party you\'ve never heard of',
    ],
  },
  {
    title: 'ECU & Software Override Signs',
    icon: 'code-slash-outline',
    color: '#f59e0b',
    items: [
      'Device plugged into the OBD2 port (Cobb Accessport, HP Tuners dongle, etc.)',
      'Pop-and-crackle exhaust on deceleration — stock cars don\'t do this',
      'Aftermarket intake or exhaust combined with "stock" performance claims',
      'Boost gauge reading above factory spec on turbocharged engines',
      '3+ incomplete OBD readiness monitors after supposedly normal driving',
      'ECU calibration date in scanner newer than build date',
      'Throttle response unusually sharp or shift behavior too aggressive for stock',
      'Airbag module shows "deployed and reset" in OBD data — crash history',
    ],
  },
  {
    title: 'Odometer Rollback Tells',
    icon: 'speedometer-outline',
    color: '#a855f7',
    items: [
      'Steering wheel grip is shiny or worn through — inconsistent with claimed low mileage',
      'Pedal rubber is smooth and rounded instead of having texture ridges',
      'Driver seat bolster heavily sagged or reupholstered on a "60k mile" car',
      'Door jamb oil change sticker or inspection sticker shows higher mileage',
      'Service records show mileage higher than the odometer at any point',
      'Odometer digits are misaligned or show a different font than factory spec',
      'Run vehiclehistory.gov (free) or CarFax/AutoCheck before meeting',
    ],
  },
  {
    title: 'Questions to Ask the Seller',
    icon: 'chatbubble-outline',
    color: '#3b82f6',
    items: [
      '"Why are you selling?" — vague or evasive answers are notable',
      '"Has it been in any accidents?" — cross-check with CarFax',
      '"Can I take it to my mechanic for a pre-purchase inspection?" — refusal is a major red flag',
      '"Do you have service records?" — push for them, not just verbal history',
      '"Is there a lien on the vehicle?" — lien means the bank can repossess it even after you buy',
      '"What is the exact VIN?" — look it up before you go',
      '"Has the timing belt / chain ever been replaced?" (on applicable engines)',
      '"Have there been any recalls on this vehicle?"',
    ],
  },
  {
    title: 'Free Tools to Use Before You Meet',
    icon: 'phone-portrait-outline',
    color: '#22c55e',
    items: [
      'vehiclehistory.gov — free NMVTIS report (title history, odometer, theft)',
      'nhtsa.gov/recalls — NHTSA recall lookup by VIN (free)',
      'CarFax or AutoCheck — paid but comprehensive accident and ownership history',
      'ELM327 Bluetooth OBD2 adapter + Torque / Car Scanner app — read live codes on-site',
      'Google "[Make] [Model] [Year] common problems" — takes 5 minutes and can save thousands',
      'Check local Facebook groups for the specific make/model — owners often document issues',
    ],
  },
];

function BuyerTipsTab() {
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));

  const toggle = (i: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
      {TIPS_SECTIONS.map((section, i) => {
        const isOpen = expanded.has(i);
        return (
          <View key={i} style={[styles.systemCard, { borderLeftColor: section.color, borderLeftWidth: 3 }]}>
            <TouchableOpacity style={styles.systemHeader} onPress={() => toggle(i)}>
              <Ionicons name={section.icon as any} size={18} color={section.color} />
              <Text style={styles.systemLabel}>{section.title}</Text>
              <Ionicons
                name={isOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#555"
                style={{ marginLeft: 'auto' }}
              />
            </TouchableOpacity>
            {isOpen && (
              <View style={styles.tipsList}>
                {section.items.map((item, j) => (
                  <View key={j} style={styles.tipsRow}>
                    <Ionicons name="chevron-forward" size={13} color={section.color} />
                    <Text style={styles.tipsItem}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: 'scan',      label: 'AI Scan'      },
  { id: 'checklist', label: 'Checklist'    },
  { id: 'models',    label: 'Model Issues' },
  { id: 'tips',      label: 'Buyer Tips'   },
];

export default function BuyerCheckScreen() {
  const [tab, setTab] = useState<Tab>('scan');

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {TABS.map(({ id, label }) => (
          <TouchableOpacity
            key={id}
            style={[styles.tabBtn, tab === id && styles.tabBtnActive]}
            onPress={() => setTab(id)}
          >
            <Text style={[styles.tabBtnText, tab === id && styles.tabBtnTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {tab === 'scan'      && <ScanTab />}
      {tab === 'checklist' && <ChecklistTab />}
      {tab === 'models'    && <ModelIssuesTab />}
      {tab === 'tips'      && <BuyerTipsTab />}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    backgroundColor: '#0f0f0f',
    flexGrow: 0,
  },
  tabBarContent: {
    flexDirection: 'row',
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  tabBtnTextActive: {
    color: '#3b82f6',
  },
  tabContent: {
    padding: 16,
    paddingBottom: 48,
  },
  // Checklist
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  progressText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  failBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2d0a0a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#5a1a1a',
  },
  failBadgeText: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '600',
  },
  systemCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  systemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  systemLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  systemFailBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  systemFailText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  checkItem: {
    padding: 14,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#222',
    gap: 8,
  },
  checkTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 12,
  },
  checkTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ddd',
    flex: 1,
  },
  checkBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  checkBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBtnPass: {
    backgroundColor: '#14532d',
    borderColor: '#166534',
  },
  checkBtnFail: {
    backgroundColor: '#7f1d1d',
    borderColor: '#991b1b',
  },
  checkHow: {
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
  },
  redFlagList: {
    gap: 5,
  },
  redFlagRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  redFlagText: {
    flex: 1,
    fontSize: 12,
    color: '#cc4444',
    lineHeight: 16,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#1a1500',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: '#3a2a00',
  },
  tipText: {
    flex: 1,
    fontSize: 11,
    color: '#c4a000',
    lineHeight: 16,
  },
  // Photo button
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#0d1f33',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#1a3a5a',
  },
  photoBtnText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
  },
  // Photo result card
  photoResult: {
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    gap: 6,
  },
  photoResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  photoResultVerdict: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  photoResultAI: {
    fontSize: 10,
    color: '#444',
    fontWeight: '500',
  },
  photoResultSummary: {
    fontSize: 12,
    color: '#ccc',
    lineHeight: 17,
  },
  photoResultDetails: {
    gap: 4,
    marginTop: 2,
  },
  photoResultDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },
  detailDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 6,
    flexShrink: 0,
  },
  photoResultDetailText: {
    flex: 1,
    fontSize: 11,
    color: '#999',
    lineHeight: 16,
  },
  maintenanceBox: {
    backgroundColor: '#07131f',
    borderRadius: 8,
    padding: 9,
    borderWidth: 1,
    borderColor: '#12304a',
    gap: 5,
    marginTop: 2,
  },
  maintenanceChecklistBox: {
    backgroundColor: '#07131f',
    borderRadius: 8,
    padding: 9,
    borderWidth: 1,
    borderColor: '#12304a',
    gap: 5,
  },
  maintenanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  maintenanceTitle: {
    fontSize: 10,
    color: '#38bdf8',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  maintenanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  maintenanceText: {
    flex: 1,
    fontSize: 11,
    color: '#9ac7e8',
    lineHeight: 16,
  },
  // Camera modal
  cameraModal: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraCentered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  cameraPermText: {
    color: '#aaa',
    fontSize: 15,
    textAlign: 'center',
  },
  cameraGrantBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  cameraGrantBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  cameraFull: {
    flex: 1,
  },
  cameraTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cameraCloseBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraCheckTitle: {
    flex: 1,
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
  },
  cameraBottomBar: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingBottom: 60,
    paddingTop: 20,
    paddingHorizontal: 24,
    gap: 20,
  },
  cameraHint: {
    color: '#ccc',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  cameraControls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 24,
    height: 80,
    justifyContent: 'center',
  },
  cameraAnalyzing: {
    alignItems: 'center',
    height: 80,
    justifyContent: 'center',
    gap: 10,
  },
  cameraAnalyzingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  uploadBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureSpacer: {
    width: 48,
    height: 48,
  },
  // Model issues
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: '#111',
  },
  pillActive: {
    backgroundColor: '#1e3a5f',
    borderColor: '#3b82f6',
  },
  pillText: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#fff',
  },
  issuesHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  issueCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 8,
  },
  issueHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  issueTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  issueSystem: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  issueDesc: {
    fontSize: 12,
    color: '#aaa',
    lineHeight: 18,
  },
  whatToCheckBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    backgroundColor: '#0d1f33',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1a3a5a',
  },
  whatToCheckText: {
    flex: 1,
    fontSize: 12,
    color: '#7ab3e0',
    lineHeight: 17,
  },
  emptyHint: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyHintText: {
    fontSize: 14,
    color: '#444',
  },
  // Tips
  tipsList: {
    padding: 14,
    paddingTop: 4,
    gap: 8,
  },
  tipsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },
  tipsItem: {
    flex: 1,
    fontSize: 13,
    color: '#bbb',
    lineHeight: 18,
  },
  // Scan overlay
  scanOverlayContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanOverlayFrame: {
    width: '85%',
    aspectRatio: 4 / 3,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetBadge: {
    maxWidth: '84%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(59,130,246,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.75)',
  },
  targetBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  scanCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#3b82f6',
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  // Scan tab
  scanSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  scanSummaryText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  scanGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  scanPartCard: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 6,
    alignItems: 'flex-start',
  },
  scanPartLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  scanPartHint: {
    fontSize: 10,
    color: '#555',
  },
  // Scan result card
  scanResult: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 10,
    gap: 8,
  },
  scanResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanResultPart: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0d1f33',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1a3a5a',
  },
  rescanBtnText: {
    fontSize: 11,
    color: '#3b82f6',
    fontWeight: '600',
  },
  scanResultSummary: {
    fontSize: 12,
    color: '#aaa',
    lineHeight: 17,
  },
  scanNoDamage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  scanNoDamageText: {
    fontSize: 12,
    color: '#4ade80',
    fontWeight: '600',
  },
  scanDamageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  scanDamageLeft: {
    flex: 1,
    gap: 2,
  },
  scanDamageType: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ddd',
  },
  scanDamageLoc: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  scanDamageDesc: {
    fontSize: 11,
    color: '#999',
    lineHeight: 15,
  },
  scanSeverityPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  scanSeverityText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  scanRecs: {
    gap: 5,
    backgroundColor: '#141000',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#2a1e00',
  },
  scanRecRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  scanRecText: {
    flex: 1,
    fontSize: 11,
    color: '#c4a000',
    lineHeight: 15,
  },
});
