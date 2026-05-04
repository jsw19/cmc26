import type {
  LocationInfo,
  PlatformListing,
  SellingPriceEstimate,
  Severity,
  VehicleCategory,
  VehicleInfo,
} from './types';

const CURRENT_YEAR = new Date().getFullYear();

const BASE_MSRP_USD: Record<VehicleCategory, number> = {
  economy:  22000,
  midsize:  32000,
  suv:      42000,
  truck:    48000,
  luxury:   68000,
  sports:   55000,
  electric: 48000,
};

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

// How much above private-party to list (headroom for negotiation)
const LISTING_BUFFER: Record<Severity, number> = {
  none:     0.12,
  minor:    0.10,
  moderate: 0.08,
  severe:   0.06,
};

interface MarketConfig {
  currency: string;
  symbol: string;
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
 * Estimate recommended listing prices for Facebook Marketplace and Craigslist.
 *
 * Pure function — no network calls or native dependencies.
 */
export function estimateSellingPrice(
  vehicleInfo: VehicleInfo,
  overallSeverity: Severity,
  location: LocationInfo
): SellingPriceEstimate {
  const { year, make, model, mileage, category } = vehicleInfo;
  const age = Math.max(0, CURRENT_YEAR - year);
  const market = MARKETS[getMarketKey(location.country, location.region)] ?? MARKETS['DEFAULT'];
  const sym = market.symbol;

  const baseUSD    = BASE_MSRP_USD[category];
  const deprFactor = depreciationFactor(age);
  const condFactor = CONDITION_MULTIPLIER[overallSeverity];

  const avgMileage    = age * 13500;
  const excessMiles   = mileage - avgMileage;
  const mileageFactor = Math.max(0.80, Math.min(1.10, 1 - excessMiles / 150000));

  const marketValueUSD   = baseUSD * deprFactor * condFactor * mileageFactor;
  const localMarketValue = marketValueUSD * market.factor;

  // Private-party anchor: 90–100% of estimated market value
  const ppMin = Math.round(localMarketValue * 0.90);
  const ppMax = Math.round(localMarketValue * 1.00);
  const idealSalePrice = { min: ppMin, max: ppMax };

  // Listing price: add buffer above ideal for negotiation room
  const buffer = LISTING_BUFFER[overallSeverity];
  const listingPrice = {
    min: Math.round(ppMin * (1 + buffer * 0.5)),
    max: Math.round(ppMax * (1 + buffer)),
  };

  // Quick-sale: 7–12% below ideal to move fast
  const quickSalePrice = {
    min: Math.round(ppMin * 0.88),
    max: Math.round(ppMax * 0.93),
  };

  const negotiationBuffer = Math.round(buffer * 100);
  const conditionNote = overallSeverity !== 'none'
    ? `Disclose the ${overallSeverity} damage upfront — buyers find out anyway during inspection.`
    : 'Emphasize the excellent condition and no-damage history in your listing title.';

  const platforms: PlatformListing[] = [
    {
      platform: 'Facebook Marketplace',
      listingPrice,
      tips: [
        `List at ${sym}${listingPrice.max.toLocaleString()} — leaves ~${negotiationBuffer}% room to negotiate down to your ideal price.`,
        'Post in local Buy/Sell/Trade car groups for extra reach beyond the main feed.',
        'Upload 10–15 photos: all exterior angles, interior, odometer, engine bay, any damage.',
        conditionNote,
        'Reply within a few hours — fast responses convert browsers into buyers.',
        'Specify payment method upfront (cash, Zelle, Venmo) to filter tire-kickers.',
      ],
    },
    {
      platform: 'Craigslist',
      // Craigslist buyers negotiate harder, so list slightly lower to stay competitive
      listingPrice: {
        min: Math.round(listingPrice.min * 0.97),
        max: Math.round(listingPrice.max * 0.97),
      },
      tips: [
        `Price ~3% lower than FB (${sym}${Math.round(listingPrice.max * 0.97).toLocaleString()}) — Craigslist buyers expect harder negotiation.`,
        'Cash only, or Zelle/Venmo — never accept personal checks or wire transfers.',
        'Meet at a bank or the DMV for the title transfer — safer and faster.',
        'Renew your listing every 48 hours to stay near the top of search results.',
        conditionNote,
        'Include the VIN and offer a Carfax or AutoCheck report to build buyer trust.',
      ],
    },
  ];

  const listingTips: string[] = [
    `Start at ${sym}${listingPrice.max.toLocaleString()} and aim to close around ${sym}${idealSalePrice.max.toLocaleString()}.`,
    'A professional detail and fresh oil change can add perceived value and justify your price.',
    'Have the clean title in hand before meeting buyers — it closes deals on the spot.',
    overallSeverity === 'none'
      ? 'No damage detected — price confidently at the high end of the range.'
      : `With ${overallSeverity} damage, consider pricing repairs into the ask or disclosing and discounting.`,
    'Take photos in good daylight — outdoor natural light is the biggest photo quality upgrade.',
  ];

  const factors: string[] = [
    age === 0
      ? 'Brand-new vehicle — near-full value retained.'
      : `${age}-year-old ${make} ${model} retains ~${Math.round(deprFactor * 100)}% of original MSRP.`,
    excessMiles > 10000
      ? `Above-average mileage (${mileage.toLocaleString()} mi) reduces value ~${Math.round((1 - mileageFactor) * 100)}%.`
      : excessMiles < -10000
      ? `Low mileage (${mileage.toLocaleString()} mi) adds a small premium.`
      : `Average mileage (${mileage.toLocaleString()} mi) for vehicle age.`,
    overallSeverity !== 'none'
      ? `${CONDITION_LABELS[overallSeverity]} condition reduces private-party value ~${Math.round((1 - condFactor) * 100)}%.`
      : 'Excellent condition — full private-party value applied.',
    `${location.label} regional pricing applied.`,
    `Listing price includes ${negotiationBuffer}% negotiation buffer above ideal sale price.`,
  ];

  return {
    vehicleInfo,
    location,
    currency: market.currency,
    currencySymbol: sym,
    idealSalePrice,
    listingPrice,
    quickSalePrice,
    negotiationBuffer,
    conditionLabel: CONDITION_LABELS[overallSeverity],
    platforms,
    listingTips,
    factors,
    disclaimer:
      'Estimates are based on average depreciation models and regional market data. Actual sale price depends on local demand, vehicle history, trim level, and buyer negotiation. Research active listings on each platform before pricing.',
  };
}
