import type {
  CostEstimate,
  DamageItem,
  DamageType,
  LocationInfo,
  RepairCostItem,
  Severity,
} from './types';

// Base repair costs in USD (US national average) per [damageType][severity] → [min, max]
const BASE_COSTS_USD: Record<DamageType, Record<Severity, [number, number]>> = {
  rust:              { none: [0,0], minor: [150,350],   moderate: [500,1200],   severe: [1500,4000]  },
  corrosion:         { none: [0,0], minor: [200,500],   moderate: [800,2000],   severe: [2500,6000]  },
  structural_damage: { none: [0,0], minor: [500,1500],  moderate: [2000,5000],  severe: [5000,15000] },
  dent:              { none: [0,0], minor: [100,300],   moderate: [300,800],    severe: [800,2500]   },
  scratch:           { none: [0,0], minor: [50,200],    moderate: [200,600],    severe: [600,1500]   },
  crack:             { none: [0,0], minor: [200,600],   moderate: [600,2000],   severe: [2000,8000]  },
  leak:              { none: [0,0], minor: [150,400],   moderate: [400,1200],   severe: [1200,3500]  },
  wear:              { none: [0,0], minor: [100,300],   moderate: [300,900],    severe: [900,2500]   },
  other:             { none: [0,0], minor: [100,400],   moderate: [400,1500],   severe: [1500,5000]  },
};

interface RegionConfig {
  currency: string;
  symbol: string;
  /** Multiplier applied to USD base → approximate local currency equivalent (incorporates PPP + exchange rate) */
  factor: number;
}

const US_NORTHEAST = new Set([
  'New York', 'New Jersey', 'Connecticut', 'Massachusetts',
  'Rhode Island', 'Vermont', 'New Hampshire', 'Maine',
]);
const US_WEST = new Set(['California', 'Oregon', 'Washington', 'Hawaii', 'Alaska']);
const US_SOUTH = new Set([
  'Texas', 'Florida', 'Georgia', 'Alabama', 'Mississippi',
  'South Carolina', 'North Carolina', 'Tennessee', 'Kentucky',
  'West Virginia', 'Virginia', 'Louisiana', 'Arkansas', 'Oklahoma',
]);
const US_MIDWEST = new Set([
  'Illinois', 'Ohio', 'Michigan', 'Indiana', 'Wisconsin',
  'Minnesota', 'Iowa', 'Missouri', 'North Dakota', 'South Dakota',
  'Nebraska', 'Kansas',
]);

const REGIONS: Record<string, RegionConfig> = {
  'US-NORTHEAST': { currency: 'USD', symbol: '$',    factor: 1.30 },
  'US-WEST':      { currency: 'USD', symbol: '$',    factor: 1.25 },
  'US-SOUTH':     { currency: 'USD', symbol: '$',    factor: 0.82 },
  'US-MIDWEST':   { currency: 'USD', symbol: '$',    factor: 0.88 },
  'US':           { currency: 'USD', symbol: '$',    factor: 0.95 },
  'CA':           { currency: 'CAD', symbol: 'CA$',  factor: 1.20 },
  'GB':           { currency: 'GBP', symbol: '£',    factor: 0.80 },
  'DE':           { currency: 'EUR', symbol: '€',    factor: 0.90 },
  'FR':           { currency: 'EUR', symbol: '€',    factor: 0.88 },
  'NL':           { currency: 'EUR', symbol: '€',    factor: 0.93 },
  'BE':           { currency: 'EUR', symbol: '€',    factor: 0.85 },
  'AT':           { currency: 'EUR', symbol: '€',    factor: 0.88 },
  'CH':           { currency: 'CHF', symbol: 'CHF ', factor: 1.20 },
  'SE':           { currency: 'SEK', symbol: 'kr ',  factor: 9.5  },
  'NO':           { currency: 'NOK', symbol: 'kr ',  factor: 10.0 },
  'DK':           { currency: 'DKK', symbol: 'kr ',  factor: 6.5  },
  'FI':           { currency: 'EUR', symbol: '€',    factor: 0.93 },
  'ES':           { currency: 'EUR', symbol: '€',    factor: 0.72 },
  'IT':           { currency: 'EUR', symbol: '€',    factor: 0.78 },
  'PT':           { currency: 'EUR', symbol: '€',    factor: 0.68 },
  'PL':           { currency: 'PLN', symbol: 'zł ',  factor: 3.2  },
  'AU':           { currency: 'AUD', symbol: 'A$',   factor: 1.50 },
  'NZ':           { currency: 'NZD', symbol: 'NZ$',  factor: 1.65 },
  'JP':           { currency: 'JPY', symbol: '¥',    factor: 130  },
  'KR':           { currency: 'KRW', symbol: '₩',    factor: 1200 },
  'CN':           { currency: 'CNY', symbol: '¥',    factor: 5.5  },
  'SG':           { currency: 'SGD', symbol: 'S$',   factor: 1.30 },
  'IN':           { currency: 'INR', symbol: '₹',    factor: 55   },
  'AE':           { currency: 'AED', symbol: 'AED ', factor: 3.2  },
  'SA':           { currency: 'SAR', symbol: 'SAR ', factor: 3.0  },
  'MX':           { currency: 'MXN', symbol: 'MX$',  factor: 14.0 },
  'BR':           { currency: 'BRL', symbol: 'R$',   factor: 4.5  },
  'ZA':           { currency: 'ZAR', symbol: 'R ',   factor: 16.0 },
  DEFAULT:        { currency: 'USD', symbol: '$',    factor: 1.00 },
};

function getRegionKey(country: string, region?: string): string {
  if (country === 'US' && region) {
    if (US_NORTHEAST.has(region)) return 'US-NORTHEAST';
    if (US_WEST.has(region))      return 'US-WEST';
    if (US_SOUTH.has(region))     return 'US-SOUTH';
    if (US_MIDWEST.has(region))   return 'US-MIDWEST';
    return 'US';
  }
  return REGIONS[country] ? country : 'DEFAULT';
}

/**
 * Compute approximate repair cost ranges for a set of detected damage items,
 * adjusted for the user's geographic region.
 *
 * Pure function — no network calls or native dependencies.
 */
export function estimateRepairCosts(damages: DamageItem[], location: LocationInfo): CostEstimate {
  const regionKey = getRegionKey(location.country, location.region);
  const config = REGIONS[regionKey] ?? REGIONS['DEFAULT'];

  const items: RepairCostItem[] = damages
    .filter((d) => d.severity !== 'none')
    .map((d) => {
      const [baseMin, baseMax] = BASE_COSTS_USD[d.type][d.severity];
      return {
        damageType: d.type,
        severity: d.severity,
        description: d.description,
        minCost: Math.round(baseMin * config.factor),
        maxCost: Math.round(baseMax * config.factor),
      };
    });

  const totalMin = items.reduce((sum, i) => sum + i.minCost, 0);
  const totalMax = items.reduce((sum, i) => sum + i.maxCost, 0);

  return {
    location,
    currency: config.currency,
    currencySymbol: config.symbol,
    items,
    totalMin,
    totalMax,
    disclaimer:
      'Estimates are approximate regional averages. Get a professional quote before any repair work.',
  };
}
