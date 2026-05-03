import type {
  LocationInfo,
  MarketTier,
  PreownedGuideResult,
  VehicleCategory,
} from './types';

const CURRENT_YEAR = new Date().getFullYear();

// Same depreciation curve as tradeInEstimate
const DEPRECIATION: number[] = [1.00, 0.80, 0.67, 0.57, 0.49, 0.43, 0.38, 0.34, 0.31, 0.28, 0.25];

function depreciationFactor(age: number): number {
  if (age <= 0) return DEPRECIATION[0];
  if (age < DEPRECIATION.length) return DEPRECIATION[age];
  return Math.max(0.06, 0.25 - (age - 10) * 0.02);
}

interface CategoryConfig {
  label: string;
  description: string;
  /** Typical new-car price range for this segment in USD */
  msrpMin: number;
  msrpMax: number;
}

const CATEGORIES: Record<VehicleCategory, CategoryConfig> = {
  economy:  { label: 'Economy / Compact',  description: 'Small sedans and hatchbacks — lowest running costs',   msrpMin: 17000, msrpMax: 25000 },
  midsize:  { label: 'Midsize Sedan',       description: 'Family sedans balancing comfort and practicality',      msrpMin: 24000, msrpMax: 34000 },
  suv:      { label: 'SUV / Crossover',     description: 'Versatile SUVs from compact crossovers to 3-row',      msrpMin: 26000, msrpMax: 52000 },
  truck:    { label: 'Pickup Truck',         description: 'Light-duty to full-size trucks for work and lifestyle', msrpMin: 32000, msrpMax: 55000 },
  luxury:   { label: 'Luxury Car',          description: 'Premium sedans and SUVs — budget opens older models',   msrpMin: 38000, msrpMax: 80000 },
  sports:   { label: 'Sports Car',          description: 'Performance coupes and roadsters',                      msrpMin: 26000, msrpMax: 65000 },
  electric: { label: 'Electric Vehicle',    description: 'Battery-electric cars, low fuel and maintenance costs', msrpMin: 27000, msrpMax: 55000 },
};

interface MarketConfig {
  currency: string;
  symbol: string;
  factor: number;
  distanceUnit: 'miles' | 'km';
}

