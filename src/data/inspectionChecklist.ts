export interface CheckItem {
  id: string;
  title: string;
  how: string;
  redFlags: string[];
  tip?: string;
}

export interface InspectionSystem {
  id: string;
  label: string;
  icon: string;
  checks: CheckItem[];
}

export const INSPECTION_SYSTEMS: InspectionSystem[] = [
  {
    id: 'engine',
    label: 'Engine Bay',
    icon: 'settings-outline',
    checks: [
      {
        id: 'oil_leak',
        title: 'Oil Leaks',
        how: 'Inspect the valve cover gasket, oil filter, drain plug, and oil pan for residue or staining. Wipe a clean cloth near each seam. Check under the car for fresh drips after idling 5 minutes.',
        redFlags: [
          'Active drip forming from any gasket or seam',
          'Heavy black sludge coating on the engine block',
          'Oil residue burned onto exhaust headers (smoking smell at operating temp)',
          'Puddle forming under the car within 10 minutes of shutoff',
        ],
        tip: 'A minor seep on a high-mileage engine is common. An active drip is a negotiation point or a deal-breaker.',
      },
      {
        id: 'coolant_water_pump',
        title: 'Coolant & Water Pump',
        how: 'Check the coolant reservoir level (between min/max marks). Look for white or green crust around hose clamps, the water pump housing, thermostat, and radiator. Inspect the small weep hole below the water pump pulley for seepage.',
        redFlags: [
          'Reservoir empty or significantly below minimum',
          'White crusty residue on hoses, water pump, or radiator cap',
          'Milky or frothy oil on the dipstick (coolant mixing with oil — likely head gasket)',
          'White smoke from exhaust at operating temperature',
          'Active drip or staining from the water pump weep hole',
        ],
        tip: 'A cold engine is safest to inspect — never open a hot radiator cap.',
      },
      {
        id: 'oil_condition',
        title: 'Oil Level & Condition',
        how: 'Pull the dipstick, wipe clean, reinsert fully, pull again. Color should be amber to brown. Remove the oil filler cap and look inside for sludge. Ask when oil was last changed.',
        redFlags: [
          'Black, gritty, or tar-like oil',
          'Milky or creamy oil (water/coolant contamination — serious)',
          'Metallic sheen or particles visible on dipstick',
          'Level below the minimum mark',
          'Thick sludge buildup visible inside the valve cover',
        ],
        tip: 'Fresh golden oil on a car claimed to have 90k miles is suspicious — sellers sometimes do a quick change to hide neglect.',
      },
      {
        id: 'belts_hoses',
        title: 'Belts & Hoses',
        how: 'Squeeze each radiator hose — should feel firm, not spongy or brittle. Inspect the serpentine belt for cracks, fraying, or a glazed/shiny surface. Look for a timing belt service sticker in the engine bay.',
        redFlags: [
          'Cracked, frayed, or glazed serpentine belt',
          'Soft, spongy, hard, or brittle coolant hoses',
          'No timing belt replacement record on an interference engine',
          'Squealing or chirping on cold startup',
        ],
        tip: 'Timing belt replacement is expensive — if it\'s overdue on an interference engine (Civic, Accord, VW, etc.), the engine can be destroyed if it snaps.',
      },
      {
        id: 'battery',
        title: 'Battery & Terminals',
        how: 'Check terminals for corrosion (white or blue-green powder). Look at the date sticker on the battery. A very fresh battery on a car being sold may mean the seller cleared fault codes.',
        redFlags: [
          'Heavy white or blue corrosion on either terminal',
          'Swollen or bulging battery casing',
          'Brand-new battery with no explanation offered',
          'Amateur splicing or non-stock wiring near the battery',
        ],
        tip: 'Disconnecting the battery resets the ECU and clears fault codes. Incomplete OBD readiness monitors after a battery change confirm this.',
      },
    ],
  },
  {
    id: 'underbody',
    label: 'Underbody & Frame',
    icon: 'layers-outline',
    checks: [
      {
        id: 'frame_rust',
        title: 'Frame & Floor Pan Rust',
        how: 'Crouch down and scan the frame rails, subframe mounts, and floor pans with a flashlight. Tap suspicious areas with a screwdriver handle — solid metal sounds dull, severely rusted metal sounds hollow or breaks through.',
        redFlags: [
          'Holes or perforations anywhere on the frame or floor pan',
          'Scale rust (thick flaking layers) on structural rails — not just surface rust',
          'Previously patched areas hidden under fresh undercoating spray',
          'Screwdriver tip penetrates metal under firm pressure',
        ],
        tip: 'Light surface rust on the underbody is normal in northern states. Structural frame rust is a safety issue and will fail inspection.',
      },
      {
        id: 'exhaust',
        title: 'Exhaust System',
        how: 'With the engine warm, listen for ticking or hissing from the manifold area. Check muffler and pipes for rust holes or patch welds. Look inside the tailpipe — carbon is normal, but oily or white residue is not.',
        redFlags: [
          'Rust holes or patch welds on pipes or muffler',
          'Oily or wet residue inside the tailpipe (oil burning)',
          'White chalky deposit inside tailpipe (coolant burning — head gasket)',
          'RPM-linked ticking from engine bay (exhaust manifold crack)',
          'Missing or hollowed-out catalytic converter (emissions defeat)',
        ],
      },
      {
        id: 'cv_suspension',
        title: 'CV Boots & Suspension',
        how: 'Look at the rubber CV boot at the end of each axle shaft for cracks or tears. Check for grease splatter on the wheel well inner liner. Bounce each corner firmly — should rebound once and stop.',
        redFlags: [
          'Torn or split CV boot with grease sprayed around the wheel well',
          'Clicking when turning at full lock (CV joint failure)',
          'More than one rebound when you push down on a corner (worn shocks)',
          'Clunking over bumps from any corner (worn ball joint or bushing)',
        ],
      },
      {
        id: 'brake_lines',
        title: 'Brake Lines',
        how: 'Trace metal brake lines from the master cylinder toward each wheel. Look for rust bubbles, pinching, or corrosion. Check rubber flex hoses near each wheel for cracking, swelling, or wetness.',
        redFlags: [
          'Rust bubbles on metal brake lines anywhere along their length',
          'Cracked, swollen, or kinked rubber flex hoses',
          'Any brake fluid wetness on a caliper, line, or fitting',
        ],
      },
    ],
  },
  {
    id: 'transmission',
    label: 'Transmission',
    icon: 'git-merge-outline',
    checks: [
      {
        id: 'trans_fluid',
        title: 'Fluid Condition',
        how: 'For automatics with a dipstick: check color (should be red/pink) and smell (slightly sweet, not burnt). For sealed/CVT transmissions, look for leaks at the pan and check service records for fluid changes.',
        redFlags: [
          'Dark brown or black fluid with a burnt smell',
          'Frothy or milky fluid (water ingestion)',
          'Metal flakes visible on the dipstick',
          'Wetness or staining around the transmission pan or drain plug',
        ],
      },
      {
        id: 'shift_quality',
        title: 'Shift Quality',
        how: 'Drive through all gears at light and moderate throttle. Then accelerate briskly from 30 to 60 mph. Each shift should be smooth and prompt. For CVTs: no rubber-band hunting or shuddering under load.',
        redFlags: [
          'Harsh, clunky, or delayed gear changes',
          'Engine revs climb without vehicle speed increasing (slipping)',
          'Shudder or vibration at a specific speed or during gear changes',
          'Whining or droning from under the car at any speed',
          'Long delay or jolt when engaging Drive or Reverse from Park',
        ],
        tip: 'Let the transmission warm up for 5 minutes before making a final judgment on cold shifts.',
      },
    ],
  },
  {
    id: 'brakes',
    label: 'Brakes',
    icon: 'stop-circle-outline',
    checks: [
      {
        id: 'pads_rotors',
        title: 'Pads & Rotors',
        how: 'Peer through the wheel spokes at the rotor face — should be smooth with a light wear ring. Look for pad material thickness at the caliper. On a test drive, brake firmly from 40 mph on a clear road.',
        redFlags: [
          'Deep grooves or scoring on the rotor face',
          'Metallic grinding or squealing when braking',
          'Car pulls to one side under braking',
          'Pad material visibly less than 2mm (paper-thin)',
          'Pulsating or vibrating pedal when stopping',
        ],
      },
      {
        id: 'brake_fluid_level',
        title: 'Brake Fluid',
        how: 'Check the reservoir near the firewall. Level should be between min and max lines. Color should be clear to light yellow, not dark brown.',
        redFlags: [
          'Level at or below the minimum mark',
          'Dark brown or black fluid (water-saturated, reduced boiling point)',
          'Wetness or residue on the outside of the reservoir',
        ],
      },
    ],
  },
  {
    id: 'electrical',
    label: 'Electrical & ECU',
    icon: 'flash-outline',
    checks: [
      {
        id: 'warning_lights',
        title: 'Dashboard Warning Lights',
        how: 'Turn the key to ON (engine off). All warning lights should illuminate for 2–3 seconds then go out — this is a self-test. Start the engine. No warning lights should remain on during normal operation.',
        redFlags: [
          'Check Engine, ABS, Airbag/SRS, or traction control light stays on',
          'Any light that does NOT illuminate during the key-ON self-test (bulb removed to hide a fault)',
          'Oil pressure or temperature light during warm operation',
        ],
        tip: 'The airbag/SRS light is critical — if it stays on or never lights up, the airbag system may not deploy in a crash.',
      },
      {
        id: 'obd_scan',
        title: 'OBD2 Port Scan',
        how: 'Plug a Bluetooth ELM327 OBD2 adapter (~$15 on Amazon) into the port under the driver-side dash. Use a free app (Torque, Car Scanner, OBD Fusion) to read stored codes, pending codes, and readiness monitor status.',
        redFlags: [
          'Any stored fault codes (P, B, C, or U codes)',
          'Pending codes — faults triggered once but not yet lighting the dash',
          '3 or more "Incomplete" readiness monitors (strong sign codes were recently cleared)',
          'ECU VIN does not match the door jamb VIN sticker',
        ],
        tip: 'Incomplete monitors = codes cleared within the last ~100 miles of driving. Classic pre-sale trick to hide active faults.',
      },
      {
        id: 'ecu_software',
        title: 'ECU Tune / External Software Override',
        how: 'Check the OBD2 port for any device left plugged in. Listen at idle and on deceleration. Ask the seller directly if the car has been tuned.',
        redFlags: [
          'Access port, Cobb Accessport, HP Tuners, or similar device in the OBD port',
          'Pop-and-crackle exhaust on deceleration on a stock-looking car',
          'Aftermarket cold air intake present (tune is almost always paired)',
          'Boost readings higher than factory spec on turbo cars',
          'Unusually aggressive throttle response or shift behavior',
          'ECU calibration date in scanner data is more recent than build date',
        ],
        tip: 'An ECU tune isn\'t always destructive, but it voids the powertrain warranty and often masks or causes other issues. Full disclosure should be expected.',
      },
      {
        id: 'odometer_fraud',
        title: 'Odometer Rollback',
        how: 'Compare the claimed mileage against physical wear: steering wheel leather, driver-seat bolster, pedal rubber, and the service sticker inside the door jamb. Run a free NMVTIS check or paid CarFax before the meeting.',
        redFlags: [
          'Steering wheel leather worn through for a "60,000-mile" car',
          'Pedal rubber worn smooth or recently replaced',
          'Driver seat bolster heavily compressed or reupholstered',
          'Door jamb service sticker shows a higher mileage than the odometer',
          'Odometer digits are misaligned or show a different font than factory',
        ],
        tip: 'NMVTIS is free at vehiclehistory.gov. If the seller refuses to provide the VIN before meeting, walk away.',
      },
    ],
  },
  {
    id: 'body',
    label: 'Body & Paint',
    icon: 'color-palette-outline',
    checks: [
      {
        id: 'paint_match',
        title: 'Paint Consistency',
        how: 'Crouch at bumper height and look down each side of the car in good light. Walk around slowly. The sheen, texture, and exact color shade should be identical across all panels.',
        redFlags: [
          'Different sheen or shade between adjacent panels',
          'Overspray on rubber trim, window seals, or inside door jambs',
          'Orange-peel texture inconsistency between repainted and original panels',
          'Fresh paint smell inside a vehicle with claimed age',
        ],
      },
      {
        id: 'panel_gaps',
        title: 'Panel Gaps & Alignment',
        how: 'Look at every panel gap: hood-to-fender, door-to-door, trunk-to-quarter. They should be even. Open and close all doors, the hood, and trunk lid.',
        redFlags: [
          'Uneven gap width anywhere around the body',
          'Hood or trunk sitting higher on one side than the other',
          'Door requiring unusual force to close, or not latching flush',
          'Visible ripples or waves in sheet metal when light rakes across it',
        ],
      },
      {
        id: 'hidden_damage',
        title: 'Hidden Accident Damage',
        how: 'Check bolt heads on the fenders, hood hinges, and door hinges for tool marks. Look for fresh undercoating sprayed selectively in the engine bay or wheel wells. Check that glass date codes are consistent.',
        redFlags: [
          'Scratched or rounded fastener heads in body-panel mounting areas',
          'Freshly sprayed undercoating on specific panels while surrounding areas are bare',
          'One window manufactured years after the others (replacement after accident)',
          'Mismatched color of inner door frame vs outer paint',
        ],
      },
    ],
  },
  {
    id: 'interior',
    label: 'Interior',
    icon: 'car-outline',
    checks: [
      {
        id: 'wear_vs_mileage',
        title: 'Wear vs Claimed Mileage',
        how: 'Check: steering wheel grip surface, driver seat bolster shape, pedal rubber texture, gear shifter wear, and floor mat condition. These wear predictably with genuine use.',
        redFlags: [
          'Steering wheel leather shiny or worn through on a claimed low-mileage car',
          'Driver seat bolster heavily sagged or reupholstered',
          'Pedal rubber smooth and rounded instead of textured',
          'Door handle plastic worn or polished from heavy use',
        ],
      },
      {
        id: 'ac_heat',
        title: 'A/C & Heat',
        how: 'Run A/C on maximum cold for 5 minutes — should blow cold within 2 minutes. Switch to full heat. Test all blower fan speeds. Activate front and rear defrost.',
        redFlags: [
          'A/C blows warm or barely cool after 3 minutes',
          'Musty or mildew smell from vents (evaporator mold — expensive fix)',
          'Blower only works on high speed (blower motor resistor failure)',
          'Rear defroster grid lines broken (not clearing the window)',
        ],
      },
      {
        id: 'smoke_water',
        title: 'Smoke & Water Damage',
        how: 'Smell the interior carefully with the car closed for a minute. Check under the carpet edges and floor mats for dampness or staining. Look under seats for rust on the floor pan.',
        redFlags: [
          'Persistent smoke or cigarette smell embedded in headliner and seats',
          'Musty, mildew, or sewage odor (flood damage)',
          'Damp or stained carpet under floor mats',
          'Rust staining on floor pan fasteners or seat rail bolts',
          'New air freshener or heavy cleaning smell masking odors',
        ],
      },
    ],
  },
];
