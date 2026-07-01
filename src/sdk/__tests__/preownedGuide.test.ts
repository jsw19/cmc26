import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPreownedCars } from '../preownedGuide.ts';
import type { LocationInfo } from '../types.ts';

const US: LocationInfo = { country: 'US', label: 'United States' };

test('returns tiers with the market currency for the budget', () => {
  const guide = findPreownedCars(20000, US);
  assert.equal(guide.currency, 'USD');
  assert.ok(guide.tiers.length > 0);
  assert.ok(guide.disclaimer.length > 0);
});

test('category filter restricts results to that single segment', () => {
  const guide = findPreownedCars(25000, US, 'suv');
  assert.ok(guide.tiers.length <= 1);
  if (guide.tiers.length === 1) {
    assert.equal(guide.tiers[0].category, 'suv');
  }
});

test('every tier has a coherent (min <= max) price and year range', () => {
  const guide = findPreownedCars(18000, US);
  for (const tier of guide.tiers) {
    assert.ok(tier.priceRange.min <= tier.priceRange.max, `price range for ${tier.category}`);
    assert.ok(tier.yearRange.min <= tier.yearRange.max, `year range for ${tier.category}`);
    assert.ok(tier.mileageRange.min <= tier.mileageRange.max, `mileage range for ${tier.category}`);
  }
});

test('a metric market reports mileage in km', () => {
  const guide = findPreownedCars(20000, { country: 'DE', label: 'Germany' });
  assert.equal(guide.currency, 'EUR');
  for (const tier of guide.tiers) {
    assert.equal(tier.distanceUnit, 'km');
  }
});

test('a large budget drops the cheap economy segment as too far below budget', () => {
  const guide = findPreownedCars(60000, US);
  // Even a near-new economy car sits well under $60k, so the segment is skipped.
  assert.ok(!guide.tiers.some((t) => t.category === 'economy'));
});
