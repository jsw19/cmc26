import { analyzeVehicleImageLocally } from './analyzeLocal';
import type { CheckItemAnalysis } from './analyzeCheckItem';
import type { VehiclePart } from './types';

const ENGINE_CHECKS = new Set([
  'oil_leak', 'coolant_water_pump', 'oil_condition', 'belts_hoses',
  'battery', 'engine_mounts', 'power_steering_fluid', 'trans_fluid',
]);
const BRAKE_CHECKS = new Set(['pads_rotors', 'brake_fluid_level', 'brake_lines']);
const UNDERBODY_CHECKS = new Set(['frame_rust', 'exhaust', 'cv_suspension']);
const PANEL_CHECKS = new Set(['paint_match', 'panel_gaps', 'hidden_damage', 'wear_vs_mileage']);

function vehiclePartForCheck(checkId: string): VehiclePart {
  if (ENGINE_CHECKS.has(checkId)) return 'engine_bay';
  if (BRAKE_CHECKS.has(checkId)) return 'brakes';
  if (UNDERBODY_CHECKS.has(checkId)) return 'underbody';
  if (PANEL_CHECKS.has(checkId)) return 'driver_side';
  return 'unknown';
}

export async function analyzeCheckItemLocally(
  base64Image: string,
  savedUri: string,
  checkId: string,
): Promise<CheckItemAnalysis> {
  const result = await analyzeVehicleImageLocally(base64Image, savedUri, {
    vehiclePart: vehiclePartForCheck(checkId),
  });

  const verdict: CheckItemAnalysis['verdict'] = result.requiresRetake
    ? 'concern'
    : result.overallSeverity === 'moderate' || result.overallSeverity === 'severe'
      ? 'problem'
      : result.overallSeverity === 'minor'
        ? 'concern'
        : 'ok';

  return {
    verdict,
    summary: result.summary,
    details: result.damages.map((damage) => `${damage.location}: ${damage.description}`),
    maintenanceSuggestions: result.recommendations,
    imageUri: savedUri,
  };
}
