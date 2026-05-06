import Constants from 'expo-constants';

export interface CheckItemAnalysis {
  verdict: 'ok' | 'concern' | 'problem';
  summary: string;
  details: string[];
  imageUri: string;
}

const CHECK_PROMPTS: Record<string, string> = {
  oil_leak:
    'Inspect this engine bay image for oil leaks. Look for: wet or oily staining around the valve cover gasket, oil filter, drain plug, or oil pan seams; black sludge buildup on the engine block; oil residue burned onto exhaust components (dark carbonized residue on headers). Report exactly what you see.',
  coolant_water_pump:
    'Inspect this image for coolant system issues. Look for: white or green crusty residue around hose clamps, the water pump housing, or radiator fittings; low or empty reservoir; wet staining from the water pump weep hole below the pulley. Report exactly what you see.',
  oil_condition:
    'Inspect this image of the engine oil. Look at the dipstick or oil filler cap area. Assess: oil color (amber/brown=normal, black=old, milky/creamy=coolant contamination); visible metallic particles; sludge buildup inside the valve cover opening. Report exactly what you see.',
  belts_hoses:
    'Inspect this image of engine belts and hoses. Look for: cracks, fraying, or a shiny glazed surface on the serpentine belt; soft, collapsed, cracked, or brittle coolant hoses; any hose with bulging near clamps. Report exactly what you see.',
  battery:
    'Inspect this battery image. Look for: white or blue-green corrosion powder on either terminal; a swollen or bulging battery casing; any melted or amateur wiring near the terminals. Report exactly what you see.',
  frame_rust:
    'Inspect this underbody image for rust and structural damage. Look for: holes or perforations in the frame rails or floor pans; scale rust (thick flaking layers, not just surface discoloration) on structural members; freshly applied undercoating that may be hiding rust; deformed or crumpled metal. Report exactly what you see.',
  exhaust:
    'Inspect this exhaust system image. Look for: rust holes or patch welds on pipes or muffler; oily wet residue inside the tailpipe (oil burning); white chalky deposits inside the tailpipe (coolant burning); missing or compromised catalytic converter heat shield. Report exactly what you see.',
  cv_suspension:
    'Inspect this wheel or suspension area image. Look for: torn, cracked, or split rubber CV boots with grease sprayed outward; grease splatter on the inner wheel well liner; any visible damage to suspension arms or ball joint boots. Report exactly what you see.',
  brake_lines:
    'Inspect this brake line image. Look for: rust bubbles or corrosion on metal brake lines; cracked, swollen, or kinked rubber flex hoses near wheels; any wetness indicating brake fluid leakage at fittings or along lines. Report exactly what you see.',
  trans_fluid:
    'Inspect this transmission area image. Look for: dark staining or wetness around the transmission pan edges or drain plug; fresh fluid drips on the underside; any evidence of a leaking gasket. Report exactly what you see.',
  shift_quality:
    'Inspect this gear shifter or transmission tunnel area. Look for: worn or cracked shift boot; excessive play in the shifter; aftermarket components that may indicate a modified transmission. Report exactly what you see.',
  pads_rotors:
    'Inspect this brake rotor and caliper image. Look for: deep grooves or scoring on the rotor face; pad material thickness (thin=less than 2mm); rust grooves indicating neglect; uneven wear on one side vs the other. Report exactly what you see.',
  brake_fluid_level:
    'Inspect this brake fluid reservoir image. Look for: fluid level relative to min/max lines on the reservoir; fluid color (clear/light yellow=good, dark brown/black=old and water-saturated); any wetness on the outside of the reservoir. Report exactly what you see.',
  warning_lights:
    'Inspect this dashboard image with the key in the ON position. Look for: any warning lights that remain illuminated — check engine, ABS, airbag/SRS, traction control, oil pressure; lights that should illuminate during the self-test but do not (bulb removed). Report exactly what you see.',
  obd_scan:
    'Inspect this OBD2 port image (under the driver-side dash). Look for: any device currently plugged in such as a Bluetooth adapter, Cobb Accessport, or HP Tuners device; damage to the port connector; any non-stock wiring in the area. Report exactly what you see.',
  ecu_software:
    'Inspect this OBD2 port area for signs of ECU tuning. Look for: any performance tuner device plugged in (Cobb Accessport, HP Tuners dongle, EFI Live, etc.); aftermarket wiring tap near the port; any sticker or label indicating a tune. Report exactly what you see.',
  odometer_fraud:
    'Inspect this image for odometer fraud indicators. If showing the odometer: check for misaligned digits or inconsistent font. If showing interior wear: assess if steering wheel, pedal rubber, or seat bolster wear is consistent with the claimed mileage. Heavily worn interiors on "low mileage" cars are a red flag. Report exactly what you see.',
  paint_match:
    'Inspect this vehicle exterior image for paint consistency. Look for: differences in sheen, texture, or exact color shade between adjacent panels; orange-peel texture that differs between panels; overspray on rubber trim, window seals, or door jamb edges. Report exactly what you see.',
  panel_gaps:
    'Inspect this panel gap image. Look for: uneven gap width between adjacent panels (hood-to-fender, door-to-door, trunk-to-quarter); panels sitting higher on one side than the other; ripples or waves in the sheet metal visible as light rakes across it. Report exactly what you see.',
  hidden_damage:
    'Inspect this image for hidden accident damage. Look for: scratched, rounded, or tool-marked bolt/fastener heads on fenders, hood hinges, or door hinges; selectively applied fresh undercoating on specific panels while surrounding areas are bare; mismatched inner door frame color vs outer paint. Report exactly what you see.',
  wear_vs_mileage:
    'Inspect this interior wear image. Assess: steering wheel leather or grip surface condition; driver seat bolster shape (should hold its original contour on low-mileage cars); pedal rubber texture (should have raised ridges, not smooth); door handle plastic polish. Determine if wear is consistent with the claimed mileage. Report exactly what you see.',
  ac_heat:
    'Inspect this climate control or vent area image. Look for: visible mold or dark residue around vent openings (indicates evaporator mold); damaged or missing vent louvers; aftermarket or non-stock HVAC components. Report exactly what you see.',
  smoke_water:
    'Inspect this interior floor or carpet area. Look for: water staining on carpet fibers or padding; mold or mildew discoloration; rust staining on floor pan fasteners or seat rail bolts; evidence of recent deep cleaning that may be masking flood damage. Report exactly what you see.',
};

