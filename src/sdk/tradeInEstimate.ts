import type {
  LocationInfo,
  Severity,
  TradeInEstimate,
  VehicleCategory,
  VehicleInfo,
} from './types';

const CURRENT_YEAR = new Date().getFullYear();

// Average new-car MSRP by category (USD)
const BASE_MSRP_USD: Record<VehicleCategory, number> = {
  economy:  22000,
  midsize:  32000,
  suv:      42000,
  truck:    48000,
  luxury:   68000,
  sports:   55000,
  electric: 48000,
};

// Fraction of original MSRP retained after N years (industry-average depreciation curve)
const DEPRECIATION: number[] = [1.00, 0.80, 0.67, 0.57, 0.49, 0.43, 0.38, 0.34, 0.31, 0.28, 0.25];

function depreciationFactor(age: number): number {
  if (age <= 0) return DEPRECIATION[0];
  if (age < DEPRECIATION.length) return DEPRECIATION[age];
  return Math.max(0.08, 0.25 - (age - 10) * 0.02);
}

const CONDITION_MULTIPLIER: Record<Severity, number> = {
  none:     1.00,
  minor:    0.88,
  moderate: 0.70,
  severe:   0.48,
};

const CONDITION_LABELS: Record<Severity, string> = {
  none:     'Excellent',
  minor:    'Good',
  moderate: 'Fair',
  severe:   'Poor',
};

interface MarketConfig {
  currency: string;
  symbol: string;
  /** USD → local-currency market-value factor (incorporates exchange rate + local demand) */
  factor: number;
}

const MARKETS: Record<string, MarketConfig> = {
  'US-NORTHEAST': { currency: 'USD', symbol: '$',    factor: 1.05 },
  'US-WEST':      { currency: 'USD', symbol: '$',    factor: 1.08 },
  'US-SOUTH':     { currency: 'USD', symbol: '$',    factor: 0.95 },
  'US-MIDWEST':   { currency: 'USD', symbol: '$',    factor: 0.93 },
  'US':           { currency: 'USD', symbol: '$',    factor: 1.00 },
  'CA':           { currency: 'CAD', symbol: 'CA$',  factor: 1.15 },
  'GB':           { currency: 'GBP', symbol: '£',    factor: 0.82 },
  'DE':           { currency: 'EUR', symbol: '€',    factor: 0.88 },
  'FR':           { currency: 'EUR', symbol: '€',    factor: 0.85 },
  'NL':           { currency: 'EUR', symbol: '€',    factor: 0.90 },
  'BE':           { currency: 'EUR', symbol: '€',    factor: 0.83 },
  'AT':           { currency: 'EUR', symbol: '€',    factor: 0.85 },
  'CH':           { currency: 'CHF', symbol: 'CHF ', factor: 1.05 },
  'SE':           { currency: 'SEK', symbol: 'kr ',  factor: 9.2  },
  'NO':           { currency: 'NOK', symbol: 'kr ',  factor: 9.8  },
  'DK':           { currency: 'DKK', symbol: 'kr ',  factor: 6.2  },
  'FI':           { currency: 'EUR', symbol: '€',    factor: 0.90 },
  'ES':           { currency: 'EUR', symbol: '€',    factor: 0.75 },
  'IT':           { currency: 'EUR', symbol: '€',    factor: 0.80 },
  'PT':           { currency: 'EUR', symbol: '€',    factor: 0.70 },
  'PL':           { currency: 'PLN', symbol: 'zł ',  factor: 3.0  },
  'AU':           { currency: 'AUD', symbol: 'A$',   factor: 1.55 },
  'NZ':           { currency: 'NZD', symbol: 'NZ$',  factor: 1.70 },
  'JP':           { currency: 'JPY', symbol: '¥',    factor: 120  },
  'KR':           { currency: 'KRW', symbol: '₩',    factor: 1150 },
  'CN':           { currency: 'CNY', symbol: '¥',    factor: 5.8  },
  'SG':           { currency: 'SGD', symbol: 'S$',   factor: 2.00 },
  'IN':           { currency: 'INR', symbol: '₹',    factor: 45   },
  'AE':           { currency: 'AED', symbol: 'AED ', factor: 3.1  },
  'SA':           { currency: 'SAR', symbol: 'SAR ', factor: 2.8  },
  'MX':           { currency: 'MXN', symbol: 'MX$',  factor: 13.0 },
  'BR':           { currency: 'BRL', symbol: 'R$',   factor: 4.2  },
  'ZA':           { currency: 'ZAR', symbol: 'R ',   factor: 15.5 },
  DEFAULT:        { currency: 'USD', symbol: '$',    factor: 1.00 },
};

