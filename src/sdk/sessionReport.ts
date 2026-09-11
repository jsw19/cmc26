import type { InspectionResult, InspectionSession } from './types';
import { buildInspectionReportHtml, escapeHtml } from './reportHtml.ts';

export const SESSION_PARTS = ['underbody', 'front', 'rear', 'driver_side', 'passenger_side', 'engine_bay', 'brakes'] as const;

export function sessionProgress(results: InspectionResult[]) {
  const assessed = new Set(results.filter(r => !r.requiresRetake).map(r => r.vehiclePart));
  return { assessed: SESSION_PARTS.filter(p => assessed.has(p)), missing: SESSION_PARTS.filter(p => !assessed.has(p)), retakes: results.filter(r => r.requiresRetake).length };
}

/** One document containing all saved views; absent photos are explicitly disclosed. */
export function buildSessionReportHtml(session: InspectionSession, history: InspectionResult[], images: Record<string, string> = {}): string {
  const results = history.filter(r => r.sessionId === session.id).sort((a, b) => a.timestamp - b.timestamp);
  const progress = sessionProgress(results);
  const docs = results.map(result => buildInspectionReportHtml(result, { imageDataUri: images[result.id] }));
  const style = docs[0]?.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? 'body { font-family: sans-serif; padding: 32px; }';
  const vehicle = session.vehicle;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><style>${style}
    .scan-page { break-before: page; } .cover { padding: 24px 0; }
  </style></head><body><div class="cover"><h1>CheckMyCar vehicle inspection</h1>
    <h2>${escapeHtml(vehicle.name)}</h2><p>${escapeHtml([vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' '))}</p>
    <p>${escapeHtml(new Date(session.createdAt).toLocaleString())} · ${session.status === 'draft' ? 'Draft' : 'Completed session'}</p>
    <p>${results.length} photos / ${progress.assessed.length} of ${SESSION_PARTS.length} areas assessed.</p>
    <p>Areas not assessed: ${escapeHtml(progress.missing.join(', ').replace(/_/g, ' ') || 'None')}.</p>
    <p>${progress.retakes} photos require a retake. A completed session is not a certification of vehicle condition.</p></div>
    ${docs.map((doc, i) => `<div class="scan-page">${!images[results[i].id] ? '<p>Saved photo unavailable; findings are included below.</p>' : ''}${doc.match(/<body>([\s\S]*?)<\/body>/)?.[1] ?? ''}</div>`).join('')}
    </body></html>`;
}
