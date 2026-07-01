import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildInspectionReportHtml, escapeHtml } from '../reportHtml.ts';
import type { InspectionResult } from '../types.ts';

function baseResult(overrides: Partial<InspectionResult> = {}): InspectionResult {
  return {
    id: 'abc',
    timestamp: Date.UTC(2026, 0, 15, 12, 0),
    vehiclePart: 'underbody',
    imageUri: 'file:///x.jpg',
    damages: [
      { type: 'rust', location: 'frame rail', severity: 'moderate', confidence: 0.82, description: 'surface rust' },
    ],
    overallSeverity: 'moderate',
    summary: 'Moderate corrosion on the rear frame rail.',
    recommendations: ['Treat rust within 3 months', 'Re-inspect next service'],
    ...overrides,
  };
}

test('escapeHtml neutralizes the five unsafe characters', () => {
  assert.equal(escapeHtml(`<a href="x">O'Neil & Co</a>`), '&lt;a href=&quot;x&quot;&gt;O&#39;Neil &amp; Co&lt;/a&gt;');
});

test('produces a complete HTML document with core sections', () => {
  const html = buildInspectionReportHtml(baseResult());
  assert.match(html, /<!DOCTYPE html>/);
  assert.match(html, /Underbody Inspection/);
  assert.match(html, /Moderate corrosion on the rear frame rail\./);
  assert.match(html, /Detected Issues \(1\)/);
  assert.match(html, /Rust/);
  assert.match(html, /Recommendations/);
  assert.match(html, /Treat rust within 3 months/);
});

test('escapes user-supplied content to prevent broken/injected markup', () => {
  const html = buildInspectionReportHtml(
    baseResult({ summary: 'Damage near <script>alert(1)</script> & bracket' }),
  );
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.match(html, /&lt;script&gt;/);
});

test('omits optional estimate sections when absent, includes them when present', () => {
  const without = buildInspectionReportHtml(baseResult());
  assert.doesNotMatch(without, /Estimated Repair Cost/);
  assert.doesNotMatch(without, /Trade-In Value/);

  const withCost = buildInspectionReportHtml(
    baseResult({
      costEstimate: {
        location: { country: 'US', label: 'United States' },
        currency: 'USD',
        currencySymbol: '$',
        items: [{ damageType: 'rust', severity: 'moderate', description: 'x', minCost: 500, maxCost: 1200 }],
        totalMin: 500,
        totalMax: 1200,
        disclaimer: 'Approximate.',
      },
    }),
  );
  assert.match(withCost, /Estimated Repair Cost/);
  assert.match(withCost, /\$500 – \$1,200/);
});

test('embeds the photo only when a data URI is supplied', () => {
  const uri = 'data:image/jpeg;base64,QUJD';
  assert.match(buildInspectionReportHtml(baseResult(), { imageDataUri: uri }), /<img class="photo"/);
  assert.doesNotMatch(buildInspectionReportHtml(baseResult()), /<img class="photo"/);
});

test('renders a no-damage message when there are no damages', () => {
  const html = buildInspectionReportHtml(
    baseResult({ damages: [], overallSeverity: 'none', summary: 'Clean.' }),
  );
  assert.match(html, /No damage detected/);
  assert.match(html, /Detected Issues \(0\)/);
});
