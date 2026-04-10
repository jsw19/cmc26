import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
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

const PART_GUIDES: Record<string, { title: string; hint: string }> = {
  underbody: {
    title: 'Underbody Inspection',
    hint: 'Position camera below the vehicle to capture the floor pans, chassis, and exhaust.',
  },
  front: {
    title: 'Front Inspection',
    hint: 'Capture the full front bumper, hood, headlights, and grille.',
  },
  rear: {
    title: 'Rear Inspection',
    hint: 'Capture the rear bumper, trunk lid, and taillights.',
  },
  driver_side: {
    title: 'Driver Side',
    hint: 'Stand back to capture the full driver side panels and doors.',
  },
  passenger_side: {
    title: 'Passenger Side',
    hint: 'Stand back to capture the full passenger side panels and doors.',
  },
  engine_bay: {
    title: 'Engine Bay',
    hint: 'Open the hood fully and capture the engine, fluid reservoirs, and hoses.',
  },
};

const MAX_IMAGE_SIZE = 1024;

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
  };

  const handleCapture = async () => {
    if (!cameraRef.current || analyzing) return;

    try {
      setAnalyzing(true);

      // Capture photo
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo?.uri) throw new Error('Failed to capture photo.');

      // Resize to limit API payload
      const resized = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: MAX_IMAGE_SIZE } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Save to persistent file system
      const filename = `${Date.now()}.jpg`;
      const savedUri = `${FileSystem.documentDirectory}inspections/${filename}`;
      await FileSystem.makeDirectoryAsync(
        `${FileSystem.documentDirectory}inspections/`,
        { intermediates: true }
      );
      await FileSystem.moveAsync({ from: resized.uri, to: savedUri });

      // Read as base64 for API
      const base64 = await FileSystem.readAsStringAsync(savedUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

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
              <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
                <View style={styles.captureBtnInner} />
              </TouchableOpacity>
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
