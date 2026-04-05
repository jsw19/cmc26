export type Severity = 'none' | 'minor' | 'moderate' | 'severe';

export type VehiclePart =
  | 'underbody'
  | 'front'
  | 'rear'
  | 'driver_side'
  | 'passenger_side'
  | 'roof'
  | 'engine_bay'
  | 'unknown';

export type DamageType =
  | 'rust'
  | 'corrosion'
  | 'structural_damage'
  | 'dent'
  | 'scratch'
  | 'crack'
  | 'leak'
  | 'wear'
  | 'other';

export interface DamageItem {
  type: DamageType;
  location: string;
  severity: Severity;
  confidence: number; // 0–1
  description: string;
}

export interface InspectionResult {
  id: string;
  timestamp: number;
  vehiclePart: VehiclePart;
  imageUri: string;
  damages: DamageItem[];
  overallSeverity: Severity;
  summary: string;
  recommendations: string[];
}

export interface AnalyzeOptions {
  apiKey: string;
  vehiclePart?: VehiclePart;
  /** Max image dimension before compressing. Defaults to 1024. */
  maxImageDimension?: number;
}

export interface AnalyzeError {
  code: 'API_ERROR' | 'PARSE_ERROR' | 'IMAGE_ERROR' | 'AUTH_ERROR';
  message: string;
}
