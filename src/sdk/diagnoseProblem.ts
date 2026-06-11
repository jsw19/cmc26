import Constants from 'expo-constants';

/**
 * diagnoseProblem.ts
 *
 * LLM-backed free-text symptom diagnosis for the Fix My Car screen.
 *
 * The static DIAGNOSIS_SUGGESTIONS database (src/data/diagnosisSuggestions.ts)
 * only matches a fixed set of symptoms via keyword search. This module sends a
 * user's natural-language description ("clunk over bumps when turning left")
 * to Claude and returns one or more ranked, structured diagnoses in the same
 * shape the UI already renders — so it can drop straight into a DiagnosisCard.
 *
 * Pure SDK module: no UI imports, no hooks. Enums are defined locally rather
 * than imported from src/data/diagnosisSuggestions.ts because that file pulls
 * in @expo/vector-icons, which would break the SDK's zero-UI-dependency rule.
 */

export type FixCategory =
  | 'suspension'
  | 'steering'
  | 'brakes'
  | 'drivetrain'
  | 'engine'
  | 'electrical'
  | 'other';

export type FixDifficulty = 'easy' | 'moderate' | 'advanced';
export type FixUrgency = 'monitor' | 'soon' | 'urgent' | 'do_not_drive';

const FIX_CATEGORIES: readonly FixCategory[] = [
  'suspension',
  'steering',
  'brakes',
  'drivetrain',
  'engine',
  'electrical',
  'other',
];
const FIX_DIFFICULTIES: readonly FixDifficulty[] = ['easy', 'moderate', 'advanced'];
const FIX_URGENCIES: readonly FixUrgency[] = ['monitor', 'soon', 'urgent', 'do_not_drive'];

/** Optional vehicle context to sharpen the diagnosis. */
export interface DiagnoseVehicleInfo {
  year?: number;
  make?: string;
  model?: string;
  mileage?: number;
}

export interface DiagnoseOptions {
  /** Falls back to expo-constants / EXPO_PUBLIC_ANTHROPIC_API_KEY, like analyzeCheckItem. */
  apiKey?: string;
  /** Narrow the diagnosis to a system. 'all' (or undefined) lets the model decide. */
  category?: FixCategory | 'all';
  /** Optional vehicle context. */
  vehicle?: DiagnoseVehicleInfo;
  /** Max ranked diagnoses to return (1–5). Default 3. */
  maxResults?: number;
}

/**
 * A single diagnosis candidate. Field names mirror DiagnosisSuggestion in
 * src/data/diagnosisSuggestions.ts so the existing DiagnosisCard can render an
 * AIDiagnosis with only an icon mapping added (icon is UI-layer concern).
 */
export interface AIDiagnosis {
  /** Restated/cleaned one-line symptom. */
  symptom: string;
  category: FixCategory;
  /** Short telltale signal that distinguishes this cause. */
  shortSignal: string;
  urgency: FixUrgency;
  difficulty: FixDifficulty;
  /** 0–1 confidence that this is the actual cause, given the description. */
  confidence: number;
  likelyCauses: string[];
  quickChecks: string[];
  tempFixes: string[];
  diyFixes: string[];
  buyingChecks: string[];
  repairSteps: string[];
  parts: string[];
  tools: string[];
  safetyNote: string;
}

export interface DiagnoseResult {
  /** The user's original free-text query. */
  query: string;
  /** Ranked most-likely-first. May be empty if the model could not interpret the query. */
  diagnoses: AIDiagnosis[];
  disclaimer: string;
}

const DEFAULT_DISCLAIMER =
  'AI guidance only — not a substitute for an in-person inspection by a qualified mechanic.';

