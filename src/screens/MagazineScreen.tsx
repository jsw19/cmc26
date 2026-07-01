import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type MagazineCategory = 'home' | 'commute' | 'family' | 'business' | 'enthusiast';

interface CarFeature {
  name: string;
  bodyStyle: string;
  character: string;
  maintenance: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
}

interface CategoryFeature {
  id: MagazineCategory;
  title: string;
  subtitle: string;
  icon: string;
  accent: string;
  mood: string;
  editorNote: string;
  cars: CarFeature[];
}

const DIFFICULTY_LABELS: Record<CarFeature['difficulty'], string> = {
  1: 'Very easy',
  2: 'Easy',
  3: 'Moderate',
  4: 'Involved',
  5: 'Specialist',
};

const FEATURES: CategoryFeature[] = [
  {
    id: 'home',
    title: 'Home Use',
    subtitle: 'Simple, durable cars for errands, groceries, and everyday local driving.',
    icon: 'home-outline',
    accent: '#22c55e',
    mood: 'Quiet utility',
    editorNote: 'Look for clean service records, low tire wear, and a cabin that has survived real life gracefully.',
    cars: [
      {
        name: 'Toyota Corolla',
        bodyStyle: 'Compact sedan',
        character: 'Low-drama ownership with excellent fuel economy and easy parts availability.',
        maintenance: [
          'Change oil on schedule and check for seepage around the timing cover.',
          'Inspect tires and alignment because city use can hide curb impacts.',
          'Replace cabin and engine air filters regularly for short-trip driving.',
        ],
        difficulty: 1,
      },
      {
        name: 'Honda Fit',
        bodyStyle: 'Small hatchback',
        character: 'Tiny footprint, huge cargo flexibility, and friendly running costs.',
        maintenance: [
          'Keep transmission fluid fresh, especially on CVT models.',
          'Check rear hatch seals for water intrusion.',
          'Inspect suspension bushings if the car lived on rough roads.',
        ],
        difficulty: 2,
      },
    ],
  },
  {
    id: 'commute',
    title: 'Commute Use',
    subtitle: 'Efficient cars that make repeated miles feel calm instead of expensive.',
    icon: 'speedometer-outline',
    accent: '#38bdf8',
    mood: 'Miles made easy',
    editorNote: 'Prioritize seat comfort, driver-assist condition, tire noise, and maintenance intervals over flashy options.',
    cars: [
      {
        name: 'Toyota Prius',
        bodyStyle: 'Hybrid liftback',
        character: 'The long-commute classic: efficient, practical, and surprisingly tough.',
        maintenance: [
          'Check hybrid battery health and cooling fan cleanliness.',
          'Inspect brake condition carefully because regenerative braking can mask wear patterns.',
          'Keep coolant and inverter coolant service current.',
        ],
        difficulty: 3,
      },
      {
        name: 'Mazda3',
        bodyStyle: 'Compact sedan / hatch',
        character: 'Economical but more engaging than the usual commuter appliance.',
        maintenance: [
          'Watch for tire wear from spirited driving or poor alignment.',
          'Inspect lower body panels for rust in salt states.',
          'Use correct oil spec and keep spark plugs on interval.',
        ],
        difficulty: 2,
      },
    ],
  },
  {
    id: 'family',
    title: 'Family Use',
    subtitle: 'Room, safety, visibility, and low-stress maintenance matter most here.',
    icon: 'people-outline',
    accent: '#f59e0b',
    mood: 'Space with sense',
    editorNote: 'A family car should feel boring in the best way: predictable brakes, cold A/C, clean belts, and no mystery warning lights.',
    cars: [
      {
        name: 'Honda CR-V',
        bodyStyle: 'Compact SUV',
        character: 'Easy to park, roomy enough for daily family duty, and generally inexpensive to keep alive.',
        maintenance: [
          'Check A/C performance, suspension noise, and rear differential service on AWD models.',
          'Inspect brake pads and rotors because family SUVs often do heavy stop-and-go duty.',
          'Confirm oil-change history on turbo models.',
        ],
        difficulty: 2,
      },
      {
        name: 'Toyota Sienna',
        bodyStyle: 'Minivan',
        character: 'The practical answer when doors, seats, and cargo space all matter.',
        maintenance: [
          'Inspect sliding doors, door tracks, and power door motors.',
          'Check coolant service, brake wear, and tire age before long road trips.',
          'Look underneath for exhaust and rear suspension corrosion.',
        ],
        difficulty: 3,
      },
    ],
  },
  {
    id: 'business',
    title: 'Biz Use',
    subtitle: 'Professional, comfortable, presentable cars for clients, meetings, and highway miles.',
    icon: 'briefcase-outline',
    accent: '#a78bfa',
    mood: 'Polished mileage',
    editorNote: 'The best business car looks sharp without creating surprise invoices every quarter.',
    cars: [
      {
        name: 'Lexus ES',
        bodyStyle: 'Luxury sedan',
        character: 'Executive calm with Toyota-family reliability and low ownership drama.',
        maintenance: [
          'Keep tires matched and balanced to preserve the quiet ride.',
          'Check suspension bushings, engine mounts, and brake vibration.',
          'Service fluids by time as well as mileage if used mostly for short trips.',
        ],
        difficulty: 2,
      },
      {
        name: 'BMW 5 Series',
        bodyStyle: 'Executive sedan',
        character: 'Excellent highway manners, but it rewards owners who budget ahead.',
        maintenance: [
          'Inspect oil leaks, coolant plastics, valve cover, and charge pipes on turbo models.',
          'Budget proactively for tires, brakes, battery registration, and fluid service.',
          'Avoid cars with deferred maintenance or vague service history.',
        ],
        difficulty: 4,
      },
    ],
  },
  {
    id: 'enthusiast',
    title: 'Car Lover Use',
    subtitle: 'Cars with personality, feedback, and weekend appeal.',
    icon: 'flash-outline',
    accent: '#ef4444',
    mood: 'The long way home',
    editorNote: 'Buy condition first. A cheaper enthusiast car with hidden neglect is usually the expensive one.',
    cars: [
      {
        name: 'Mazda MX-5 Miata',
        bodyStyle: 'Roadster',
        character: 'Light, simple, charming, and more about feel than horsepower.',
        maintenance: [
          'Inspect soft top drains, rocker panels, and underbody rust.',
          'Check clutch feel, shifter feel, and differential leaks.',
          'Use quality tires; they transform the car more than power mods.',
        ],
        difficulty: 2,
      },
      {
        name: 'Porsche Cayman',
        bodyStyle: 'Mid-engine coupe',
        character: 'A precision sports car that deserves specialist attention.',
        maintenance: [
          'Get a pre-purchase inspection from a Porsche specialist.',
          'Check service records for brakes, tires, coolant pipes, and oil leaks.',
          'Budget for premium consumables even when nothing is broken.',
        ],
        difficulty: 5,
      },
    ],
  },
];

