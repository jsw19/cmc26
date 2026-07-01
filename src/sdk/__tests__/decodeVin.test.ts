import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeModelYear,
  decodeRegion,
  decodeVin,
  hasValidCheckDigit,
  inferCategory,
  isValidVin,
  normalizeVin,
} from '../decodeVin.ts';

// A canonical, real-world valid VIN (2003 Honda Accord). Its check digit (3)
// is the standard textbook example used to verify the ISO 3779 algorithm.
const HONDA = '1HGCM82633A004352';
const TESLA = '5YJ3E1EA7HF000337'; // 2017 Tesla Model 3

test('normalizeVin uppercases and strips spaces/hyphens', () => {
  assert.equal(normalizeVin(' 1hg cm8-2633a004352 '), HONDA);
});

test('hasValidCheckDigit accepts a valid VIN, rejects a mutated one', () => {
  assert.equal(hasValidCheckDigit(HONDA), true);
  // flip a character so the check digit no longer matches
  assert.equal(hasValidCheckDigit('1HGCM82634A004352'), false);
});

test('isValidVin enforces length, alphabet, and check digit', () => {
  assert.equal(isValidVin(HONDA), true);
  assert.equal(isValidVin(TESLA), true);
  assert.equal(isValidVin('TOOSHORT'), false);
  // I, O, Q are never allowed in a VIN
  assert.equal(isValidVin('1HGCM82633A00435I'), false);
});

test('decodeModelYear resolves the year and disambiguates via position 7', () => {
  assert.equal(decodeModelYear(HONDA), 2003); // position 7 numeric → 1980–2009 window
  assert.equal(decodeModelYear(TESLA), 2017); // position 7 alpha → 2010+ window
});

test('decodeRegion maps the first character to a manufacturing region', () => {
  assert.equal(decodeRegion(HONDA), 'North America'); // '1'
  assert.equal(decodeRegion('WBA00000000000000'), 'Europe'); // 'W'
  assert.equal(decodeRegion('JH400000000000000'), 'Asia'); // 'J'
});

test('inferCategory maps NHTSA fields to a VehicleCategory', () => {
  assert.equal(inferCategory({ fuelType: 'Electric' }), 'electric');
  assert.equal(inferCategory({ bodyClass: 'Pickup' }), 'truck');
  assert.equal(
    inferCategory({ bodyClass: 'Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)' }),
    'suv',
  );
  assert.equal(inferCategory({ make: 'BMW', bodyClass: 'Sedan/Saloon' }), 'luxury');
  assert.equal(inferCategory({ make: 'Honda', bodyClass: 'Sedan/Saloon' }), 'midsize');
  assert.equal(inferCategory({ make: 'Honda', bodyClass: 'Hatchback' }), 'economy');
  // A hybrid is not classified as electric
  assert.equal(inferCategory({ fuelType: 'Gasoline, Hybrid' }), undefined);
});

test('decodeVin offlineOnly returns parsed year + region without a network call', async () => {
  const r = await decodeVin(HONDA, { offlineOnly: true });
  assert.equal(r.source, 'offline');
  assert.equal(r.valid, true);
  assert.equal(r.year, 2003);
  assert.equal(r.countryRegion, 'North America');
  assert.equal(r.make, undefined); // make requires the online lookup
});

test('decodeVin rejects a wrong-length VIN without throwing', async () => {
  const r = await decodeVin('NOTAVIN', { offlineOnly: true });
  assert.equal(r.valid, false);
  assert.ok(r.errorText);
});