function buildPrompt(query: string, options: DiagnoseOptions): string {
  const { category = 'all', vehicle, maxResults = 3 } = options;
  const limit = Math.min(5, Math.max(1, maxResults));

  const categoryLine =
    category && category !== 'all'
      ? `Focus on the vehicle's ${category} system unless the symptom clearly points elsewhere.`
      : 'Infer the most likely system(s) from the symptom.';

  const vehicleLine = vehicle
    ? `Vehicle: ${[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'unspecified'}${
        vehicle.mileage ? `, ~${vehicle.mileage.toLocaleString()} mi` : ''
      }.`
    : 'Vehicle: unspecified.';

  return `You are an expert automotive diagnostic technician helping a DIY owner understand a symptom. ${categoryLine}

${vehicleLine}

Owner's description of the problem:
"""${query}"""

Return the ${limit} most likely causes, ranked most-likely-first. Be specific and practical. Prioritize safety: any brake, steering, or structural failure that could cause loss of control must use urgency "do_not_drive". Use "urgent" for problems that worsen fast or risk a breakdown, "soon" for issues to fix in the next week or two, and "monitor" for minor items.

Respond with valid JSON ONLY — no markdown fences, no prose before or after:
{
  "diagnoses": [
    {
      "symptom": "one-line restatement of the specific cause being diagnosed",
      "category": "suspension" | "steering" | "brakes" | "drivetrain" | "engine" | "electrical" | "other",
      "shortSignal": "the telltale clue that points to this specific cause",
      "urgency": "monitor" | "soon" | "urgent" | "do_not_drive",
      "difficulty": "easy" | "moderate" | "advanced",
      "confidence": 0.0-1.0,
      "likelyCauses": ["specific component or failure 1", "..."],
      "quickChecks": ["a check the owner can do to confirm 1", "..."],
      "tempFixes": ["safe temporary mitigation, or state there is none", "..."],
      "diyFixes": ["home-garage repair step or approach 1", "..."],
      "buyingChecks": ["which part to buy and how to match it to the vehicle 1", "..."],
      "repairSteps": ["ordered repair step 1", "..."],
      "parts": ["part name 1", "..."],
      "tools": ["tool 1", "..."],
      "safetyNote": "the single most important safety warning for this cause"
    }
  ]
}

Keep each array to 2-6 concise items. If the description is too vague to diagnose, return an empty "diagnoses" array. Never invent a specific vehicle defect you cannot infer from the description.`;
}

function asStringArray(val: unknown): string[] {
  return Array.isArray(val) ? val.map((v) => String(v)).filter((s) => s.trim().length > 0) : [];
}

function pickEnum<T extends string>(val: unknown, allowed: readonly T[], fallback: T): T {
  return typeof val === 'string' && (allowed as readonly string[]).includes(val) ? (val as T) : fallback;
}

function clampConfidence(val: unknown): number {
  return typeof val === 'number' && Number.isFinite(val) ? Math.min(1, Math.max(0, val)) : 0.5;
}

function normalizeDiagnosis(raw: Record<string, unknown>): AIDiagnosis {
  return {
    symptom: typeof raw.symptom === 'string' ? raw.symptom : 'Possible cause',
    category: pickEnum(raw.category, FIX_CATEGORIES, 'other'),
    shortSignal: typeof raw.shortSignal === 'string' ? raw.shortSignal : '',
    urgency: pickEnum(raw.urgency, FIX_URGENCIES, 'soon'),
    difficulty: pickEnum(raw.difficulty, FIX_DIFFICULTIES, 'moderate'),
    confidence: clampConfidence(raw.confidence),
    likelyCauses: asStringArray(raw.likelyCauses),
    quickChecks: asStringArray(raw.quickChecks),
    tempFixes: asStringArray(raw.tempFixes),
    diyFixes: asStringArray(raw.diyFixes),
    buyingChecks: asStringArray(raw.buyingChecks),
    repairSteps: asStringArray(raw.repairSteps),
    parts: asStringArray(raw.parts),
    tools: asStringArray(raw.tools),
    safetyNote: typeof raw.safetyNote === 'string' ? raw.safetyNote : '',
  };
}

/**
 * Diagnose a free-text vehicle symptom via the Claude API.
 *
 * @param query   - The owner's plain-English description of the problem.
 * @param options - API key (optional), category focus, vehicle context, result count.
 * @returns Ranked, structured diagnoses ready for the Fix My Car UI.
 * @throws Error on missing API key, network/API failure, or empty query.
 */
export async function diagnoseProblem(
  query: string,
  options: DiagnoseOptions = {},
): Promise<DiagnoseResult> {
  const trimmed = query.trim();
  if (!trimmed) throw new Error('Describe the problem to get a diagnosis.');

  const apiKey =
    options.apiKey ??
    (Constants.expoConfig?.extra?.anthropicApiKey as string | undefined) ??
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

  if (!apiKey) throw new Error('API key not configured.');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: buildPrompt(trimmed, options) }],
    }),
  });

  if (response.status === 401) throw new Error('Invalid API key.');
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`API error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as { content?: { type: string; text?: string }[] };
  const rawText = data.content?.find((b) => b.type === 'text')?.text ?? '{}';

  let parsed: { diagnoses?: unknown };
  try {
    const clean = rawText.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
    parsed = JSON.parse(clean) as { diagnoses?: unknown };
  } catch (err) {
    throw new Error(`Failed to parse diagnosis: ${err instanceof Error ? err.message : String(err)}`);
  }

  const diagnoses = Array.isArray(parsed.diagnoses)
    ? (parsed.diagnoses as Record<string, unknown>[])
        .map(normalizeDiagnosis)
        .sort((a, b) => b.confidence - a.confidence)
    : [];

  return { query: trimmed, diagnoses, disclaimer: DEFAULT_DISCLAIMER };
}
