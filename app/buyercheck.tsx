import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
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
import { analyzeCheckItem, PHOTO_HINTS } from '../src/sdk/analyzeCheckItem';
import type { CheckItemAnalysis } from '../src/sdk/analyzeCheckItem';
import { INSPECTION_SYSTEMS } from '../src/data/inspectionChecklist';
import { ALL_MAKES, getIssuesForModel, getModelsForMake } from '../src/data/modelIssues';
import type { IssueSeverity } from '../src/data/modelIssues';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'checklist' | 'models' | 'tips';
type CheckStatus = 'pass' | 'fail' | null;

// ─── Camera modal ─────────────────────────────────────────────────────────────

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

      const filename = `check_${checkId}_${Date.now()}.jpg`;
      const savedUri = `${FileSystem.documentDirectory}inspections/${filename}`;
      await FileSystem.makeDirectoryAsync(
        `${FileSystem.documentDirectory}inspections/`,
        { intermediates: true }
      );
      await FileSystem.moveAsync({ from: resized.uri, to: savedUri });

      const base64 = await FileSystem.readAsStringAsync(savedUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

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

          <View style={styles.cameraBottomBar}>
            <Text style={styles.cameraHint}>{hint}</Text>
            {analyzing ? (
              <View style={styles.cameraAnalyzing}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.cameraAnalyzingText}>Analyzing with AI...</Text>
              </View>
            ) : (
              <View style={styles.cameraControls}>
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
    </View>
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
  { id: 'checklist', label: 'Inspect'       },
  { id: 'models',    label: 'Model Issues'  },
  { id: 'tips',      label: 'Buyer Tips'    },
];

export default function BuyerCheckScreen() {
  const [tab, setTab] = useState<Tab>('checklist');

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.tabBar}>
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
      </View>

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
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    backgroundColor: '#0f0f0f',
  },
  tabBtn: {
    flex: 1,
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
});
