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

export type VehicleCategory =
  | 'economy'
  | 'midsize'
  | 'suv'
  | 'truck'
  | 'luxury'
  | 'sports'
  | 'electric';

export interface VehicleInfo {
  year: number;
  make: string;
  model: string;
  mileage: number;
  category: VehicleCategory;
}

export interface PlatformListing {
  platform: 'Facebook Marketplace' | 'Craigslist';
  listingPrice: { min: number; max: number };
  tips: string[];
}

export interface SellingPriceEstimate {
  vehicleInfo: VehicleInfo;
  location: LocationInfo;
  currency: string;
  currencySymbol: string;
  idealSalePrice: { min: number; max: number };
  listingPrice: { min: number; max: number };
  quickSalePrice: { min: number; max: number };
  negotiationBuffer: number;
  conditionLabel: string;
  platforms: PlatformListing[];
  listingTips: string[];
  factors: string[];
  disclaimer: string;
}

export interface TradeInEstimate {
  vehicleInfo: VehicleInfo;
  location: LocationInfo;
  currency: string;
  currencySymbol: string;
  tradeInValue: { min: number; max: number };
  privatePartyValue: { min: number; max: number };
  conditionLabel: string;
  factors: string[];
  disclaimer: string;
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
  costEstimate?: CostEstimate;
  vehicleInfo?: VehicleInfo;
  tradeInEstimate?: TradeInEstimate;
  sellingPriceEstimate?: SellingPriceEstimate;
}

export interface MarketTier {
  category: VehicleCategory;
  categoryLabel: string;
  categoryDescription: string;
  yearRange: { min: number; max: number };
  mileageRange: { min: number; max: number };
  distanceUnit: 'miles' | 'km';
  priceRange: { min: number; max: number };
  currency: string;
  currencySymbol: string;
  expectation: string;
}

export interface PreownedGuideResult {
  location: LocationInfo;
  currency: string;
  currencySymbol: string;
  tiers: MarketTier[];
  disclaimer: string;
}

export interface AnalyzeOptions {
  apiKey: string;
  vehiclePart?: VehiclePart;
  /** Max image dimension before compressing. Defaults to 1024. */
  maxImageDimension?: number;
}

/** Options for on-device local analysis (no API key required). */
export interface AnalyzeLocalOptions {
  vehiclePart?: VehiclePart;
}

export interface AnalyzeError {
  code: 'API_ERROR' | 'PARSE_ERROR' | 'IMAGE_ERROR' | 'AUTH_ERROR';
  message: string;
}

export interface LocationInfo {
  country: string;
  region?: string;
  label: string;
}

export interface RepairCostItem {
  damageType: DamageType;
  severity: Severity;
  description: string;
  minCost: number;
  maxCost: number;
}

export interface CostEstimate {
  location: LocationInfo;
  currency: string;
  currencySymbol: string;
  items: RepairCostItem[];
  totalMin: number;
  totalMax: number;
  disclaimer: string;
}
