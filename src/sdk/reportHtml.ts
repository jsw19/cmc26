/**
 * reportHtml.ts
 *
 * Builds a self-contained HTML document for an inspection, suitable for
 * rendering to PDF (e.g. via expo-print). Pure function — no UI imports, no
 * side effects — so it can be unit-tested and reused anywhere.
 *
 * The image, if provided, must be a data URI (e.g. `data:image/jpeg;base64,…`)
 * so the PDF is fully self-contained with no external file references.
 */

import type { InspectionResult, Severity, VehiclePart } from './types';

export interface ReportOptions {
  /** Embedded vehicle photo as a data URI. Omitted → no image block. */
  imageDataUri?: string;
  /** App/brand name shown in the header. Defaults to 'CheckMyCar'. */
  brandName?: string;
}

const PART_LABELS: Record<VehiclePart, string> = {
  underbody: 'Underbody',
  front: 'Front',
  rear: 'Rear',
  driver_side: 'Driver Side',
  passenger_side: 'Passenger Side',
  roof: 'Roof',
  engine_bay: 'Engine Bay',
  brakes: 'Brake System',
  unknown: 'Vehicle',
};

const SEVERITY_LABELS: Record<Severity, string> = {
  none: 'No Damage',
  minor: 'Minor',
  moderate: 'Moderate',
  severe: 'Severe',
};

const SEVERITY_COLORS: Record<Severity, string> = {
  none: '#16a34a',
  minor: '#ca8a04',
  moderate: '#ea580c',
  severe: '#dc2626',
};

/** Escape the five characters that are unsafe in HTML text/attributes. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function money(symbol: string, min: number, max: number): string {
  const fmt = (n: number) => `${symbol}${n.toLocaleString()}`;
  return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
}

function titleize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function section(title: string, body: string): string {
  return `<section><h2>${escapeHtml(title)}</h2>${body}</section>`;
}

function list(items: string[]): string {
  if (items.length === 0) return '';
  return `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
}

/**
 * Render an `InspectionResult` to a printable HTML string.
 *
 * @param result  - The inspection to render.
 * @param options - Optional embedded photo (data URI) and brand name.
 * @returns A complete HTML document string.
 */
