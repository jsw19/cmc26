import type {
  AnalyzeError,
  AnalyzeOptions,
  DamageItem,
  InspectionResult,
  Severity,
  VehiclePart,
} from './types';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

const VEHICLE_PART_LABELS: Record<VehiclePart, string> = {
  underbody: 'vehicle underbody (chassis, floor pans, subframe, exhaust, suspension)',
  front: 'vehicle front (bumper, hood, headlights, grille)',
  rear: 'vehicle rear (bumper, trunk/tailgate, taillights)',
  driver_side: 'driver side panels and doors',
  passenger_side: 'passenger side panels and doors',
  roof: 'vehicle roof',
  engine_bay: 'engine bay',
  unknown: 'vehicle',
};

function buildPrompt(vehiclePart: VehiclePart): string {
  const partLabel = VEHICLE_PART_LABELS[vehiclePart];
  return `You are an expert automotive damage assessor. Analyze this image of a ${partLabel} and identify any corrosion, rust, structural damage, dents, cracks, leaks, or wear.

Respond ONLY with a valid JSON object in this exact schema (no markdown, no prose):
{
  "overallSeverity": "none" | "minor" | "moderate" | "severe",
  "summary": "1-2 sentence plain-English summary of condition",
  "damages": [
    {
      "type": "rust" | "corrosion" | "structural_damage" | "dent" | "scratch" | "crack" | "leak" | "wear" | "other",
      "location": "specific location on the part",
      "severity": "none" | "minor" | "moderate" | "severe",
      "confidence": 0.0-1.0,
      "description": "brief description of this specific damage"
    }
  ],
  "recommendations": ["action item 1", "action item 2"]
}

If no damage is found, return overallSeverity "none", empty damages array, and an appropriate summary.`;
}

function parseSeverity(val: unknown): Severity {
  if (val === 'none' || val === 'minor' || val === 'moderate' || val === 'severe') return val;
  return 'none';
}

function parseResponse(
  raw: string,
  vehiclePart: VehiclePart,
  imageUri: string
): InspectionResult {
  // Strip potential markdown code fences if model wraps anyway
  const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;

  const damages: DamageItem[] = Array.isArray(parsed.damages)
    ? (parsed.damages as Record<string, unknown>[]).map((d) => ({
        type: (d.type as DamageItem['type']) ?? 'other',
        location: String(d.location ?? ''),
        severity: parseSeverity(d.severity),
        confidence: typeof d.confidence === 'number' ? Math.min(1, Math.max(0, d.confidence)) : 0.5,
        description: String(d.description ?? ''),
      }))
    : [];

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    vehiclePart,
    imageUri,
    damages,
    overallSeverity: parseSeverity(parsed.overallSeverity),
    summary: String(parsed.summary ?? ''),
    recommendations: Array.isArray(parsed.recommendations)
      ? (parsed.recommendations as unknown[]).map(String)
      : [],
  };
}

/**
 * Analyze a vehicle image using the Claude vision API.
 *
 * @param base64Image - Base64-encoded JPEG or PNG (no data URI prefix)
 * @param options     - API key and analysis options
 * @returns Parsed InspectionResult
 * @throws AnalyzeError on failure
 */
export async function analyzeVehicleImage(
  base64Image: string,
  imageUri: string,
  options: AnalyzeOptions
): Promise<InspectionResult> {
  const { apiKey, vehiclePart = 'unknown' } = options;

  let response: Response;
  try {
    response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: buildPrompt(vehiclePart),
              },
            ],
          },
        ],
      }),
    });
  } catch (err) {
    const error: AnalyzeError = {
      code: 'API_ERROR',
      message: `Network error: ${err instanceof Error ? err.message : String(err)}`,
    };
    throw error;
  }

  if (response.status === 401) {
    const error: AnalyzeError = { code: 'AUTH_ERROR', message: 'Invalid API key.' };
    throw error;
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const error: AnalyzeError = {
      code: 'API_ERROR',
      message: `API returned ${response.status}: ${body}`,
    };
    throw error;
  }

  const data = (await response.json()) as {
    content: { type: string; text: string }[];
  };

  const textBlock = data.content?.find((b) => b.type === 'text');
  if (!textBlock?.text) {
    const error: AnalyzeError = { code: 'PARSE_ERROR', message: 'Empty response from API.' };
    throw error;
  }

  try {
    return parseResponse(textBlock.text, vehiclePart, imageUri);
  } catch (err) {
    const error: AnalyzeError = {
      code: 'PARSE_ERROR',
      message: `Failed to parse model response: ${err instanceof Error ? err.message : String(err)}`,
    };
    throw error;
  }
}