function DifficultyMeter({ value, color }: { value: CarFeature['difficulty']; color: string }) {
  return (
    <View style={styles.difficultyWrap}>
      <View style={styles.difficultyBars}>
        {[1, 2, 3, 4, 5].map((level) => (
          <View
            key={level}
            style={[
              styles.difficultyBar,
              level <= value && { backgroundColor: color, borderColor: color },
            ]}
          />
        ))}
      </View>
      <Text style={styles.difficultyText}>{DIFFICULTY_LABELS[value]}</Text>
    </View>
  );
}

function CarCard({ car, accent }: { car: CarFeature; accent: string }) {
  return (
    <View style={styles.carCard}>
      <View style={styles.carHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.carName}>{car.name}</Text>
          <Text style={styles.bodyStyle}>{car.bodyStyle}</Text>
        </View>
        <DifficultyMeter value={car.difficulty} color={accent} />
      </View>

      <Text style={styles.character}>{car.character}</Text>

      <Text style={styles.maintTitle}>Maintenance Watch</Text>
      {car.maintenance.map((item) => (
        <View key={item} style={styles.maintRow}>
          <Ionicons name="checkmark-circle-outline" size={14} color={accent} />
          <Text style={styles.maintText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export default function MagazineScreen() {
  const [activeId, setActiveId] = useState<MagazineCategory>('home');
  const active = FEATURES.find((item) => item.id === activeId) ?? FEATURES[0];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Collector Notes</Text>
          <Text style={styles.title}>Car Magazine</Text>
          <Text style={styles.subtitle}>
            Browse car personalities by use case, with maintenance notes and ownership difficulty.
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {FEATURES.map((category) => {
            const selected = category.id === activeId;
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryPill,
                  selected && { borderColor: category.accent, backgroundColor: `${category.accent}22` },
                ]}
                onPress={() => setActiveId(category.id)}
              >
                <Ionicons
                  name={category.icon as any}
                  size={15}
                  color={selected ? category.accent : '#888'}
                />
                <Text style={[styles.categoryPillText, selected && { color: '#fff' }]}>
                  {category.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={[styles.featureBand, { borderColor: active.accent }]}>
          <View style={[styles.featureIcon, { backgroundColor: `${active.accent}24` }]}>
            <Ionicons name={active.icon as any} size={28} color={active.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.mood}>{active.mood}</Text>
            <Text style={styles.featureTitle}>{active.title}</Text>
            <Text style={styles.featureSubtitle}>{active.subtitle}</Text>
          </View>
        </View>

        <View style={styles.editorNote}>
          <Ionicons name="newspaper-outline" size={16} color={active.accent} />
          <Text style={styles.editorNoteText}>{active.editorNote}</Text>
        </View>

        {active.cars.map((car) => (
          <CarCard key={car.name} car={car} accent={active.accent} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  scroll: {
    padding: 16,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 18,
  },
  kicker: {
    color: '#888',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginBottom: 6,
  },
  title: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
  },
  subtitle: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  categoryScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: '#171717',
    marginRight: 8,
  },
  categoryPillText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '700',
  },
  featureBand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    backgroundColor: '#151515',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  featureIcon: {
    width: 58,
    height: 58,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mood: {
    color: '#888',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginBottom: 3,
  },
  featureTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  featureSubtitle: {
    color: '#aaa',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  editorNote: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#121212',
    borderRadius: 8,
    padding: 13,
    borderWidth: 1,
    borderColor: '#242424',
    marginBottom: 14,
  },
  editorNoteText: {
    flex: 1,
    color: '#c7c7c7',
    fontSize: 13,
    lineHeight: 19,
  },
  carCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 12,
  },
  carHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  carName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  bodyStyle: {
    color: '#777',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  difficultyWrap: {
    alignItems: 'flex-end',
    gap: 5,
  },
  difficultyBars: {
    flexDirection: 'row',
    gap: 3,
  },
  difficultyBar: {
    width: 7,
    height: 22,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#111',
  },
  difficultyText: {
    color: '#aaa',
    fontSize: 10,
    fontWeight: '800',
  },
  character: {
    color: '#d0d0d0',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
    marginBottom: 12,
  },
  maintTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
  },
  maintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 7,
  },
  maintText: {
    flex: 1,
    color: '#aaa',
    fontSize: 12,
    lineHeight: 17,
  },
});
