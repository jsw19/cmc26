import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

export type LicenseReviewCategory =
  | 'signs'
  | 'right_of_way'
  | 'parking'
  | 'safe_driving'
  | 'impairment'
  | 'emergencies';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface PracticeQuestion {
  question: string;
  choices: string[];
  answer: string;
  explanation: string;
}

export interface LicenseReviewTopic {
  id: string;
  category: LicenseReviewCategory;
  title: string;
  summary: string;
  icon: IoniconName;
  keyRules: string[];
  watchFor: string[];
  memoryTip: string;
  practice: PracticeQuestion[];
}

export const LICENSE_CATEGORY_LABELS: Record<LicenseReviewCategory | 'all', string> = {
  all: 'All',
  signs: 'Signs',
  right_of_way: 'Right of Way',
  parking: 'Parking',
  safe_driving: 'Safe Driving',
  impairment: 'Impairment',
  emergencies: 'Emergencies',
};

export const LICENSE_CATEGORY_ICONS: Record<LicenseReviewCategory | 'all', IoniconName> = {
  all: 'apps-outline',
  signs: 'warning-outline',
  right_of_way: 'git-merge-outline',
  parking: 'business-outline',
  safe_driving: 'speedometer-outline',
  impairment: 'wine-outline',
  emergencies: 'medkit-outline',
};