const DEFAULT_PROMPT =
  'Inspect this vehicle component image for any visible defects, damage, wear, or red flags that would concern a used car buyer. Report exactly what you observe.';

export const PHOTO_HINTS: Record<string, string> = {
  oil_leak:           'Point camera at the engine block, valve cover edges, and oil filter area.',
  coolant_water_pump: 'Photograph the water pump, coolant hoses, and overflow reservoir.',
  oil_condition:      'Photograph the dipstick after pulling it, or inside the oil filler cap.',
  belts_hoses:        'Capture the serpentine belt and the large radiator hoses.',
  battery:            'Photograph both battery terminals and the battery casing top.',
  frame_rust:         'Aim camera under the vehicle at the frame rails and floor pans.',
  exhaust:            'Photograph the muffler, tailpipe opening, and visible exhaust pipes.',
  cv_suspension:      'Capture the rubber CV boot at the end of the axle shaft near the wheel hub.',
  brake_lines:        'Photograph the metal lines tracing along the frame toward the wheels.',
  trans_fluid:        'Photograph the transmission pan and surrounding area for staining.',
  shift_quality:      'Photograph the gear shifter and transmission tunnel area.',
  pads_rotors:        'Look through wheel spokes and photograph the rotor face and caliper.',
  brake_fluid_level:  'Photograph the brake fluid reservoir near the firewall.',
  warning_lights:     'Turn key to ON (engine off) and photograph the dashboard lights.',
  obd_scan:           'Photograph the OBD2 port under the driver-side dash.',
  ecu_software:       'Photograph the OBD2 port — capture any device plugged into it.',
  odometer_fraud:     'Photograph the odometer display, steering wheel, and driver-side door jamb sticker.',
  paint_match:        'Step back and photograph two adjacent body panels in the same frame.',
  panel_gaps:         'Photograph the gap between hood and fender, or door edges.',
  hidden_damage:      'Photograph the bolt heads on fender mounting points and hood hinges.',
  wear_vs_mileage:    'Photograph the steering wheel grip, pedal rubber, and driver seat bolster.',
  ac_heat:            'Photograph the A/C vents and climate control buttons.',
  smoke_water:        'Lift the floor mat and photograph the carpet and floor pan beneath it.',
};

export const PHOTO_TARGETS: Record<string, string> = {
  oil_leak:           'oil leak area',
  coolant_water_pump: 'water pump',
  oil_condition:      'oil sample',
  belts_hoses:        'belt or hose',
  battery:            'battery terminal',
  frame_rust:         'frame rail',
  exhaust:            'exhaust pipe',
  cv_suspension:      'CV boot',
  brake_lines:        'brake line',
  trans_fluid:        'transmission pan',
  shift_quality:      'gear shifter',
  pads_rotors:        'brake caliper',
  brake_fluid_level:  'brake fluid reservoir',
  warning_lights:     'warning lights',
  obd_scan:           'OBD2 port',
  ecu_software:       'OBD2 device',
  odometer_fraud:     'odometer',
  paint_match:        'panel edge',
  panel_gaps:         'panel gap',
  hidden_damage:      'hinge bolts',
  wear_vs_mileage:    'wear area',
  ac_heat:            'A/C vent',
  smoke_water:        'carpet area',
};

export async function analyzeCheckItem(
  base64Image: string,
  savedUri: string,
  checkId: string,
): Promise<CheckItemAnalysis> {
  const apiKey = (Constants.expoConfig?.extra?.anthropicApiKey as string | undefined)
    ?? process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

  if (!apiKey) throw new Error('API key not configured.');

  const prompt = CHECK_PROMPTS[checkId] ?? DEFAULT_PROMPT;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: base64Image },
            },
            {
              type: 'text',
              text: `${prompt}

Respond with valid JSON only — no markdown fences, no extra text:
{
  "verdict": "ok" | "concern" | "problem",
  "summary": "One concise sentence describing the overall finding.",
  "details": ["specific observation 1", "specific observation 2"]
}

Use "ok" if everything looks normal and acceptable.
Use "concern" if there are minor issues worth noting or monitoring.
Use "problem" if there are clear defects or red flags that need action.`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const raw: string = data.content?.[0]?.text ?? '{}';

  let parsed: { verdict?: string; summary?: string; details?: unknown };
  try {
    const clean = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
    parsed = JSON.parse(clean);
  } catch {
    parsed = {};
  }

  const verdict = (['ok', 'concern', 'problem'] as const).includes(parsed.verdict as any)
    ? (parsed.verdict as CheckItemAnalysis['verdict'])
    : 'concern';

  return {
    verdict,
    summary: typeof parsed.summary === 'string' ? parsed.summary : 'Analysis complete.',
    details: Array.isArray(parsed.details) ? (parsed.details as string[]) : [],
    imageUri: savedUri,
  };
}