const US_NORTHEAST = new Set(['New York','New Jersey','Connecticut','Massachusetts','Rhode Island','Vermont','New Hampshire','Maine']);
const US_WEST      = new Set(['California','Oregon','Washington','Hawaii','Alaska']);
const US_SOUTH     = new Set(['Texas','Florida','Georgia','Alabama','Mississippi','South Carolina','North Carolina','Tennessee','Kentucky','West Virginia','Virginia','Louisiana','Arkansas','Oklahoma']);
const US_MIDWEST   = new Set(['Illinois','Ohio','Michigan','Indiana','Wisconsin','Minnesota','Iowa','Missouri','North Dakota','South Dakota','Nebraska','Kansas']);

function getMarketKey(country: string, region?: string): string {
  if (country === 'US' && region) {
    if (US_NORTHEAST.has(region)) return 'US-NORTHEAST';
    if (US_WEST.has(region))      return 'US-WEST';
    if (US_SOUTH.has(region))     return 'US-SOUTH';
    if (US_MIDWEST.has(region))   return 'US-MIDWEST';
    return 'US';
  }
  return MARKETS[country] ? country : 'DEFAULT';
}

/**
 * Estimate trade-in and private-party sale values for a vehicle.
 *
 * Pure function — no network calls or native dependencies.
 * Model: MSRP × depreciation × mileage adjustment × condition × regional market factor.
 */
export function estimateTradeInValue(
  vehicleInfo: VehicleInfo,
  overallSeverity: Severity,
  location: LocationInfo
): TradeInEstimate {
  const { year, make, model, mileage, category } = vehicleInfo;
  const age = Math.max(0, CURRENT_YEAR - year);
  const market = MARKETS[getMarketKey(location.country, location.region)] ?? MARKETS['DEFAULT'];

  const baseUSD    = BASE_MSRP_USD[category];
  const deprFactor = depreciationFactor(age);
  const condFactor = CONDITION_MULTIPLIER[overallSeverity];

  // Mileage: 13,500 miles/yr average; cap adjustment at ±20%
  const avgMileage    = age * 13500;
  const excessMiles   = mileage - avgMileage;
  const mileageFactor = Math.max(0.80, Math.min(1.10, 1 - excessMiles / 150000));

  const marketValueUSD   = baseUSD * deprFactor * condFactor * mileageFactor;
  const localMarketValue = marketValueUSD * market.factor;

  // ±10% spread to express inherent uncertainty
  const mktMin = Math.round(localMarketValue * 0.90);
  const mktMax = Math.round(localMarketValue * 1.10);

  // Dealer trade-in: ~75–82% of private-party value
  const tradeInValue     = { min: Math.round(mktMin * 0.75), max: Math.round(mktMax * 0.82) };
  // Private-party: 90–100% of estimated market
  const privatePartyValue = { min: Math.round(mktMin * 0.90), max: mktMax };

  const factors: string[] = [];
  factors.push(
    age === 0
      ? 'Brand-new vehicle — minimal depreciation applied.'
      : `${age}-year-old ${make} — retains ~${Math.round(deprFactor * 100)}% of original value.`
  );
  if (excessMiles > 10000) {
    factors.push(`Above-average mileage (${mileage.toLocaleString()} mi) reduces value by ~${Math.round((1 - mileageFactor) * 100)}%.`);
  } else if (excessMiles < -10000) {
    factors.push(`Below-average mileage (${mileage.toLocaleString()} mi) adds a small premium.`);
  } else {
    factors.push(`Average mileage (${mileage.toLocaleString()} mi) for vehicle age.`);
  }
  if (overallSeverity !== 'none') {
    factors.push(`${CONDITION_LABELS[overallSeverity]} condition (${overallSeverity} damage detected) reduces value by ~${Math.round((1 - condFactor) * 100)}%.`);
  } else {
    factors.push('Excellent condition — no damage detected, full condition value applied.');
  }
  factors.push(`${location.label} regional market pricing applied.`);

  return {
    vehicleInfo,
    location,
    currency: market.currency,
    currencySymbol: market.symbol,
    tradeInValue,
    privatePartyValue,
    conditionLabel: CONDITION_LABELS[overallSeverity],
    factors,
    disclaimer:
      'Estimates are based on average depreciation models and regional market data. Actual offers depend on local demand, vehicle history, options, and dealer. Always get multiple quotes.',
  };
}
