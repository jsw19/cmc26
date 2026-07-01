import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateRepairCosts } from '../costEstimate.ts';
import type { DamageItem, LocationInfo } from '../types.ts';

const US_NE: LocationInfo = { country: 'US', region: 'New York', label: 'New York, US' };

function damage(partial: Partial<DamageItem>): DamageItem {
  return {
    type: 'rust',
    location: 'underbody',
    severity: 'minor',
    confidence: 0.9,
    description: 'surface rust',
    ...partial,
  };
}

test('applies the regional multiplier to base costs (US-Northeast = 1.30x)', () => {
  const est = estimateRepairCosts([damage({ type: 'rust', severity: 'minor' })], US_NE);
  // rust/minor base is [150, 350] USD → ×1.30
  assert.equal(est.items.length, 1);
  assert.equal(est.items[0].minCost, Math.round(150 * 1.3)); // 195
  assert.equal(est.items[0].maxCost, Math.round(350 * 1.3)); // 455
  assert.equal(est.currency, 'USD');
  assert.equal(est.currencySymbol, '$');
});

test('filters out "none" severity items and sums totals', () => {
  const est = estimateRepairCosts(
    [
      damage({ type: 'rust', severity: 'minor' }),
      damage({ type: 'dent', severity: 'none' }), // should be dropped
      damage({ type: 'dent', severity: 'moderate' }),
    ],
    US_NE,
  );
  assert.equal(est.items.length, 2);
  assert.equal(est.totalMin, est.items[0].minCost + est.items[1].minCost);
  assert.equal(est.totalMax, est.items[0].maxCost + est.items[1].maxCost);
});

test('no damages yields empty items and zero totals', () => {
  const est = estimateRepairCosts([], US_NE);
  assert.deepEqual(est.items, []);
  assert.equal(est.totalMin, 0);
  assert.equal(est.totalMax, 0);
});

test('unknown country falls back to the DEFAULT (USD, 1.0x) region', () => {
  const est = estimateRepairCosts(
    [damage({ type: 'rust', severity: 'minor' })],
    { country: 'XX', label: 'Nowhere' },
  );
  assert.equal(est.currency, 'USD');
  assert.equal(est.items[0].minCost, 150); // ×1.0
});

test('non-US currency uses that region symbol (GB = GBP)', () => {
  const est = estimateRepairCosts(
    [damage({ type: 'rust', severity: 'minor' })],
    { country: 'GB', label: 'United Kingdom' },
  );
  assert.equal(est.currency, 'GBP');
  assert.equal(est.currencySymbol, '£');
});
