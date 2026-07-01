/**
 * decodeVin.ts
 *
 * VIN (Vehicle Identification Number) decoder for auto-filling `VehicleInfo`.
 *
 * Two layers:
 *  1. Pure on-device parsing — format validation, ISO 3779 check-digit
 *     verification, model-year (position 10) and world-region (position 1)
 *     decoding. Works fully offline, no key.
 *  2. Online enrichment via the free NHTSA vPIC API (no key required) to add
 *     make, model, trim, body class, and fuel type, from which we infer a
 *     `VehicleCategory`.
 *
 * If the network call fails, `decodeVin` still returns whatever the offline
 * layer could determine (year + region) with `source: 'offline'`.
 *
 * Pure SDK module: no UI imports, no hooks, no side effects beyond the fetch.
 */

import type { VehicleCategory } from './types';

const NHTSA_ENDPOINT = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues';

/** Letters never used in a VIN (to avoid confusion with 1/0). */
const DISALLOWED = /[IOQ]/;

export interface VinDecodeResult {
  /** Normalized (uppercased, trimmed) VIN. */
  vin: string;
  /** True when the VIN passes format + check-digit validation. */
  valid: boolean;
  /** Model year from position 10 (offline) or NHTSA (online). */
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  bodyClass?: string;
  fuelType?: string;
  /** Best-effort mapping to the app's vehicle segments. */
  category?: VehicleCategory;
  /** Human-readable manufacturing region from the first VIN character. */
  countryRegion?: string;
  /** Where the enriched fields came from. */
  source: 'nhtsa' | 'offline';
  /** Populated when validation fails or the online lookup errored. */
  errorText?: string;
}

/** Uppercase and strip whitespace/hyphens from a raw VIN entry. */
export function normalizeVin(raw: string): string {
  return raw.toUpperCase().replace(/[\s-]/g, '');
}

/** Transliteration values for the ISO 3779 check-digit calculation. */
const TRANSLITERATION: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
};

const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/**
 * Verify the check digit at position 9 (index 8) per ISO 3779. Mandatory for
 * North American VINs; other regions may not conform, so a failure here is a
 * soft signal, not proof the VIN is fake.
 */
export function hasValidCheckDigit(vin: string): boolean {
  if (vin.length !== 17) return false;
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const value = TRANSLITERATION[vin[i]];
    if (value === undefined) return false;
    sum += value * WEIGHTS[i];
  }
  const remainder = sum % 11;
  const expected = remainder === 10 ? 'X' : String(remainder);
  return vin[8] === expected;
}

/** Structural validation: 17 chars, allowed alphabet, valid check digit. */
export function isValidVin(vin: string): boolean {
  if (vin.length !== 17) return false;
  if (DISALLOWED.test(vin)) return false;
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return false;
  return hasValidCheckDigit(vin);
}

/** 1980-based model-year codes for position 10. Repeats every 30 years. */
const YEAR_CODES: Record<string, number> = {
  A: 1980, B: 1981, C: 1982, D: 1983, E: 1984, F: 1985, G: 1986, H: 1987,
  J: 1988, K: 1989, L: 1990, M: 1991, N: 1992, P: 1993, R: 1994, S: 1995,
  T: 1996, V: 1997, W: 1998, X: 1999, Y: 2000,
  '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005,
  '6': 2006, '7': 2007, '8': 2008, '9': 2009,
};

/**
 * Decode model year from position 10 (index 9). The code repeats every 30
 * years, so we disambiguate with position 7 (index 6): an alphabetic 7th
 * character indicates 2010+, a numeric one indicates 1980–2009.
 */
export function decodeModelYear(vin: string): number | undefined {
  if (vin.length < 10) return undefined;
  const base = YEAR_CODES[vin[9]];
  if (base === undefined) return undefined;
  let year = base;
  if (/[A-Z]/.test(vin[6])) year += 30;
  const max = new Date().getFullYear() + 1;
  if (year > max) year -= 30;
  return year;
}

/** Manufacturing region from the first character of the WMI. */
export function decodeRegion(vin: string): string | undefined {
  const c = vin[0];
  if (!c) return undefined;
  if (/[A-H]/.test(c)) return 'Africa';
  if (/[J-R]/.test(c)) return 'Asia';
  if (/[S-Z]/.test(c)) return 'Europe';
  if (/[1-5]/.test(c)) return 'North America';
  if (/[6-7]/.test(c)) return 'Oceania';
  if (/[8-9]/.test(c)) return 'South America';
  return undefined;
}

const LUXURY_MAKES = new Set([
  'BMW', 'MERCEDES-BENZ', 'MERCEDES', 'AUDI', 'LEXUS', 'ACURA', 'INFINITI',
  'CADILLAC', 'LINCOLN', 'GENESIS', 'JAGUAR', 'LAND ROVER', 'PORSCHE',
  'MASERATI', 'BENTLEY', 'ROLLS-ROYCE', 'VOLVO', 'ALFA ROMEO',
]);

