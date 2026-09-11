import { DIAGNOSIS_SUGGESTIONS } from '../data/diagnosisSuggestions';
import type { AIDiagnosis, DiagnoseOptions, DiagnoseResult } from './diagnoseProblem';

const DISCLAIMER =
  'These offline matches are informational and cannot confirm a diagnosis. Stop driving for serious braking, steering, smoke, overheating, or fluid-leak symptoms and consult a qualified mechanic.';

function words(value: string): string[] {
  return value.toLowerCase().match(/[a-z0-9]+/g)?.filter((word) => word.length > 2) ?? [];
}

export async function diagnoseProblemLocally(
  query: string,
  options: DiagnoseOptions = {},
): Promise<DiagnoseResult> {
  const trimmed = query.trim();
  if (!trimmed) throw new Error('Describe the problem to get symptom matches.');

  const queryWords = words(trimmed);
  const category = options.category === 'all' ? undefined : options.category;
  const limit = Math.min(5, Math.max(1, options.maxResults ?? 3));
  const ranked = DIAGNOSIS_SUGGESTIONS
    .filter((item) => !category || item.category === category)
    .map((item) => {
      const primary = words(`${item.symptom} ${item.shortSignal}`);
      const secondary = words([...item.likelyCauses, ...item.quickChecks, ...item.parts].join(' '));
      const primaryMatches = queryWords.filter((word) => primary.includes(word)).length;
      const secondaryMatches = queryWords.filter((word) => secondary.includes(word)).length;
      return { item, score: primaryMatches * 3 + secondaryMatches };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const maxScore = ranked[0]?.score ?? 1;
  const diagnoses: AIDiagnosis[] = ranked.map(({ item, score }) => ({
    symptom: item.symptom,
    category: item.category,
    shortSignal: item.shortSignal,
    urgency: item.urgency,
    difficulty: item.difficulty,
    confidence: Math.min(0.9, 0.45 + (score / maxScore) * 0.4),
    likelyCauses: item.likelyCauses,
    quickChecks: item.quickChecks,
    tempFixes: item.tempFixes,
    diyFixes: item.diyFixes,
    buyingChecks: item.buyingChecks ?? [],
    repairSteps: item.repairSteps ?? [],
    parts: item.parts,
    tools: item.tools,
    safetyNote: item.safetyNote,
  }));

  return { query: trimmed, diagnoses, disclaimer: DISCLAIMER };
}
