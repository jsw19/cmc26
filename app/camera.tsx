import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { useInspection } from '../src/context/InspectionContext';
import { analyzeVehicleImage } from '../src/sdk/analyze';
import { analyzeVehicleImageLocally } from '../src/sdk/analyzeLocal';
import type { VehiclePart } from '../src/sdk/types';
import { preprocessImage } from '../src/utils/preprocessImage';

const PART_GUIDES: Record<string, { title: string; hint: string; target: string }> = {
  underbody: {
    title: 'Underbody Inspection',
    hint: 'Position camera below the vehicle to capture the floor pans, chassis, and exhaust.',
    target: 'frame rail',
  },
  front: {
    title: 'Front Inspection',
    hint: 'Capture the full front bumper, hood, headlights, and grille.',
    target: 'front damage area',
  },
  rear: {
    title: 'Rear Inspection',
    hint: 'Capture the rear bumper, trunk lid, and taillights.',
    target: 'rear damage area',
  },
  driver_side: {
    title: 'Driver Side',
    hint: 'Stand back to capture the full driver side panels and doors.',
    target: 'side panel',
  },
  passenger_side: {
    title: 'Passenger Side',
    hint: 'Stand back to capture the full passenger side panels and doors.',
    target: 'side panel',
  },
  engine_bay: {
    title: 'Engine Bay',
    hint: 'Open the hood fully and capture the engine, fluid reservoirs, and hoses.',
    target: 'engine component',
  },
  brakes: {
    title: 'Brake System Check',
    hint: 'Turn the wheel outward, get close through the spokes, and center the brake caliper in the frame with the rotor and pad edge visible.',
    target: 'brake caliper',
  },
};


export default function CameraScreen() {
  const router = useRouter();
  const { vehiclePart = 'unknown' } = useLocalSearchParams<{ vehiclePart: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [analyzing, setAnalyzing] = useState(false);
  const [useLocal, setUseLocal] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const { addResult, setPendingResult } = useInspection();

  const guide = PART_GUIDES[vehiclePart] ?? {
    title: 'Vehicle Inspection',
    hint: 'Position the camera to capture the area you want to inspect.',
    target: 'area of interest',
  };

  const analyzeImageUri = async (imageUri: string) => {
    try {
      setAnalyzing(true);

      const { savedUri, base64 } = await preprocessImage(
        imageUri,
        `${Date.now()}.jpg`,
      );

      let result;
      if (useLocal) {
        result = await analyzeVehicleImageLocally(base64, savedUri, {
          vehiclePart: vehiclePart as VehiclePart,
        });
      } else {
        const apiKey = Constants.expoConfig?.extra?.anthropicApiKey as string | undefined
          ?? process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

        if (!apiKey) {
          Alert.alert('API Key Missing', 'Set EXPO_PUBLIC_ANTHROPIC_API_KEY in your .env file.');
          setAnalyzing(false);
          return;
        }

        result = await analyzeVehicleImage(base64, savedUri, {
          apiKey,
          vehiclePart: vehiclePart as VehiclePart,
        });
      }

      await addResult(result);
      setPendingResult(result);

      router.replace({ pathname: '/analysis', params: { id: result.id } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Analysis Failed', msg);
      setAnalyzing(false);
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current || analyzing) return;

    const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
    if (!photo?.uri) {
      Alert.alert('Capture Failed', 'Failed to capture photo.');
      return;
    }
    await analyzeImageUri(photo.uri);
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

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="camera-outline" size={48} color="#666" />
        <Text style={styles.permText}>Camera access is required for inspections.</Text>
        <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
          <Text style={styles.grantBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => router.back()}
            disabled={analyzing}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.guideTitle}>
            <Text style={styles.guideTitleText}>{guide.title}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Overlay frame */}
        <View style={styles.overlayContainer}>
          <View style={styles.overlayFrame}>
            <View style={styles.targetBadge}>
              <Text style={styles.targetBadgeText}>Place {guide.target} here</Text>
            </View>
            {/* Corner markers */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomBar}>
          <Text style={styles.hint}>{guide.hint}</Text>
          {/* Mode toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, !useLocal && styles.modeBtnActive]}
              onPress={() => setUseLocal(false)}
            >
              <Text style={[styles.modeBtnText, !useLocal && styles.modeBtnTextActive]}>
                AI Scan
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, useLocal && styles.modeBtnActive]}
              onPress={() => setUseLocal(true)}
            >
              <Text style={[styles.modeBtnText, useLocal && styles.modeBtnTextActive]}>
                Local Scan
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.controls}>
            {analyzing ? (
              <View style={styles.analyzingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.analyzingText}>
                  {useLocal ? 'Analysing locally...' : 'Analyzing with AI...'}
                </Text>
              </View>
            ) : (
              <View style={styles.captureRow}>
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
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  permText: {
    color: '#aaa',
    fontSize: 15,
    textAlign: 'center',
  },
  grantBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  grantBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideTitle: {
    flex: 1,
    alignItems: 'center',
  },
  guideTitleText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  overlayContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayFrame: {
    width: '80%',
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
  corner: {
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
  bottomBar: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingBottom: 50,
    paddingTop: 16,
    paddingHorizontal: 24,
    gap: 20,
  },
  hint: {
    color: '#ccc',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  controls: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
  },
  captureRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
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
  analyzingContainer: {
    alignItems: 'center',
    gap: 10,
  },
  analyzingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modeToggle: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 3,
  },
  modeBtn: {
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 17,
  },
  modeBtnActive: {
    backgroundColor: '#3b82f6',
  },
  modeBtnText: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
  },
  modeBtnTextActive: {
    color: '#fff',
  },
});
