import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateTradeInValue } from '../tradeInEstimate.ts';
import type { LocationInfo, VehicleInfo } from '../types.ts';

const US: LocationInfo = { country: 'US', label: 'United States' };
const CURRENT_YEAR = new Date().getFullYear();

const car: VehicleInfo = {
  year: CURRENT_YEAR - 5,
  make: 'Toyota',
  model: 'Camry',
  mileage: 5 * 13500, // exactly average for the age
  category: 'midsize',
};

test('trade-in value is below private-party value', () => {
  const est = estimateTradeInValue(car, 'none', US);
  assert.ok(est.tradeInValue.max <= est.privatePartyValue.max);
  assert.ok(est.tradeInValue.min <= est.privatePartyValue.min);
});

test('min never exceeds max for either range', () => {
  const est = estimateTradeInValue(car, 'moderate', US);
  assert.ok(est.tradeInValue.min <= est.tradeInValue.max);
  assert.ok(est.privatePartyValue.min <= est.privatePartyValue.max);
});

test('worse condition lowers the valuation', () => {
  const excellent = estimateTradeInValue(car, 'none', US);
  const poor = estimateTradeInValue(car, 'severe', US);
  assert.ok(poor.privatePartyValue.max < excellent.privatePartyValue.max);
  assert.equal(excellent.conditionLabel, 'Excellent');
  assert.equal(poor.conditionLabel, 'Poor');
});

test('regional market factor changes the currency and symbol', () => {
  const est = estimateTradeInValue(car, 'none', { country: 'CA', label: 'Canada' });
  assert.equal(est.currency, 'CAD');
  assert.equal(est.currencySymbol, 'CA$');
});

test('a brand-new vehicle is flagged in the factors', () => {
  const brandNew: VehicleInfo = { ...car, year: CURRENT_YEAR, mileage: 0 };
  const est = estimateTradeInValue(brandNew, 'none', US);
  assert.ok(est.factors.some((f) => /brand-new/i.test(f)));
});
