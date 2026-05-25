import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

export type FixCategory = 'suspension' | 'steering' | 'brakes' | 'drivetrain' | 'engine';
export type FixDifficulty = 'easy' | 'moderate' | 'advanced';
export type FixUrgency = 'monitor' | 'soon' | 'urgent' | 'do_not_drive';
export type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface DiagnosisSuggestion {
  id: string;
  category: FixCategory;
  symptom: string;
  shortSignal: string;
  icon: IoniconName;
  urgency: FixUrgency;
  difficulty: FixDifficulty;
  likelyCauses: string[];
  quickChecks: string[];
  tempFixes: string[];
  diyFixes: string[];
  buyingChecks?: string[];
  repairSteps?: string[];
  parts: string[];
  tools: string[];
  safetyNote: string;
}

export const CATEGORY_LABELS: Record<FixCategory | 'all', string> = {
  all: 'All',
  suspension: 'Suspension',
  steering: 'Steering',
  brakes: 'Brakes',
  drivetrain: 'Drivetrain',
  engine: 'Engine',
};

export const CATEGORY_ICONS: Record<FixCategory | 'all', IoniconName> = {
  all: 'apps-outline',
  suspension: 'git-branch-outline',
  steering: 'radio-button-on-outline',
  brakes: 'disc-outline',
  drivetrain: 'swap-horizontal-outline',
  engine: 'settings-outline',
};