export const LICENSE_REVIEW_TOPICS: LicenseReviewTopic[] = [
  {
    id: 'traffic-sign-shapes',
    category: 'signs',
    title: 'Traffic Sign Shapes and Colors',
    summary: 'Recognize signs quickly by shape, color, and symbol before reading the words.',
    icon: 'warning-outline',
    keyRules: [
      'Red means stop, yield, do not enter, or wrong way.',
      'Yellow warns of hazards, curves, crossings, and changing road conditions.',
      'Orange marks construction or maintenance zones.',
      'White signs usually give regulatory rules like speed limits or lane use.',
      'A railroad crossing warning is usually round; a school zone sign is usually pentagon-shaped.',
    ],
    watchFor: [
      'Test questions often ask what to do before the sign text is visible.',
      'Wrong-way and do-not-enter signs mean turn around only when it is safe.',
      'Construction signs may require lower speed even when workers are not visible.',
    ],
    memoryTip: 'Shape first, color second, words third. That order buys you time on the road and on the test.',
    practice: [
      {
        question: 'What does an orange sign usually mean?',
        choices: ['Hospital nearby', 'Construction or maintenance area', 'School crossing', 'Road closed permanently'],
        answer: 'Construction or maintenance area',
        explanation: 'Orange is used for temporary work zones, road crews, detours, and construction hazards.',
      },
      {
        question: 'A red eight-sided sign means:',
        choices: ['Yield', 'Stop', 'No passing', 'Railroad crossing'],
        answer: 'Stop',
        explanation: 'The eight-sided red sign is the stop sign shape used across the United States.',
      },
    ],
  },
  {
    id: 'right-of-way-intersections',
    category: 'right_of_way',
    title: 'Right of Way at Intersections',
    summary: 'Know who goes first at four-way stops, uncontrolled intersections, and left turns.',
    icon: 'git-merge-outline',
    keyRules: [
      'At a four-way stop, the first vehicle to stop should go first.',
      'If vehicles arrive at the same time, yield to the driver on your right.',
      'When turning left, yield to oncoming traffic unless you have a protected green arrow.',
      'Yield to pedestrians in crosswalks and to vehicles already in the intersection.',
      'Never assume another driver will yield just because the law says they should.',
    ],
    watchFor: [
      'Questions may say two cars arrive at the same time; look for the vehicle on the right.',
      'A green light does not automatically give a left-turning driver the right of way.',
      'Emergency vehicles with lights or sirens override normal right-of-way rules.',
    ],
    memoryTip: 'First stopped, first served. Tie goes to the right. Left turns wait for a clear gap.',
    practice: [
      {
        question: 'Two vehicles reach an uncontrolled intersection at the same time. Who should yield?',
        choices: ['The driver on the right', 'The driver on the left', 'The faster vehicle', 'The larger vehicle'],
        answer: 'The driver on the left',
        explanation: 'When arrival is simultaneous, the driver on the left yields to the driver on the right.',
      },
      {
        question: 'When turning left at a solid green light, you should:',
        choices: ['Turn immediately', 'Yield to oncoming traffic', 'Honk before turning', 'Stop until the light turns red'],
        answer: 'Yield to oncoming traffic',
        explanation: 'A solid green permits a left turn only after yielding to oncoming vehicles and pedestrians.',
      },
    ],
  },
  {
    id: 'parking-hills-curbs',
    category: 'parking',
    title: 'Parking on Hills',
    summary: 'Wheel direction changes based on uphill, downhill, and whether there is a curb.',
    icon: 'business-outline',
    keyRules: [
      'Downhill with a curb: turn wheels toward the curb.',
      'Uphill with a curb: turn wheels away from the curb.',
      'Without a curb: turn wheels toward the edge of the road.',
      'Always set the parking brake after positioning the wheels.',
      'Leave the vehicle in park for automatic transmissions or in gear for manual transmissions.',
    ],
    watchFor: [
      'The test may phrase this as where the car should roll if the brakes fail.',
      'No curb changes the uphill rule: wheels should point toward the road edge.',
      'Parking too close to intersections, hydrants, or crosswalks is usually prohibited.',
    ],
    memoryTip: 'Downhill rolls into the curb. Uphill with a curb rolls back into the curb.',
    practice: [
      {
        question: 'When parking downhill next to a curb, turn your front wheels:',
        choices: ['Away from the curb', 'Toward the curb', 'Straight ahead', 'Only if the hill is steep'],
        answer: 'Toward the curb',
        explanation: 'If the vehicle rolls, the curb helps stop it from entering traffic.',
      },
      {
        question: 'When parking uphill without a curb, turn your wheels:',
        choices: ['Toward the road edge', 'Away from the road edge', 'Straight ahead', 'Toward traffic'],
        answer: 'Toward the road edge',
        explanation: 'Without a curb, the vehicle should roll off the road rather than into traffic.',
      },
    ],
  },
  {
    id: 'following-distance',
    category: 'safe_driving',
    title: 'Following Distance and Speed',
    summary: 'Leave enough space to see, react, and stop in normal or poor conditions.',
    icon: 'speedometer-outline',
    keyRules: [
      'Use at least a three-second following distance in good conditions.',
      'Increase distance in rain, snow, fog, darkness, traffic, or when following large vehicles.',
      'Slow down before curves, ramps, intersections, and construction zones.',
      'Speed limits are maximums for ideal conditions, not guarantees of safe speed.',
      'Avoid driving in another vehicle blind spot longer than necessary.',
    ],
    watchFor: [
      'Many tests ask what to do in bad weather: slow down and increase following distance.',
      'Tailgating reduces reaction time and raises crash risk.',
      'Large trucks need more room to stop and make wide turns.',
    ],
    memoryTip: 'Three seconds is the floor. Bad weather, night, or heavy traffic means add more space.',
    practice: [
      {
        question: 'In heavy rain, you should usually:',
        choices: ['Drive at the posted speed limit', 'Use high beams', 'Increase following distance', 'Brake hard often'],
        answer: 'Increase following distance',
        explanation: 'Wet roads reduce traction and increase stopping distance, so more space is needed.',
      },
      {
        question: 'A posted speed limit tells you:',
        choices: ['The safest speed in all weather', 'The maximum legal speed in ideal conditions', 'The minimum speed', 'The speed large trucks must use'],
        answer: 'The maximum legal speed in ideal conditions',
        explanation: 'Drivers must slow below the limit when conditions make the limit unsafe.',
      },
    ],
  },
  {
    id: 'impairment-distraction',
    category: 'impairment',
    title: 'Impairment and Distraction',
    summary: 'Alcohol, drugs, fatigue, and phones all reduce reaction time and judgment.',
    icon: 'wine-outline',
    keyRules: [
      'Never drive after drinking or using impairing drugs.',
      'Prescription and over-the-counter medicine can impair driving.',
      'Texting takes eyes, hands, and attention away from driving.',
      'Fatigue can slow reaction time like alcohol impairment.',
      'A designated sober driver, rideshare, taxi, or transit is the safe plan.',
    ],
    watchFor: [
      'The test may ask whether coffee or a shower can sober someone up; only time can.',
      'Hands-free calls can still distract attention.',
      'Mixing alcohol with medication increases impairment risk.',
    ],
    memoryTip: 'If it slows your mind, eyes, or hands, it can make you unsafe behind the wheel.',
    practice: [
      {
        question: 'What is the only reliable way to become sober after drinking?',
        choices: ['Coffee', 'Cold shower', 'Exercise', 'Time'],
        answer: 'Time',
        explanation: 'The body needs time to process alcohol; shortcuts do not restore safe driving ability.',
      },
      {
        question: 'Texting while driving is dangerous because it:',
        choices: ['Only uses one hand', 'Distracts eyes, hands, and mind', 'Is safe at stop signs', 'Only matters on highways'],
        answer: 'Distracts eyes, hands, and mind',
        explanation: 'Texting combines visual, manual, and mental distraction.',
      },
    ],
  },
  {
    id: 'emergency-vehicles-crashes',
    category: 'emergencies',
    title: 'Emergency Vehicles and Crash Response',
    summary: 'Know how to react to sirens, roadside incidents, skids, and minor crashes.',
    icon: 'medkit-outline',
    keyRules: [
      'Pull to the right and stop for emergency vehicles using lights or sirens when safe.',
      'Move over or slow down for stopped emergency, tow, or road service vehicles where required.',
      'If you start to skid, ease off the accelerator and steer where you want to go.',
      'After a crash, check for injuries, move out of traffic if possible, and exchange information.',
      'Use hazard lights when stopped or disabled where visibility is a concern.',
    ],
    watchFor: [
      'Do not stop in an intersection for an emergency vehicle; clear it first if already inside.',
      'Sudden braking during a skid can make control worse.',
      'Move-over laws vary by state, but slowing down and giving space is the core idea.',
    ],
    memoryTip: 'Sirens need space. Skids need calm steering. Crashes need safety first.',
    practice: [
      {
        question: 'When an emergency vehicle approaches with lights or siren, you should usually:',
        choices: ['Speed up', 'Stop in your lane immediately', 'Pull right and stop when safe', 'Follow it through traffic'],
        answer: 'Pull right and stop when safe',
        explanation: 'Drivers should clear the way safely and remain stopped until the emergency vehicle passes.',
      },
      {
        question: 'If your vehicle begins to skid, you should:',
        choices: ['Slam the brakes', 'Steer where you want to go', 'Turn away from the road', 'Accelerate hard'],
        answer: 'Steer where you want to go',
        explanation: 'Ease off the accelerator and steer smoothly toward your intended path.',
      },
    ],
  },
];
