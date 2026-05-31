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
  brakes: 'brake system (wheel-area brake rotor, caliper, pads, brake hose, and nearby brake line)',
  unknown: 'vehicle',
};

function buildPrompt(vehiclePart: VehiclePart): string {
  const partLabel = VEHICLE_PART_LABELS[vehiclePart];
  if (vehiclePart === 'engine_bay') {
    return `You are an expert automotive engine-bay inspector. Analyze this image of an engine bay and identify visible service parts, fluid reservoirs, leaks, wear, corrosion, or maintenance red flags.

Look specifically for engine oil leaks, coolant reservoir and hose condition, brake fluid reservoir near the master cylinder/firewall, power steering fluid reservoir or pump area if the vehicle uses hydraulic steering, belts, hoses, battery terminals, and obvious disconnected or damaged parts. For brake fluid, explain that it transfers pedal force through the hydraulic brake system. For power steering fluid, explain that it helps hydraulic steering assist reduce steering effort. If a vehicle appears to use electric power steering and no power steering reservoir is visible, say that may be normal.

Respond ONLY with a valid JSON object in this exact schema (no markdown, no prose):
{
  "overallSeverity": "none" | "minor" | "moderate" | "severe",
  "summary": "1-2 sentence plain-English engine bay condition summary. Mention key visible fluids or parts inspected.",
  "damages": [
    {
      "type": "rust" | "corrosion" | "structural_damage" | "dent" | "scratch" | "crack" | "leak" | "wear" | "other",
      "location": "specific component, reservoir, hose, belt, or area",
      "severity": "none" | "minor" | "moderate" | "severe",
      "confidence": 0.0-1.0,
      "description": "brief description of this specific issue"
    }
  ],
  "recommendations": ["detailed maintenance suggestion 1", "detailed maintenance suggestion 2"]
}

Include practical maintenance suggestions such as checking the correct fluid type, flushing old brake fluid, inspecting leaks before topping up, replacing cracked hoses, or getting belts/battery serviced. If severity is moderate or severe, include a recommendation that this app cannot replace an in-person repair shop inspection. If no damage is found, return overallSeverity "none", empty damages array, and routine maintenance suggestions.`;
  }

  if (vehiclePart === 'underbody') {
    return `You are an expert automotive underbody inspector. Analyze this image of the underbody (frame rails, subframe, floor pans, exhaust, suspension arms, brake and fuel lines, differential, oil pan) and identify rust, perforation, fluid leaks, structural damage, or worn components.

Pay particular attention to:
- Frame rails and subframe — flaking or scaling rust vs. light surface oxidation
- Floor pans — pinholes, perforation, or visible patches
- Exhaust pipes, muffler, heat shields — heavy rust, holes, or missing hardware
- Suspension arms, control arms, sway bar links — corrosion at pivot points or torn bushings
- Brake and fuel lines — corrosion, crimping, or wet spots
- Differential, transmission case, oil pan — wet film indicating seepage

When reporting damages, locate each finding using a zone label ("upper-left", "center", "lower-right", etc.) or the named component if clearly identifiable.

Respond ONLY with a valid JSON object in this exact schema (no markdown, no prose):
{
  "overallSeverity": "none" | "minor" | "moderate" | "severe",
  "summary": "1-2 sentence plain-English underbody condition summary",
  "damages": [
    {
      "type": "rust" | "corrosion" | "structural_damage" | "dent" | "scratch" | "crack" | "leak" | "wear" | "other",
      "location": "zone or named component (e.g. 'lower-left frame rail', 'center exhaust pipe')",
      "severity": "none" | "minor" | "moderate" | "severe",
      "confidence": 0.0-1.0,
      "description": "brief description of this specific issue"
    }
  ],
  "recommendations": ["action item 1", "action item 2"]
}

Distinguish light surface rust (cosmetic, common on older vehicles) from structural rust (perforation, heavy flaking, compromised load-bearing metal) — only the latter warrants "severe". If severity is moderate or severe, include a recommendation that this app cannot replace an in-person repair shop inspection. If no damage is found, return overallSeverity "none", empty damages array, and an appropriate summary.`;
  }

  if (vehiclePart === 'brakes') {
    return `You are an expert automotive brake inspector. Analyze this image of a ${partLabel} and determine whether the visible brake system appears to be in good or bad condition.

Look specifically for brake pad thickness, rotor scoring/grooves, heavy rotor rust, cracked or heat-checked rotor surfaces, uneven wear, damaged calipers, brake fluid leaks, cracked or swollen rubber brake hoses, corroded metal brake lines, missing hardware, or anything unsafe. If the image is too far away, blocked by the wheel, blurry, or does not clearly show the rotor/caliper/pad area, say that a better photo is needed in the recommendations and use the visible evidence only.

Respond ONLY with a valid JSON object in this exact schema (no markdown, no prose):
{
  "overallSeverity": "none" | "minor" | "moderate" | "severe",
  "summary": "1-2 sentence plain-English brake condition summary. Say whether the visible brake system looks good, needs monitoring, or looks bad/unsafe.",
  "damages": [
    {
      "type": "rust" | "corrosion" | "structural_damage" | "dent" | "scratch" | "crack" | "leak" | "wear" | "other",
      "location": "specific brake component and side if visible",
      "severity": "none" | "minor" | "moderate" | "severe",
      "confidence": 0.0-1.0,
      "description": "brief description of the brake condition issue"
    }
  ],
  "recommendations": ["action item 1", "action item 2"]
}

Use overallSeverity "none" when the visible pads/rotor/caliper/hose look normal. Use "moderate" or "severe" for thin pads, deep rotor scoring, leaks, damaged hoses/lines, or anything that could affect braking safety. If severity is moderate or severe, include a recommendation that this app cannot replace an in-person repair shop inspection.`;
  }

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

If severity is moderate or severe, include a recommendation that this app cannot replace an in-person repair shop inspection. If no damage is found, return overallSeverity "none", empty damages array, and an appropriate summary.`;
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

  const recommendations = Array.isArray(parsed.recommendations)
    ? (parsed.recommendations as unknown[]).map(String)
    : [];
  const overallSeverity = parseSeverity(parsed.overallSeverity);

  if (
    (overallSeverity === 'moderate' || overallSeverity === 'severe') &&
    !recommendations.some((rec) => rec.toLowerCase().includes('repair shop'))
  ) {
    recommendations.push('This app cannot replace an in-person repair shop inspection for moderate or severe findings.');
  }

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    vehiclePart,
    imageUri,
    damages,
    overallSeverity,
    summary: String(parsed.summary ?? ''),
    recommendations,
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
