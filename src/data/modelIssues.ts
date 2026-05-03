export type IssueSeverity = 'low' | 'medium' | 'high';

export interface ModelIssueEntry {
  system: string;
  title: string;
  severity: IssueSeverity;
  yearsAffected: string;
  description: string;
  whatToCheck: string;
}

export interface KnownModelIssues {
  make: string;
  model: string;
  issues: ModelIssueEntry[];
}

export const MODEL_ISSUES: KnownModelIssues[] = [
  {
    make: 'Toyota',
    model: 'Camry',
    issues: [
      {
        system: 'Engine',
        title: 'Oil consumption — 2.5L 4-cylinder',
        severity: 'high',
        yearsAffected: '2012–2017 (2AR-FE)',
        description: 'The 2.5L engine in 5th and 6th gen Camrys is known to consume 1 quart of oil per 1,000–2,000 miles. Toyota acknowledged it but a full fix (piston ring replacement) was never widely completed under warranty.',
        whatToCheck: 'Check the dipstick — low level with a recent oil-change sticker is a red flag. Ask if the owner checks oil between changes. Request receipts showing frequent top-ups.',
      },
      {
        system: 'Transmission',
        title: 'Transmission shudder — 8-speed auto',
        severity: 'medium',
        yearsAffected: '2018–2021',
        description: 'Some 2018–2021 Camrys with the 8-speed automatic exhibit a torque converter shudder, most noticeable at light throttle around 30–50 mph.',
        whatToCheck: 'Test drive at steady light throttle on the highway. A subtle judder or vibration through the drivetrain is the symptom. Toyota has a TSB (fluid flush fix) that often helps.',
      },
      {
        system: 'Engine',
        title: 'Water pump failure',
        severity: 'medium',
        yearsAffected: '2007–2011 (2GR-FE V6)',
        description: 'The 3.5L V6 Camry\'s water pump is chain-driven and internal. Failure contaminates the oil and can cause major engine damage. Often silent until catastrophic.',
        whatToCheck: 'Check maintenance records for water pump replacement on V6 models. No external weep hole to inspect. Oil milkiness is a late sign. Ask if timing chain service has been done.',
      },
    ],
  },
  {
    make: 'Toyota',
    model: 'Corolla',
    issues: [
      {
        system: 'Engine',
        title: 'Oil burning — 1.8L (2ZR-FE)',
        severity: 'medium',
        yearsAffected: '2009–2013',
        description: 'Oil consumption of up to 1 quart per 1,200 miles was common and subject to a class-action settlement. Toyota issued a TSB for piston ring replacement.',
        whatToCheck: 'Check dipstick level carefully. Ask for oil-related service records. Cars with the recall-repaired piston rings are generally fine.',
      },
      {
        system: 'Engine',
        title: 'Timing chain noise',
        severity: 'medium',
        yearsAffected: '2009–2013',
        description: 'Stretched timing chains cause a rattling noise on cold startup that disappears when warm. Prolonged neglect leads to timing chain failure.',
        whatToCheck: 'Start the car cold and listen for a metallic rattle from the front of the engine for the first 10–20 seconds. Should go silent quickly. Any rattle that persists warrants inspection.',
      },
    ],
  },
  {
    make: 'Toyota',
    model: 'RAV4',
    issues: [
      {
        system: 'Engine',
        title: 'Oil consumption — 2.5L (2AR-FE)',
        severity: 'high',
        yearsAffected: '2013–2018',
        description: 'Same piston ring design as the Camry 2.5L. Subject to a class-action over excessive oil consumption. Check dipstick religiously on any pre-2019 RAV4.',
        whatToCheck: 'Check dipstick with the engine warmed up. Low oil with a "recent" oil change sticker is a major red flag. Ask about consumption history directly.',
      },
      {
        system: 'Electrical',
        title: 'Panoramic roof rattle / failure',
        severity: 'low',
        yearsAffected: '2019–2022',
        description: 'Sunroof glass and drainage channels were prone to rattles and in some cases cracked glass. A minor nuisance, not a safety issue.',
        whatToCheck: 'Open and close the sunroof. Listen for any squeaking or rattling on rough pavement.',
      },
    ],
  },
  {
    make: 'Toyota',
    model: 'Tacoma',
    issues: [
      {
        system: 'Frame',
        title: 'Frame rust perforation (recall)',
        severity: 'high',
        yearsAffected: '2005–2010',
        description: 'Toyota issued two recalls for frame rust. Some frames were replaced under warranty; others were repaired with anti-corrosion treatment. Perforated frames can fail structurally.',
        whatToCheck: 'Probe the frame rails with a screwdriver — it should not penetrate. Check for recall completion via NHTSA VIN lookup. Avoid any Tacoma in this range without documented frame inspection.',
      },
      {
        system: 'Drivetrain',
        title: 'Rear differential whine / leaf spring issue',
        severity: 'medium',
        yearsAffected: '2005–2015',
        description: 'Rear differential fluid is often neglected on 4WD models, causing whine. Leaf springs are prone to cracking, especially on work trucks.',
        whatToCheck: 'Listen for a droning whine from the rear at highway speed. Visually inspect leaf springs for cracks at the mounting eyes and mid-span. Check diff fluid was changed per schedule.',
      },
    ],
  },
  {
    make: 'Honda',
    model: 'Civic',
    issues: [
      {
        system: 'Engine',
        title: 'Oil dilution — 1.5T (L15B7)',
        severity: 'high',
        yearsAffected: '2016–2021',
        description: 'The turbocharged 1.5L engine can contaminate engine oil with gasoline in cold climates when short trips prevent the engine reaching full temperature. Caused a recall in China; Honda issued a workaround in the US (adjusted ECU). Severe dilution degrades lubrication.',
        whatToCheck: 'Pull the dipstick and smell it — gasoline smell in the oil indicates dilution. Check the oil level: diluted oil reads HIGH on the dipstick. If driven mostly on short trips in cold weather, consider it a significant concern.',
      },
      {
        system: 'Electrical',
        title: 'A/C condenser failure',
        severity: 'medium',
        yearsAffected: '2016–2021',
        description: 'Road debris easily punctures the exposed A/C condenser, causing refrigerant loss and warm A/C. Very common on 10th-gen Civics. Honda eventually added a guard.',
        whatToCheck: 'Run A/C on max cold for 5 minutes — should blow cold quickly. If A/C is weak, assume condenser damage and get a quote for replacement (usually $300–$600 parts + labor).',
      },
    ],
  },
  {
    make: 'Honda',
    model: 'Accord',
    issues: [
      {
        system: 'Engine',
        title: 'Oil dilution — 1.5T',
        severity: 'high',
        yearsAffected: '2018–2022',
        description: 'Same 1.5L turbo oil dilution issue as the Civic. Higher-displacement V6 and 2.0T versions are not affected.',
        whatToCheck: 'Smell and check the level of oil on the dipstick. A gasoline odor or oil reading above the max line are the indicators.',
      },
      {
        system: 'Transmission',
        title: '10-speed auto rough shifting',
        severity: 'medium',
        yearsAffected: '2018–2022 (2.0T)',
        description: 'The 10-speed automatic paired to the 2.0T engine was criticized for hesitant, clunky downshifts and occasional hunting between gears. Honda issued several software updates.',
        whatToCheck: 'Test drive at moderate throttle through city traffic. Firm downshifts and hesitation when calling for power are the signs. Check if any TSB updates have been applied.',
      },
    ],
  },
  {
    make: 'Honda',
    model: 'CR-V',
    issues: [
      {
        system: 'Engine',
        title: 'Oil dilution — 1.5T',
        severity: 'high',
        yearsAffected: '2017–2021',
        description: 'The 5th-gen CR-V\'s 1.5T is the most widely reported case of Honda\'s oil dilution problem. Class-action lawsuits were filed in the US. Worst in northern/cold climates.',
        whatToCheck: 'Same check as Civic/Accord — smell and level of dipstick oil. If the car has been used only for short commutes in a cold state, treat this as a high-risk item.',
      },
    ],
  },
  {
    make: 'Ford',
    model: 'F-150',
    issues: [
      {
        system: 'Engine',
        title: 'EcoBoost timing chain & oil leaks',
        severity: 'high',
        yearsAffected: '2011–2014 (3.5L EcoBoost)',
        description: 'Early EcoBoost F-150s developed timing chain stretch, phaser rattle on cold start, and oil leaks from the cam phaser solenoids. Repair cost can exceed $3,000.',
        whatToCheck: 'Start cold and listen for a metallic rattle from the front of the engine for the first 5–15 seconds. Look for oil wetness around the front cover and valley area. Ask for timing chain service history.',
      },
      {
        system: 'Engine',
        title: 'Spark plug blowout — 5.4L V8 (2-valve)',
        severity: 'high',
        yearsAffected: '2004–2010 (5.4L 2V)',
        description: 'The 5.4L 2-valve Triton V8 used only 4 threads to secure spark plugs, which can eject from the head under pressure — destroying the head.',
        whatToCheck: 'Ask if plugs have ever been replaced. Replacement is complex and expensive. Any rough idle, misfire, or past cylinder-1 issues are warning signs. Avoid buying with unknown plug history on high-mileage examples.',
      },
      {
        system: 'Drivetrain',
        title: '10-speed transmission shudder',
        severity: 'medium',
        yearsAffected: '2017–2020',
        description: 'The 10-speed automatic in 2017+ F-150s was prone to shudder, harsh shifts, and hunting between gears. Multiple software updates and fluid flushes were the typical fix.',
        whatToCheck: 'Steady highway cruise at 40–55 mph — look for a vibration or shudder. Firm downshifts on light deceleration are also a symptom.',
      },
    ],
  },
  {
    make: 'Ford',
    model: 'Explorer',
    issues: [
      {
        system: 'Electrical',
        title: 'Exhaust fumes in cabin',
        severity: 'high',
        yearsAffected: '2011–2017',
        description: 'A class-action and NHTSA investigation found that exhaust gases could enter the cabin through rear door seals and HVAC intakes. Carbon monoxide poisoning risk.',
        whatToCheck: 'Drive with windows up and all vents set to recirculate off. Any exhaust smell inside the car is an immediate deal-breaker on these model years. Check NHTSA for recall completion status.',
      },
      {
        system: 'Transmission',
        title: 'Rough shifts / hesitation',
        severity: 'medium',
        yearsAffected: '2013–2017 (6-speed)',
        description: 'The SelectShift 6-speed automatic developed issues with harsh engagement, hesitation from stops, and occasional slip complaints — multiple TSBs issued.',
        whatToCheck: 'Test drive from a cold start. Hesitation pulling into traffic and clunky low-speed shifts are the main signs.',
      },
    ],
  },
  {
    make: 'Ford',
    model: 'Focus',
    issues: [
      {
        system: 'Transmission',
        title: 'PowerShift DCT — shudder, slip, hesitation',
        severity: 'high',
        yearsAffected: '2012–2016 (DPS6)',
        description: 'The 6-speed dry dual-clutch PowerShift transmission was one of the most litigated automotive defects in recent history. Symptoms: shudder at low speeds, slip between gears, jerky takeoff. Ford settled for $47M. Many transmissions were replaced repeatedly without permanent fix.',
        whatToCheck: 'Any shudder or jerkiness below 20 mph is a major red flag. Check for repeated transmission replacements in service records. The only reliable fix for affected units is a used vehicle with proven TCM recalibration history — or avoid entirely.',
      },
    ],
  },
  {
    make: 'Chevrolet',
    model: 'Silverado',
    issues: [
      {
        system: 'Engine',
        title: 'AFM lifter failure — 5.3L V8',
        severity: 'high',
        yearsAffected: '2014–2021 (L83/L84)',
        description: 'The Active Fuel Management (cylinder deactivation) system causes premature camshaft and lifter wear on the 5.3L V8. Repair typically costs $3,000–$5,000. Extremely common failure on high-mileage examples.',
        whatToCheck: 'Listen for a ticking or tapping noise at idle that intensifies slightly with RPM. Check oil consumption — AFM-affected engines often burn oil. Ask if AFM has been disabled via tune or delete kit. Oil analysis records are ideal.',
      },
      {
        system: 'Engine',
        title: 'Fuel pump driver module failure',
        severity: 'medium',
        yearsAffected: '2014–2019',
        description: 'The FPDM (under the bed near the fuel tank) is prone to corrosion and failure, causing no-start, rough running, or stalling.',
        whatToCheck: 'Any intermittent stalling or hard starts. Check for active P0087 (fuel pressure low) codes via OBD scanner.',
      },
    ],
  },
  {
    make: 'Chevrolet',
    model: 'Equinox',
    issues: [
      {
        system: 'Engine',
        title: 'Oil consumption — 2.4L (LAF)',
        severity: 'high',
        yearsAffected: '2010–2017',
        description: 'The 2.4L Ecotec is known to consume 1 quart of oil every 2,000 miles or less due to piston ring design. Class-action settled. GM extended warranty coverage on affected engines.',
        whatToCheck: 'Check dipstick carefully. Ask about any engine replacement or warranty work. A car with a fresh GM remanufactured engine under extended warranty is actually preferable to an original.',
      },
    ],
  },
  {
    make: 'Subaru',
    model: 'Outback',
    issues: [
      {
        system: 'Engine',
        title: 'Head gasket failure — EJ engines',
        severity: 'high',
        yearsAffected: '1999–2011 (EJ25)',
        description: 'The EJ25 flat-four\'s external head gaskets were prone to weeping coolant externally. Later phase 2 gaskets were more durable. A full internal failure (coolant into oil) is less common but catastrophic.',
        whatToCheck: 'Look for white crust/residue around the engine block seam where the head meets the block. Check for milky oil or white exhaust smoke. Any coolant loss history without explanation points here.',
      },
      {
        system: 'Transmission',
        title: 'CVT failure — Lineartronic',
        severity: 'high',
        yearsAffected: '2015–2019',
        description: 'Subaru\'s Lineartronic CVT was prone to failure before 100,000 miles. Subaru extended coverage to 100k/10yr on many affected models due to class-action pressure.',
        whatToCheck: 'Any shudder, hesitation, or whining from the CVT is a serious concern. Check if the extended warranty is still active via the VIN. CVT replacement costs $5,000–$8,000.',
      },
    ],
  },
  {
    make: 'Subaru',
    model: 'Forester',
    issues: [
      {
        system: 'Engine',
        title: 'Head gasket failure — EJ engines',
        severity: 'high',
        yearsAffected: '1999–2010 (EJ25)',
        description: 'Same EJ25 head gasket issue as the Outback. Very common on pre-2011 Foresters. Budget $1,500–$2,500 for repair if not yet done.',
        whatToCheck: 'White crust on engine block side seam, coolant loss with no visible leak, milky dipstick, or white exhaust smoke when fully warm.',
      },
    ],
  },
  {
    make: 'Jeep',
    model: 'Wrangler',
    issues: [
      {
        system: 'Drivetrain',
        title: 'Death wobble — front axle',
        severity: 'high',
        yearsAffected: '2007–2018 (JK)',
        description: 'A violent front-end shimmy at highway speed triggered by a bump or imperfection. Caused by worn track bar, control arm bushings, or steering stabilizer. Can feel like losing control.',
        whatToCheck: 'Drive on a highway with expansion joints. Any front-end shimmy or shaking at 55+ mph is death wobble. Check all front suspension bushings for cracks and play in the track bar.',
      },
      {
        system: 'Engine',
        title: 'Oil leaks — 3.6L Pentastar',
        severity: 'medium',
        yearsAffected: '2012–2018',
        description: 'Valve cover gaskets and cam follower covers leak oil commonly on the Pentastar V6. Not typically catastrophic but messy and can damage accessories if ignored.',
        whatToCheck: 'Visible oil residue on the top of the engine, especially around the cam covers and rocker boxes.',
      },
    ],
  },
  {
    make: 'Jeep',
    model: 'Grand Cherokee',
    issues: [
      {
        system: 'Electrical',
        title: 'TIPM (Total Integrated Power Module) failure',
        severity: 'high',
        yearsAffected: '2011–2014',
        description: 'The TIPM is a central relay/fuse box. Failures cause erratic electrical behavior: random horn honking, fuel pump failure, windows not responding, wipers stuck on. TIPM replacement is $500–$1,200.',
        whatToCheck: 'Note any intermittent electrical oddities when test driving. Ask about any no-start events, random horn activations, or accessories that work unpredictably.',
      },
      {
        system: 'Transmission',
        title: '8HP transmission hesitation / shudder',
        severity: 'medium',
        yearsAffected: '2014–2020',
        description: 'The ZF 8-speed automatic occasionally hesitates when pulling from a stop or exhibits shudder. Usually resolved with a fluid flush and software update.',
        whatToCheck: 'Test slow-speed takeoff from traffic lights. A hesitation or slight jolt engaging first gear is the symptom.',
      },
    ],
  },
  {
    make: 'BMW',
    model: '3-Series',
    issues: [
      {
        system: 'Engine',
        title: 'N20/N26 timing chain failure',
        severity: 'high',
        yearsAffected: '2012–2015 (2.0L turbo)',
        description: 'The N20 engine\'s timing chain guide and tensioner fail prematurely, causing catastrophic engine failure if the chain jumps. Repair before failure is ~$1,500; after failure can be $8,000+.',
        whatToCheck: 'Cold-start rattle from the front of the engine that disappears is the warning sign. Any N20/N26 engine over 80k miles without documented timing service is risky. Run a VIN-based service history if possible.',
      },
      {
        system: 'Cooling',
        title: 'Cooling system failure — N52/N54',
        severity: 'high',
        yearsAffected: '2006–2013',
        description: 'BMWs of this era use plastic coolant components (thermostat housing, expansion tank, water pump) that fail around 80–100k miles. Neglecting them leads to overheating and head gasket damage.',
        whatToCheck: 'Inspect the coolant expansion tank for cracks. Check coolant hose condition. Ask for documented cooling system service. Any history of overheating is a disqualifier.',
      },
      {
        system: 'Engine',
        title: 'High oil consumption — N54/N63',
        severity: 'medium',
        yearsAffected: '2008–2013',
        description: 'The N54 twin-turbo and N63 V8 both consume oil — up to 1 quart per 1,500 miles. BMW considers this "normal." Owners disagree.',
        whatToCheck: 'Check dipstick. Ask the seller how often they add oil between changes. Receipts showing frequent oil additions confirm consumption.',
      },
    ],
  },
  {
    make: 'Hyundai',
    model: 'Sonata',
    issues: [
      {
        system: 'Engine',
        title: 'Theta II engine bearing failure / seizure',
        severity: 'high',
        yearsAffected: '2011–2019 (2.0T and 2.4L)',
        description: 'Metal debris from manufacturing contaminated engine bearings on millions of Theta II engines. Engines can seize without warning. Massive NHTSA investigation and recall — one of the largest in US history. Also affects Kia Optima, Sorento, Sportage of the same era.',
        whatToCheck: 'Verify the recall is completed via NHTSA VIN lookup before meeting the seller. Any ticking, knocking, or oil consumption is a red flag. Engines that seized were replaced under recall; confirm with service records.',
      },
    ],
  },
  {
    make: 'Kia',
    model: 'Optima',
    issues: [
      {
        system: 'Engine',
        title: 'Theta II engine bearing failure',
        severity: 'high',
        yearsAffected: '2011–2019 (2.0T and 2.4L)',
        description: 'Same catastrophic Theta II engine failure as Hyundai Sonata. Kia and Hyundai share the same engine family and recall. Risk of sudden engine seizure while driving.',
        whatToCheck: 'NHTSA VIN recall check before purchasing. Any engine noise, oil loss, or seizure history means walk away. Confirm recall completion with service records.',
      },
    ],
  },
  {
    make: 'Dodge',
    model: 'Ram 1500',
    issues: [
      {
        system: 'Engine',
        title: 'HEMI tick — MDS lifter issues',
        severity: 'medium',
        yearsAffected: '2009–2020 (5.7L HEMI)',
        description: 'The HEMI tick is a valve train noise common on 5.7L engines, often louder at idle. More serious in MDS-equipped trucks: the Multi-Displacement System causes similar AFM-style lifter wear as GM\'s 5.3L.',
        whatToCheck: 'Listen for a ticking at idle. A light tick is common and often benign; a loud clatter that worsens with RPM suggests lifter damage. Check oil level and color.',
      },
      {
        system: 'Electrical',
        title: 'TIPM electrical gremlins',
        severity: 'medium',
        yearsAffected: '2011–2013',
        description: 'Same Total Integrated Power Module issues as Jeep Grand Cherokee — random no-starts, horn issues, fuel pump relay failure.',
        whatToCheck: 'Note any intermittent electrical oddities. A no-start that resolves on its own points directly at TIPM.',
      },
    ],
  },
  {
    make: 'VW',
    model: 'Jetta',
    issues: [
      {
        system: 'Engine',
        title: 'Timing chain — 1.4T TSI',
        severity: 'high',
        yearsAffected: '2011–2018 (CAXA/CZTA)',
        description: 'The EA111 and EA211 1.4T engines stretch their timing chains earlier than expected, causing a cold-start rattle. If ignored, the chain can jump and bend valves.',
        whatToCheck: 'Cold-start rattle from the engine that disappears after 5–10 seconds. Request timing chain service history on any 1.4T over 80k miles.',
      },
      {
        system: 'Transmission',
        title: 'DSG dual-clutch hesitation and judder',
        severity: 'medium',
        yearsAffected: '2009–2017 (DQ200 dry DSG)',
        description: 'The 7-speed dry DSG (DQ200) on 4-cylinder Jettas is notorious for shudder, hesitation, and jerky low-speed behavior. Mechatronic unit failures add to the bill.',
        whatToCheck: 'Slow-speed crawling in parking lots is the worst case scenario — any judder or jerk under 20 mph is DSG characteristic. Ask if Haldex/mechatronic service has been performed.',
      },
    ],
  },
];

export const ALL_MAKES = [...new Set(MODEL_ISSUES.map((m) => m.make))].sort();

export function getModelsForMake(make: string): string[] {
  return MODEL_ISSUES.filter((m) => m.make === make).map((m) => m.model);
}

export function getIssuesForModel(make: string, model: string): KnownModelIssues | undefined {
  return MODEL_ISSUES.find((m) => m.make === make && m.model === model);
}