export const DIAGNOSIS_SUGGESTIONS: DiagnosisSuggestion[] = [
  {
    id: 'front-click-over-bumps',
    category: 'suspension',
    symptom: 'Clicking or clunking from front suspension over bumps',
    shortSignal: 'Single knock over potholes, speed bumps, or driveway lips.',
    icon: 'git-branch-outline',
    urgency: 'soon',
    difficulty: 'moderate',
    likelyCauses: [
      'Worn sway bar end links or bushings',
      'Loose lower control arm bushing',
      'Ball joint with play',
      'Strut mount bearing or top hat movement',
    ],
    quickChecks: [
      'Bounce each front corner and listen near the strut tower.',
      'With the wheel lifted, check 12-and-6 play for ball joint movement.',
      'Check 3-and-9 play and inspect sway bar end links for looseness.',
      'Look for cracked rubber around control arm bushings.',
    ],
    tempFixes: [
      'Tighten loose sway bar link or strut tower hardware to spec if accessible.',
      'Avoid potholes, hard braking, and fast cornering until inspected.',
      'Use silicone spray only to confirm a squeaky bushing noise; it is not a repair.',
    ],
    diyFixes: [
      'Replace sway bar end links and bushings as a pair if play is present.',
      'Replace the lower control arm if the bushing is torn or the ball joint is integrated.',
      'Replace the ball joint if it is serviceable separately and alignment afterward is possible.',
    ],
    buyingChecks: [
      'Buy left and right sway bar end links if the click is light and the links move by hand.',
      'Buy sway bar frame bushings if the bar shifts side-to-side or the rubber is split.',
      'Buy a lower control arm assembly when the rear/front bushing is cracked, separated, or oil-soaked.',
      'Buy a serviceable ball joint only if your vehicle allows it separately; many cars need the full control arm.',
      'Match parts by year, make, model, trim, engine, and whether the car uses sport or standard suspension.',
    ],
    repairSteps: [
      'Park on level ground, loosen lug nuts slightly, lift the car, and support it with jack stands.',
      'Remove the wheel and compare both sides before taking anything apart.',
      'For sway bar links, remove the top and bottom link nuts, hold the stud with an Allen key if it spins, install the new link, and torque both nuts to spec.',
      'For sway bar bushings, unbolt the bushing brackets, clean the bar contact area, install the new split bushings in the same position, and tighten brackets evenly.',
      'For a control arm, support the knuckle, remove the ball joint nut/pinch bolt and arm bolts, transfer any brackets, install the new arm loosely, then final-torque the arm bolts at ride height.',
      'For a separate ball joint, press or bolt it in using the correct adapter, install a new cotter pin if used, then torque all hardware to spec.',
      'Reinstall the wheel, torque lug nuts, road-test slowly, then schedule an alignment after control arm or ball joint work.',
    ],
    parts: ['Sway bar end links', 'Sway bar bushings', 'Ball joint', 'Control arm assembly'],
    tools: ['Jack stands', 'Torque wrench', 'Breaker bar', 'Ball joint separator', 'Penetrating oil'],
    safetyNote: 'Do not keep driving if the wheel has visible play, the car wanders, or the clunk gets louder quickly.',
  },
  {
    id: 'turning-click-cv',
    category: 'drivetrain',
    symptom: 'Rapid clicking while turning at low speed',
    shortSignal: 'Repeated ticks during tight parking-lot turns.',
    icon: 'swap-horizontal-outline',
    urgency: 'soon',
    difficulty: 'moderate',
    likelyCauses: [
      'Outer CV axle joint wear',
      'Torn CV boot with grease loss',
      'Loose axle nut',
      'Wheel bearing noise mistaken for CV clicking',
    ],
    quickChecks: [
      'Inspect inner and outer CV boots for splits or grease spray.',
      'Drive slow circles left and right to identify which side clicks louder.',
      'Check axle nut and wheel lug torque if recent work was done.',
    ],
    tempFixes: [
      'Avoid full-lock steering and hard acceleration.',
      'If the boot just tore, install a boot kit soon before grit ruins the joint.',
    ],
    diyFixes: [
      'Replace the complete CV axle when clicking is already present.',
      'Replace only the boot if the joint is quiet and grease loss is fresh.',
      'Torque the axle nut exactly to spec and replace any one-time-use nut.',
    ],
    buyingChecks: [
      'Buy the complete CV axle for the clicking side when the outer joint clicks on turns.',
      'Buy a CV boot kit only if the boot recently tore and the joint is still quiet.',
      'Buy a new axle nut if the service manual marks it as one-time-use.',
      'Check whether your car uses ABS tone rings, different left/right axle lengths, or automatic/manual transmission-specific axles.',
      'Inspect the transmission or differential seal and buy a replacement if it is wet or damaged.',
    ],
    repairSteps: [
      'Loosen the axle nut with the wheel on the ground, then lift and support the vehicle safely.',
      'Remove the wheel, brake caliper bracket if needed for access, and axle nut.',
      'Disconnect the lower ball joint or outer tie rod as needed so the knuckle can swing outward.',
      'Push the axle splines out of the hub; use a puller if the splines are stuck.',
      'Pry the inner CV joint from the transmission or intermediate shaft, keeping a drain pan ready for fluid.',
      'Compare the old and new axle length, spline count, ABS ring, and seal surface before installation.',
      'Seat the new axle fully until the retaining clip locks, slide the outer splines into the hub, reassemble suspension hardware, and torque everything to spec.',
      'Top off any lost fluid, torque the axle nut with the vehicle loaded as specified, then test-drive slowly and check for leaks.',
    ],
    parts: ['CV axle assembly', 'CV boot kit', 'Axle nut', 'Transmission seal if leaking'],
    tools: ['Axle socket', 'Breaker bar', 'Pry bar', 'Torque wrench', 'Drain pan'],
    safetyNote: 'A failing CV joint can separate and leave the car unable to move; schedule the repair promptly.',
  },
  {
    id: 'stiff-steering',
    category: 'steering',
    symptom: 'Steering wheel feels stiff or heavy',
    shortSignal: 'Hard to turn at parking speeds or slow maneuvers.',
    icon: 'radio-button-on-outline',
    urgency: 'urgent',
    difficulty: 'moderate',
    likelyCauses: [
      'Low power steering fluid on hydraulic systems',
      'Power steering pump or belt issue',
      'Binding strut mount bearings',
      'Electric power steering fault',
      'Underinflated front tires',
    ],
    quickChecks: [
      'Check front tire pressure first.',
      'For hydraulic steering, inspect fluid level and look for leaks around hoses and rack boots.',
      'Listen for pump whine while turning.',
      'Scan for electric power steering fault codes if a warning light is on.',
    ],
    tempFixes: [
      'Top up with the exact specified power steering fluid if it is low.',
      'Inflate tires to the door-jamb specification.',
      'Avoid long drives if steering effort changes suddenly.',
    ],
    diyFixes: [
      'Replace a slipping accessory belt or weak tensioner.',
      'Flush contaminated power steering fluid if the system is noisy but not leaking badly.',
      'Replace leaking hoses or pump, then bleed the system.',
      'Replace binding strut mounts if stiffness pairs with spring popping.',
    ],
    parts: ['Power steering fluid', 'Accessory belt', 'Belt tensioner', 'Power steering pump', 'Strut mounts'],
    tools: ['Tire pressure gauge', 'OBD scanner', 'Line wrench set', 'Fluid transfer pump', 'Torque wrench'],
    safetyNote: 'If steering assist suddenly disappears or the steering binds, stop driving and tow the vehicle.',
  },
  {
    id: 'spongy-brake-pedal',
    category: 'brakes',
    symptom: 'Brake pedal feels spongy or sinks low',
    shortSignal: 'Pedal feels soft, travels too far, or pumps up after a few presses.',
    icon: 'disc-outline',
    urgency: 'do_not_drive',
    difficulty: 'moderate',
    likelyCauses: [
      'Air in brake lines',
      'Old or moisture-contaminated brake fluid',
      'External brake fluid leak',
      'Failing master cylinder',
      'Incorrectly adjusted rear drum brakes if equipped',
    ],
    quickChecks: [
      'Check brake fluid level before moving the car.',
      'Inspect calipers, wheel cylinders, lines, and master cylinder for wetness.',
      'With the engine off, press the pedal and see whether it slowly sinks.',
      'Look for recent brake work that may have introduced air.',
    ],
    tempFixes: [
      'There is no safe temporary fix for a leaking or sinking brake pedal.',
      'Top up only to move the car a few feet in a safe area, then repair the leak.',
    ],
    diyFixes: [
      'Bleed brakes in the correct wheel order using fresh DOT-rated fluid.',
      'Replace leaking calipers, wheel cylinders, hoses, or hard lines.',
      'Replace the master cylinder if the pedal sinks without external leaks.',
      'Adjust rear drums and inspect shoes if pedal travel remains long.',
    ],
    parts: ['Brake fluid', 'Bleeder screws', 'Brake hose', 'Caliper or wheel cylinder', 'Master cylinder'],
    tools: ['Brake bleeder bottle', 'Line wrench', 'Jack stands', 'Torque wrench', 'Brake cleaner'],
    safetyNote: 'Do not drive on public roads with a spongy, sinking, or leaking brake system.',
  },
  {
    id: 'brake-grind-squeal',
    category: 'brakes',
    symptom: 'Brake squeal, grinding, or scraping',
    shortSignal: 'High-pitch squeal or metal scrape while braking.',
    icon: 'disc-outline',
    urgency: 'urgent',
    difficulty: 'easy',
    likelyCauses: [
      'Pads worn to the wear indicator',
      'Pad backing plate contacting rotor',
      'Rust lip on rotor',
      'Stuck caliper slide pin',
    ],
    quickChecks: [
      'Inspect pad thickness through the wheel or after wheel removal.',
      'Check rotor faces for deep grooves or blue heat spots.',
      'Compare left and right pad wear for caliper slide problems.',
    ],
    tempFixes: [
      'Clean light dust and rust with brake cleaner during inspection.',
      'Drive gently only to reach a repair location if pads still have material.',
    ],
    diyFixes: [
      'Replace pads and hardware on both sides of the axle.',
      'Replace or resurface rotors when grooved, thin, or overheated.',
      'Clean and lubricate caliper slide pins with brake-safe grease.',
    ],
    parts: ['Brake pads', 'Rotors', 'Pad hardware kit', 'Caliper slide pin boots'],
    tools: ['Jack stands', 'C-clamp or caliper compressor', 'Torque wrench', 'Brake grease', 'Brake cleaner'],
    safetyNote: 'Grinding means braking material may be gone; avoid driving until the brakes are inspected.',
  },
  {
    id: 'engine-cranks-no-start',
    category: 'engine',
    symptom: 'Engine cranks but will not start',
    shortSignal: 'Starter spins the engine, but it never catches.',
    icon: 'settings-outline',
    urgency: 'soon',
    difficulty: 'moderate',
    likelyCauses: [
      'Weak battery despite cranking',
      'Fuel pump or relay failure',
      'No spark from ignition component',
      'Crankshaft position sensor failure',
      'Immobilizer/security issue',
    ],
    quickChecks: [
      'Confirm battery voltage and clean terminals.',
      'Listen for the fuel pump prime when keying on.',
      'Scan for stored codes before unplugging parts.',
      'Check whether the security light stays on.',
    ],
    tempFixes: [
      'Try a jump pack if cranking sounds slower than normal.',
      'Cycle the key on and off a few times if fuel pressure bleeds down.',
      'Swap an identical fuel pump relay only if the fuse box labeling confirms it.',
    ],
    diyFixes: [
      'Replace the battery if it fails a load test.',
      'Replace a failed fuel pump relay or pump after confirming power and ground.',
      'Replace a crank sensor only when codes or live data support the diagnosis.',
    ],
    parts: ['Battery', 'Fuel pump relay', 'Fuel pump', 'Crankshaft position sensor', 'Spark plugs'],
    tools: ['OBD scanner', 'Multimeter', 'Fuel pressure gauge', 'Jump pack', 'Basic socket set'],
    safetyNote: 'Avoid repeated long crank attempts; they can overheat the starter and drain the battery.',
  },
];
