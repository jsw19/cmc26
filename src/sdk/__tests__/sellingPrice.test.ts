import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateSellingPrice } from '../sellingPrice.ts';
import type { LocationInfo, VehicleInfo } from '../types.ts';

const US: LocationInfo = { country: 'US', label: 'United States' };
const CURRENT_YEAR = new Date().getFullYear();

const car: VehicleInfo = {
  year: CURRENT_YEAR - 4,
  make: 'Honda',
  model: 'Civic',
  mileage: 4 * 13500,
  category: 'economy',
};

test('price tiers are ordered: quick-sale < ideal < listing', () => {
  const est = estimateSellingPrice(car, 'none', US);
  assert.ok(est.quickSalePrice.max < est.idealSalePrice.max);
  assert.ok(est.idealSalePrice.max <= est.listingPrice.max);
});

test('negotiation buffer matches the condition (none = 12%)', () => {
  const est = estimateSellingPrice(car, 'none', US);
  assert.equal(est.negotiationBuffer, 12);
  const severe = estimateSellingPrice(car, 'severe', US);
  assert.equal(severe.negotiationBuffer, 6);
});

test('returns both platforms with Craigslist priced ~3% below Facebook', () => {
  const est = estimateSellingPrice(car, 'none', US);
  const fb = est.platforms.find((p) => p.platform === 'Facebook Marketplace');
  const cl = est.platforms.find((p) => p.platform === 'Craigslist');
  assert.ok(fb && cl);
  assert.ok(cl!.listingPrice.max < fb!.listingPrice.max);
  assert.equal(cl!.listingPrice.max, Math.round(fb!.listingPrice.max * 0.97));
});

test('every platform ships a non-empty tips list', () => {
  const est = estimateSellingPrice(car, 'minor', US);
  for (const p of est.platforms) {
    assert.ok(p.tips.length > 0);
  }
  assert.ok(est.listingTips.length > 0);
});

test('worse condition lowers the ideal sale price', () => {
  const excellent = estimateSellingPrice(car, 'none', US);
  const poor = estimateSellingPrice(car, 'severe', US);
  assert.ok(poor.idealSalePrice.max < excellent.idealSalePrice.max);
});
