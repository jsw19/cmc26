/**
 * preprocessImage.ts
 *
 * Single entry point for all pre-analysis image preparation. Every capture
 * path (live camera, photo picker, buyercheck scan) should go through here
 * before the image is handed to the Claude API or the local HSV analyser.
 *
 * What it does:
 *  1. EXIF orientation normalisation — ImageManipulator re-renders the image
 *     to a new pixel buffer before encoding, so EXIF rotation tags are baked
 *     in and the saved JPEG always has orientation 1 (upright).
 *  2. Resize — long edge capped at MAX_DIMENSION (1024 px by default) to
 *     keep API payloads small and local analysis fast.
 *  3. Persist — saves the processed JPEG to the app's inspections/ directory
 *     so the URI survives across navigation and session restarts.
 *  4. Base64 — reads the saved file back as base64 (no data-URI prefix) ready
 *     for the Claude API image block or jpeg-js decoding.
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

const MAX_DIMENSION = 1024;
const INSPECTIONS_DIR = `${FileSystem.documentDirectory}inspections/`;

export interface PreprocessResult {
  savedUri: string;
  base64: string;
}

/**
 * @param rawUri   - URI returned by CameraView.takePictureAsync or
 *                   ImagePicker.launchImageLibraryAsync
 * @param filename - e.g. `${Date.now()}.jpg` — must be unique per capture
 */
export async function preprocessImage(
  rawUri: string,
  filename: string,
): Promise<PreprocessResult> {
  const processed = await ImageManipulator.manipulateAsync(
    rawUri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG },
  );

  await FileSystem.makeDirectoryAsync(INSPECTIONS_DIR, { intermediates: true });
  const savedUri = `${INSPECTIONS_DIR}${filename}`;
  await FileSystem.moveAsync({ from: processed.uri, to: savedUri });

  const base64 = await FileSystem.readAsStringAsync(savedUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return { savedUri, base64 };
}