export function buildInspectionReportHtml(
  result: InspectionResult,
  options: ReportOptions = {},
): string {
  const brand = escapeHtml(options.brandName ?? 'CheckMyCar');
  const partLabel = PART_LABELS[result.vehiclePart] ?? 'Vehicle';
  const sevColor = SEVERITY_COLORS[result.overallSeverity];
  const sevLabel = SEVERITY_LABELS[result.overallSeverity];
  const date = new Date(result.timestamp).toLocaleString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const v = result.vehicleInfo;
  const vehicleLine = v
    ? `${v.year} ${escapeHtml(v.make)} ${escapeHtml(v.model)} · ${v.mileage.toLocaleString()} mi · ${titleize(v.category)}`
    : '';

  const imageBlock = options.imageDataUri
    ? `<img class="photo" src="${options.imageDataUri}" alt="Vehicle photo" />`
    : '';

  // Damages
  const damageBlock = result.damages.length
    ? `<table>
         <thead><tr><th>Type</th><th>Location</th><th>Severity</th><th>Confidence</th></tr></thead>
         <tbody>${result.damages
           .map(
             (d) => `<tr>
               <td>${escapeHtml(titleize(d.type))}</td>
               <td>${escapeHtml(d.location)}</td>
               <td><span class="pill" style="background:${SEVERITY_COLORS[d.severity]}">${SEVERITY_LABELS[d.severity]}</span></td>
               <td>${Math.round(d.confidence * 100)}%</td>
             </tr>`,
           )
           .join('')}</tbody>
       </table>`
    : `<p class="ok">No damage detected in this area.</p>`;

  // Cost estimate
  const cost = result.costEstimate;
  const costBlock = cost
    ? section(
        'Estimated Repair Cost',
        `<p class="total">${money(cost.currencySymbol, cost.totalMin, cost.totalMax)}</p>
         <table>
           <thead><tr><th>Item</th><th>Severity</th><th>Estimated Cost</th></tr></thead>
           <tbody>${cost.items
             .map(
               (i) => `<tr>
                 <td>${escapeHtml(titleize(i.damageType))}</td>
                 <td>${SEVERITY_LABELS[i.severity]}</td>
                 <td>${money(cost.currencySymbol, i.minCost, i.maxCost)}</td>
               </tr>`,
             )
             .join('')}</tbody>
         </table>
         <p class="disclaimer">${escapeHtml(cost.disclaimer)}</p>`,
      )
    : '';

  // Trade-in
  const t = result.tradeInEstimate;
  const tradeBlock = t
    ? section(
        'Trade-In Value',
        `<p class="range">Dealer trade-in: <strong>${money(t.currencySymbol, t.tradeInValue.min, t.tradeInValue.max)}</strong></p>
         <p class="range">Private party: <strong>${money(t.currencySymbol, t.privatePartyValue.min, t.privatePartyValue.max)}</strong></p>
         <p class="muted">Condition: ${escapeHtml(t.conditionLabel)} · ${escapeHtml(t.location.label)}</p>
         ${list(t.factors)}
         <p class="disclaimer">${escapeHtml(t.disclaimer)}</p>`,
      )
    : '';

  // Selling price
  const s = result.sellingPriceEstimate;
  const sellBlock = s
    ? section(
        'Selling Price',
        `<p class="range">Quick sale: <strong>${money(s.currencySymbol, s.quickSalePrice.min, s.quickSalePrice.max)}</strong></p>
         <p class="range">Ideal price: <strong>${money(s.currencySymbol, s.idealSalePrice.min, s.idealSalePrice.max)}</strong></p>
         <p class="range">List at: <strong>${money(s.currencySymbol, s.listingPrice.min, s.listingPrice.max)}</strong> (${s.negotiationBuffer}% negotiation buffer)</p>
         ${s.platforms
           .map(
             (p) => `<p class="range">${escapeHtml(p.platform)}: <strong>${money(s.currencySymbol, p.listingPrice.min, p.listingPrice.max)}</strong></p>`,
           )
           .join('')}
         <p class="disclaimer">${escapeHtml(s.disclaimer)}</p>`,
      )
    : '';

  const recBlock = result.recommendations.length
    ? section('Recommendations', list(result.recommendations))
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 32px; font-size: 13px; line-height: 1.5; }
  .brand { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
  .brand span { color: #3b82f6; }
  .meta { color: #666; font-size: 12px; margin-top: 2px; }
  .banner { display: flex; align-items: center; justify-content: space-between; border: 1px solid #e5e5e5; border-radius: 10px; padding: 14px 16px; margin: 18px 0; }
  .banner .part { font-size: 16px; font-weight: 700; }
  .banner .sev { color: #fff; font-weight: 700; padding: 5px 12px; border-radius: 999px; font-size: 12px; }
  .photo { width: 100%; max-height: 320px; object-fit: cover; border-radius: 10px; margin: 12px 0; }
  .summary { background: #f7f7f8; border-radius: 8px; padding: 12px 14px; }
  h2 { font-size: 14px; border-bottom: 2px solid #f0f0f0; padding-bottom: 6px; margin: 24px 0 10px; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0; }
  th, td { text-align: left; padding: 7px 8px; border-bottom: 1px solid #eee; font-size: 12px; }
  th { color: #888; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
  .pill { color: #fff; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; }
  .total { font-size: 20px; font-weight: 800; color: #ea580c; margin: 4px 0; }
  .range { margin: 3px 0; }
  .muted { color: #666; font-size: 12px; }
  .ok { color: #16a34a; font-weight: 600; }
  ul { margin: 6px 0; padding-left: 18px; }
  li { margin: 3px 0; }
  .disclaimer { color: #888; font-size: 10px; margin-top: 8px; font-style: italic; }
  .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #eee; color: #999; font-size: 10px; }
</style>
</head>
<body>
  <div class="brand">Check<span>My</span>Car</div>
  <div class="meta">${brand} inspection report · ${escapeHtml(date)}</div>

  <div class="banner">
    <div>
      <div class="part">${escapeHtml(partLabel)} Inspection</div>
      ${vehicleLine ? `<div class="meta">${vehicleLine}</div>` : ''}
    </div>
    <div class="sev" style="background:${sevColor}">${sevLabel}</div>
  </div>

  ${imageBlock}

  <div class="summary">${escapeHtml(result.summary)}</div>

  ${section(`Detected Issues (${result.damages.length})`, damageBlock)}
  ${costBlock}
  ${tradeBlock}
  ${sellBlock}
  ${recBlock}

  <div class="footer">
    This report is AI-generated for informational purposes only. Always consult a qualified
    mechanic before making repair or purchase decisions.
  </div>
</body>
</html>`;
}