const SPORTS_MAKES = new Set([
  'FERRARI', 'LAMBORGHINI', 'PORSCHE', 'MCLAREN', 'LOTUS', 'CHEVROLET CORVETTE',
]);

/**
 * Infer the app's `VehicleCategory` from NHTSA fields. Order matters:
 * powertrain (electric) → body style (truck/SUV) → make tier (luxury/sports)
 * → size fallback.
 */
export function inferCategory(fields: {
  bodyClass?: string;
  fuelType?: string;
  make?: string;
  model?: string;
}): VehicleCategory | undefined {
  const body = (fields.bodyClass ?? '').toUpperCase();
  const fuel = (fields.fuelType ?? '').toUpperCase();
  const make = (fields.make ?? '').toUpperCase();
  const model = (fields.model ?? '').toUpperCase();

  if (fuel.includes('ELECTRIC') && !fuel.includes('HYBRID')) return 'electric';
  if (body.includes('PICKUP') || body.includes('TRUCK')) return 'truck';
  if (body.includes('SPORT UTILITY') || body.includes('SUV') || body.includes('CROSSOVER')) return 'suv';

  if (SPORTS_MAKES.has(make) || (make === 'CHEVROLET' && model.includes('CORVETTE'))) return 'sports';
  if ((body.includes('COUPE') || body.includes('CONVERTIBLE')) && LUXURY_MAKES.has(make)) return 'sports';
  if (LUXURY_MAKES.has(make)) return 'luxury';

  if (body.includes('COMPACT') || body.includes('SUBCOMPACT') || body.includes('HATCHBACK')) return 'economy';
  if (body.includes('SEDAN') || body.includes('WAGON') || body.includes('MINIVAN') || body.includes('VAN')) return 'midsize';

  return undefined;
}

/** Offline-only result: whatever we can parse without the network. */
function offlineResult(vin: string, valid: boolean, errorText?: string): VinDecodeResult {
  return {
    vin,
    valid,
    year: decodeModelYear(vin),
    countryRegion: decodeRegion(vin),
    source: 'offline',
    errorText,
  };
}

export interface DecodeVinOptions {
  /** Skip the network call and return offline (year + region) data only. */
  offlineOnly?: boolean;
  /** Fetch timeout in ms. Default 8000. */
  timeoutMs?: number;
}

/**
 * Decode a VIN into structured vehicle info.
 *
 * @param rawVin  - The VIN as typed (any case, spaces/hyphens tolerated).
 * @param options - Offline-only mode, fetch timeout.
 * @returns Structured result. Always returns (never throws for a bad VIN);
 *          check `.valid` and `.errorText`.
 */
export async function decodeVin(
  rawVin: string,
  options: DecodeVinOptions = {},
): Promise<VinDecodeResult> {
  const vin = normalizeVin(rawVin);

  if (vin.length !== 17) {
    return { vin, valid: false, source: 'offline', errorText: 'A VIN must be exactly 17 characters.' };
  }
  const valid = isValidVin(vin);

  if (options.offlineOnly) {
    return offlineResult(vin, valid, valid ? undefined : 'VIN failed the check-digit test.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000);
  try {
    const res = await fetch(`${NHTSA_ENDPOINT}/${vin}?format=json`, {
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Lookup failed (${res.status}).`);

    const data = (await res.json()) as { Results?: Record<string, string>[] };
    const r = data.Results?.[0];
    if (!r) throw new Error('No decode data returned.');

    const year = r.ModelYear ? parseInt(r.ModelYear, 10) : decodeModelYear(vin);
    const make = titleCase(r.Make);
    const model = r.Model?.trim() || undefined;
    const trim = r.Trim?.trim() || undefined;
    const bodyClass = r.BodyClass?.trim() || undefined;
    const fuelType = r.FuelTypePrimary?.trim() || undefined;

    return {
      vin,
      valid,
      year: Number.isFinite(year) ? year : undefined,
      make,
      model,
      trim,
      bodyClass,
      fuelType,
      category: inferCategory({ bodyClass, fuelType, make, model }),
      countryRegion: decodeRegion(vin),
      source: 'nhtsa',
      errorText: valid ? undefined : 'VIN check digit looks off — decode may be unreliable.',
    };
  } catch (err) {
    // Network/parse failure — fall back to the offline layer so the caller
    // still gets year + region.
    const msg = err instanceof Error && err.name === 'AbortError'
      ? 'Lookup timed out — showing offline decode only.'
      : 'Offline decode only (lookup unavailable).';
    return offlineResult(vin, valid, msg);
  } finally {
    clearTimeout(timer);
  }
}

/** NHTSA returns ALL-CAPS makes; convert to Title Case for display/forms. */
function titleCase(s?: string): string | undefined {
  const t = s?.trim();
  if (!t) return undefined;
  return t
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bBmw\b/i, 'BMW')
    .replace(/\bGmc\b/i, 'GMC');
}