const MARKETS: Record<string, MarketConfig> = {
  'US-NORTHEAST': { currency: 'USD', symbol: '$',    factor: 1.05, distanceUnit: 'miles' },
  'US-WEST':      { currency: 'USD', symbol: '$',    factor: 1.08, distanceUnit: 'miles' },
  'US-SOUTH':     { currency: 'USD', symbol: '$',    factor: 0.95, distanceUnit: 'miles' },
  'US-MIDWEST':   { currency: 'USD', symbol: '$',    factor: 0.93, distanceUnit: 'miles' },
  'US':           { currency: 'USD', symbol: '$',    factor: 1.00, distanceUnit: 'miles' },
  'CA':           { currency: 'CAD', symbol: 'CA$',  factor: 1.15, distanceUnit: 'km'    },
  'GB':           { currency: 'GBP', symbol: '£',    factor: 0.82, distanceUnit: 'miles' },
  'DE':           { currency: 'EUR', symbol: '€',    factor: 0.88, distanceUnit: 'km'    },
  'FR':           { currency: 'EUR', symbol: '€',    factor: 0.85, distanceUnit: 'km'    },
  'NL':           { currency: 'EUR', symbol: '€',    factor: 0.90, distanceUnit: 'km'    },
  'BE':           { currency: 'EUR', symbol: '€',    factor: 0.83, distanceUnit: 'km'    },
  'AT':           { currency: 'EUR', symbol: '€',    factor: 0.85, distanceUnit: 'km'    },
  'CH':           { currency: 'CHF', symbol: 'CHF ', factor: 1.05, distanceUnit: 'km'    },
  'SE':           { currency: 'SEK', symbol: 'kr ',  factor: 9.2,  distanceUnit: 'km'    },
  'NO':           { currency: 'NOK', symbol: 'kr ',  factor: 9.8,  distanceUnit: 'km'    },
  'DK':           { currency: 'DKK', symbol: 'kr ',  factor: 6.2,  distanceUnit: 'km'    },
  'FI':           { currency: 'EUR', symbol: '€',    factor: 0.90, distanceUnit: 'km'    },
  'ES':           { currency: 'EUR', symbol: '€',    factor: 0.75, distanceUnit: 'km'    },
  'IT':           { currency: 'EUR', symbol: '€',    factor: 0.80, distanceUnit: 'km'    },
  'PT':           { currency: 'EUR', symbol: '€',    factor: 0.70, distanceUnit: 'km'    },
  'PL':           { currency: 'PLN', symbol: 'zł ',  factor: 3.0,  distanceUnit: 'km'    },
  'AU':           { currency: 'AUD', symbol: 'A$',   factor: 1.55, distanceUnit: 'km'    },
  'NZ':           { currency: 'NZD', symbol: 'NZ$',  factor: 1.70, distanceUnit: 'km'    },
  'JP':           { currency: 'JPY', symbol: '¥',    factor: 120,  distanceUnit: 'km'    },
  'KR':           { currency: 'KRW', symbol: '₩',    factor: 1150, distanceUnit: 'km'    },
  'CN':           { currency: 'CNY', symbol: '¥',    factor: 5.8,  distanceUnit: 'km'    },
  'SG':           { currency: 'SGD', symbol: 'S$',   factor: 2.00, distanceUnit: 'km'    },
  'IN':           { currency: 'INR', symbol: '₹',    factor: 45,   distanceUnit: 'km'    },
  'AE':           { currency: 'AED', symbol: 'AED ', factor: 3.1,  distanceUnit: 'km'    },
  'SA':           { currency: 'SAR', symbol: 'SAR ', factor: 2.8,  distanceUnit: 'km'    },
  'MX':           { currency: 'MXN', symbol: 'MX$',  factor: 13.0, distanceUnit: 'km'    },
  'BR':           { currency: 'BRL', symbol: 'R$',   factor: 4.2,  distanceUnit: 'km'    },
  'ZA':           { currency: 'ZAR', symbol: 'R ',   factor: 15.5, distanceUnit: 'km'    },
  DEFAULT:        { currency: 'USD', symbol: '$',    factor: 1.00, distanceUnit: 'miles' },
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

function buildExpectation(avgAge: number): string {
  if (avgAge <= 2) return 'Nearly new — expect low mileage and possible remaining factory warranty. You absorb less depreciation than the first owner.';
  if (avgAge <= 5) return 'Recent model in good condition. The sweet spot: major first-owner depreciation is already absorbed and modern safety/tech features are intact.';
  if (avgAge <= 9) return 'Mid-age vehicle with moderate mileage. A pre-purchase inspection is strongly recommended. Service history tells you a lot.';
  return 'Older vehicle — higher mileage is typical. Best dollar-per-car value, but budget for potential maintenance and factor in higher fuel and insurance costs.';
}

const MILES_TO_KM = 1.609;

/**
 * Compute what each vehicle segment looks like at a given budget in the user's local market.
 *
 * Returns market-level approximations only — no specific makes, models, or listings.
 * Pure function, no network calls.
 */
export function findPreownedCars(
  budgetLocal: number,
  location: LocationInfo,
  categoryFilter?: VehicleCategory
): PreownedGuideResult {
  const market = MARKETS[getMarketKey(location.country, location.region)] ?? MARKETS['DEFAULT'];
  const budgetUSD = budgetLocal / market.factor;

  const categoriesToCheck = categoryFilter
    ? ([categoryFilter] as VehicleCategory[])
    : (Object.keys(CATEGORIES) as VehicleCategory[]);

  const tiers: MarketTier[] = [];

  for (const cat of categoriesToCheck) {
    const cfg = CATEGORIES[cat];
    const midMSRP = (cfg.msrpMin + cfg.msrpMax) / 2;

    // Find the age where the mid-segment MSRP closest matches the budget
    let bestAge = 1;
    let bestDiff = Infinity;
    for (let age = 1; age <= 20; age++) {
      const valueUSD = midMSRP * depreciationFactor(age);
      const diff = Math.abs(valueUSD - budgetUSD) / budgetUSD;
      if (diff < bestDiff) { bestDiff = diff; bestAge = age; }
    }

    // Skip if even the oldest/cheapest end of the segment is far above budget,
    // or if the category is too new/cheap for this budget (nearly new economy at luxury budget)
    const cheapestAtAge20 = cfg.msrpMin * depreciationFactor(20) * market.factor;
    const priciest = cfg.msrpMax * depreciationFactor(1) * market.factor;
    if (budgetLocal < cheapestAtAge20 * 0.70 || budgetLocal > priciest * 1.30) continue;

    // Year range: ±2 years around the best-fit age, clamped sensibly
    const minAge = Math.max(1, bestAge - 2);
    const maxAge = Math.min(20, bestAge + 2);
    const yearMin = Math.max(2000, CURRENT_YEAR - maxAge);
    const yearMax = CURRENT_YEAR - minAge;
    if (yearMax < yearMin) continue;

    // Mileage: conservative-to-generous band across the age range
    const rawMileMin = minAge * 11000;
    const rawMileMax = maxAge * 16000;
    const mileageRange =
      market.distanceUnit === 'km'
        ? { min: Math.round((rawMileMin * MILES_TO_KM) / 1000) * 1000, max: Math.round((rawMileMax * MILES_TO_KM) / 1000) * 1000 }
        : { min: rawMileMin, max: rawMileMax };

    // Price range: low end of segment at the older bound, high end at the newer bound
    const priceMin = Math.round(cfg.msrpMin * depreciationFactor(maxAge) * market.factor * 0.93);
    const priceMax = Math.round(cfg.msrpMax * depreciationFactor(minAge) * market.factor * 1.07);

    tiers.push({
      category: cat,
      categoryLabel: cfg.label,
      categoryDescription: cfg.description,
      yearRange: { min: yearMin, max: yearMax },
      mileageRange,
      distanceUnit: market.distanceUnit,
      priceRange: { min: priceMin, max: priceMax },
      currency: market.currency,
      currencySymbol: market.symbol,
      expectation: buildExpectation(bestAge),
    });
  }

  return {
    location,
    currency: market.currency,
    currencySymbol: market.symbol,
    tiers,
    disclaimer:
      'These are regional market approximations based on average depreciation curves and local pricing data — not live listings. Actual prices vary by condition, history, and local supply. Always inspect the vehicle and check its service history before buying.',
  };
}
