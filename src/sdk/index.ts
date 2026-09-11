export { analyzeVehicleImageLocally } from './analyzeLocal';
export { decodeVin, isValidVin, normalizeVin } from './decodeVin';
export type { DecodeVinOptions, VinDecodeResult } from './decodeVin';
export { diagnoseProblemLocally } from './diagnoseProblemLocal';
export type {
  AIDiagnosis,
  DiagnoseOptions,
  DiagnoseResult,
  DiagnoseVehicleInfo,
  FixCategory,
  FixDifficulty,
  FixUrgency,
} from './diagnoseProblem';
export { estimateRepairCosts } from './costEstimate';
export { buildInspectionReportHtml, escapeHtml } from './reportHtml';
export { buildSessionReportHtml, sessionProgress } from './sessionReport';
export type { ReportOptions } from './reportHtml';
export { findPreownedCars } from './preownedGuide';
export { estimateSellingPrice } from './sellingPrice';
export { estimateTradeInValue } from './tradeInEstimate';
export type {
  AnalyzeError,
  AnalysisMode,
  AnalyzeLocalOptions,
  CostEstimate,
  DamageItem,
  DamageType,
  ImageQuality,
  ImageQualityLevel,
  InspectionResult,
  InspectionSession,
  VehicleProfile,
  LocationInfo,
  MarketTier,
  PlatformListing,
  PreownedGuideResult,
  RepairCostItem,
  SellingPriceEstimate,
  Severity,
  TradeInEstimate,
  VehicleCategory,
  VehicleInfo,
  VehiclePart,
} from './types';
