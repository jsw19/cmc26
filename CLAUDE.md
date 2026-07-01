# CheckMyCar — Claude Code Guide

## Project Overview

CheckMyCar is a mobile app for AI-powered vehicle inspection, pre-purchase inspection (PPI), and private-party selling. Users photograph any vehicle area (underbody, engine bay, body panels, etc.) to detect corrosion, rust, dents, and structural damage via Claude vision. The app also guides buyers through the full used-car purchase process and helps sellers price their car for Facebook Marketplace and Craigslist.

## Tech Stack

- **Framework**: React Native with Expo (managed workflow)
- **Language**: TypeScript (strict)
- **Navigation**: Expo Router v3 (file-based) + React Navigation bottom tabs
- **Camera**: expo-camera
- **AI**: Claude API (`claude-sonnet-4-6`) for image analysis via vision
- **State**: React Context + useReducer (no Redux)
- **Persistence**: AsyncStorage (inspection history), expo-file-system (images)
- **Reports**: expo-print (HTML→PDF) + expo-sharing (share sheet)

## Project Structure

```
checkmycar/
├── app/                          # Expo Router screens
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Bottom tab bar — 5 tabs (Inspect, Buy, Sell, Fix, Learn)
│   │   ├── index.tsx             # Inspect tab — container: Home ↔ History segmented toggle
│   │   ├── preowned.tsx          # Buy tab — pre-owned market range guide
│   │   ├── sell.tsx              # Sell tab — AI scan + FB/CL listing price estimator
│   │   ├── fixmycar.tsx          # Fix tab — symptom starters + AI free-text diagnosis
│   │   └── license.tsx           # Learn tab — container: License Test ↔ Magazine toggle
│   ├── _layout.tsx               # Root layout (InspectionProvider, SafeArea)
│   ├── camera.tsx                # Full-screen camera capture (AI or local scan)
│   ├── analysis.tsx              # Inspection results (damage, cost, trade-in, sell)
│   └── buyercheck.tsx            # PPI screen — AI Scan | Checklist | Model Issues | Buyer Tips
├── src/
│   ├── sdk/                      # Reusable SDK — zero UI dependencies
│   │   ├── __tests__/            # Unit tests for the pure SDK functions
│   │   ├── index.ts              # Public exports
│   │   ├── types.ts              # All shared TypeScript types
│   │   ├── analyze.ts            # Claude API vision call + JSON parsing
│   │   ├── analyzeLocal.ts       # On-device HSV pixel analysis (offline fallback)
│   │   ├── decodeVin.ts          # VIN decoder (offline parse + NHTSA vPIC lookup)
│   │   ├── analyzeCheckItem.ts   # Claude API call scoped to a PPI checklist item
│   │   ├── diagnoseProblem.ts    # Claude API free-text symptom diagnosis (Fix tab)
│   │   ├── costEstimate.ts       # Repair cost estimator (regional multipliers)
│   │   ├── tradeInEstimate.ts    # Dealer trade-in + private-party value estimator
│   │   ├── sellingPrice.ts       # FB Marketplace / Craigslist listing price estimator
│   │   ├── preownedGuide.ts      # Pre-owned market range finder by budget + category
│   │   └── reportHtml.ts         # Builds printable HTML report from InspectionResult
│   ├── screens/                  # View components rendered inside container tabs
│   │   ├── HomeScreen.tsx        # Inspection launcher (Inspect tab)
│   │   ├── HistoryScreen.tsx     # Inspection history list (Inspect tab)
│   │   ├── LicenseScreen.tsx     # License knowledge review + quiz (Learn tab)
│   │   └── MagazineScreen.tsx    # Curated car picks by use-case (Learn tab)
│   ├── components/
│   │   ├── SeverityBadge.tsx     # Colored severity pill (none/minor/moderate/severe)
│   │   ├── SegmentedControl.tsx  # Pill toggle for sibling views in a tab
│   │   └── InspectionCard.tsx    # History list item card
│   ├── hooks/
│   │   ├── useLocationCostEstimate.ts  # Location-aware repair cost hook
│   │   ├── useTradeInEstimate.ts       # Location-aware trade-in hook
│   │   ├── useSellingPrice.ts          # Location-aware selling price hook
│   │   └── usePreownedGuide.ts         # Location-aware pre-owned guide hook
│   ├── context/
│   │   └── InspectionContext.tsx  # Global state: history, pending result, loading
│   ├── data/
│   │   ├── inspectionChecklist.ts # PPI checklist items grouped by system
│   │   ├── modelIssues.ts         # Known issues database by make/model
│   │   ├── diagnosisSuggestions.ts    # Static symptom→diagnosis DB (Fix tab)
│   │   └── licenseKnowledgeReview.ts  # License review topics + practice questions
│   ├── utils/
│   │   └── storage.ts             # AsyncStorage CRUD for InspectionResult[]
│   └── polyfills.ts
├── assets/
├── CLAUDE.md
├── app.json
├── package.json
└── tsconfig.json
```

## SDK Design

The `src/sdk/` module is the core reusable package with zero UI dependencies.

### analyzeVehicleImage
```ts
import { analyzeVehicleImage } from '@/src/sdk';

const result = await analyzeVehicleImage(base64, imageUri, { apiKey, vehiclePart: 'underbody' });
// → InspectionResult
```

### analyzeVehicleImageLocally
Offline fallback using HSV pixel classification (no API key needed). Same return shape as `analyzeVehicleImage`. Confidence capped at 0.88.

### analyzeCheckItem
Called by the PPI checklist camera. Scopes the Claude prompt to a specific checklist item ID (e.g. `'oil_leak'`, `'frame_rust'`).
```ts
const result = await analyzeCheckItem(base64, savedUri, checkId);
// → CheckItemAnalysis { verdict: 'ok'|'concern'|'problem', summary, details[] }
```

### decodeVin
Decodes a 17-char VIN to auto-fill `VehicleInfo`. Two layers: (1) pure offline parsing — format + ISO 3779 check-digit validation, model year (position 10, disambiguated via position 7), and manufacturing region (position 1); (2) online enrichment via the free NHTSA vPIC API (no key) for make/model/trim/body class/fuel, from which `inferCategory` derives a `VehicleCategory`. Falls back to the offline layer if the network call fails or times out — never throws for a bad VIN; check `.valid` / `.errorText`.
```ts
const decoded = await decodeVin(rawVin);
// → VinDecodeResult { vin, valid, year?, make?, model?, trim?, category?, countryRegion?, source: 'nhtsa'|'offline', errorText? }
```
Wired into the Sell tab's VIN field (`decodeVin` populates year/make/model/type).

### diagnoseProblem
LLM-backed free-text symptom diagnosis for the Fix tab. Sends a plain-English description ("clunk over bumps when turning left") to Claude and returns ranked, structured diagnoses in the same shape the static `diagnosisSuggestions` DB uses, so results drop straight into the existing card UI. Enums are defined locally (not imported from `src/data/`) to preserve the SDK's zero-UI-dependency rule.
```ts
const result = await diagnoseProblem(query, { apiKey, category, vehicle, maxResults });
// → DiagnoseResult { query, diagnoses: AIDiagnosis[], disclaimer }
```
Safety-first prompt: brake/steering/structural failures are forced to urgency `'do_not_drive'`. Returns an empty `diagnoses` array if the description is too vague.

### estimateRepairCosts
```ts
const estimate = estimateRepairCosts(damages, location);
// → CostEstimate { items[], totalMin, totalMax, currency, disclaimer }
```
Regional multipliers for 30+ countries/regions. Base costs per damage type + severity.

### estimateTradeInValue
```ts
const estimate = estimateTradeInValue(vehicleInfo, overallSeverity, location);
// → TradeInEstimate { tradeInValue, privatePartyValue, conditionLabel, factors[] }
```
Model: MSRP × depreciation curve × condition multiplier × mileage factor × regional market factor.

### estimateSellingPrice
```ts
const estimate = estimateSellingPrice(vehicleInfo, overallSeverity, location);
// → SellingPriceEstimate { idealSalePrice, listingPrice, quickSalePrice,
//     negotiationBuffer, platforms[PlatformListing], listingTips[], factors[] }
```
Builds on the same depreciation model as `estimateTradeInValue`. Outputs three price tiers (quick-sale, ideal, list-at) and per-platform listing prices + tips for Facebook Marketplace and Craigslist. `negotiationBuffer` scales with condition (6–12%).

### buildInspectionReportHtml
Builds a self-contained printable HTML document from an `InspectionResult` (photo, severity, summary, damages table, cost/trade-in/selling estimates, recommendations). Pure/testable — no UI deps. The photo, if included, is passed as a data URI so the PDF has no external references. All user/AI content is HTML-escaped.
```ts
const html = buildInspectionReportHtml(result, { imageDataUri });
```
The Analysis screen feeds this to `expo-print` (`printToFileAsync`) → PDF, then `expo-sharing` (`shareAsync`) via the "Share PDF Report" button.

### findPreownedCars
```ts
const guide = findPreownedCars(budget, location, category?);
// → PreownedGuideResult { tiers[MarketTier], currency, disclaimer }
```

## Key Types (`src/sdk/types.ts`)

| Type | Purpose |
|------|---------|
| `Severity` | `'none' \| 'minor' \| 'moderate' \| 'severe'` |
| `VehiclePart` | 8 values: underbody, front, rear, driver_side, passenger_side, roof, engine_bay, unknown |
| `DamageType` | 9 values: rust, corrosion, structural_damage, dent, scratch, crack, leak, wear, other |
| `DamageItem` | `{ type, location, severity, confidence: 0–1, description }` |
| `VehicleCategory` | economy, midsize, suv, truck, luxury, sports, electric |
| `VehicleInfo` | `{ year, make, model, mileage, category }` |
| `InspectionResult` | Core result — damages[], overallSeverity, summary, recommendations[], optional: costEstimate, tradeInEstimate, sellingPriceEstimate |
| `CostEstimate` | Repair cost breakdown with regional currency |
| `TradeInEstimate` | Dealer + private-party value range with factors |
| `SellingPriceEstimate` | Three-tier sell pricing + `PlatformListing[]` for FB/CL |
| `PlatformListing` | `{ platform, listingPrice, tips[] }` |
| `PreownedGuideResult` | Market tiers by vehicle segment |
| `LocationInfo` | `{ country, region?, label }` |

## Screens

### Inspect (`app/(tabs)/index.tsx`)
Container tab with a `SegmentedControl` toggling two views:
- **Home** (`src/screens/HomeScreen.tsx`) — 6-part inspection launcher grid; entry cards to Buyer Check, Sell, Fix, and Learn; recent inspections. "See all" flips the segment to History.
- **History** (`src/screens/HistoryScreen.tsx`) — full inspection history from AsyncStorage; tap any card → `analysis` screen.

### Buy / Pre-Owned Guide (`app/(tabs)/preowned.tsx`)
- Enter budget + segment filter
- Shows market price ranges by vehicle category for user's region

### Fix My Car (`app/(tabs)/fixmycar.tsx`)
- Problem-starter cards + category filter (suspension, steering, brakes, drivetrain, engine)
- Free-text symptom box → `diagnoseProblem` (Claude) → ranked `DiagnosisCard`s
- Falls back to the static `DIAGNOSIS_SUGGESTIONS` keyword DB when offline / no key
- Each diagnosis: likely causes, quick checks, temp fixes, DIY steps, parts/tools, safety note

### Learn (`app/(tabs)/license.tsx`)
Container tab with a `SegmentedControl` toggling two views:
- **License Test** (`src/screens/LicenseScreen.tsx`) — study topics grouped by category (signs, right-of-way, parking, safe driving, impairment, emergencies); per-topic key rules, "watch for" list, memory tip, and practice questions with explanations. Pure static data from `licenseKnowledgeReview.ts` — no API calls.
- **Magazine** (`src/screens/MagazineScreen.tsx`) — editorial-style curated car picks by use-case (home, commute, family, business, enthusiast); per-car body style, character, maintenance notes, and 1–5 difficulty rating. Fully static content — no API calls.

### Sell (`app/(tabs)/sell.tsx`)
- Vehicle info form (year, make, model, mileage, category)
- **VIN decode** — optional 17-char VIN field; "Decode" calls `decodeVin` and auto-fills year/make/model/type (offline fallback for year + region)
- **Condition via AI scan** — 6-part camera grid; `deriveSeverity()` picks worst-case across scanned parts; auto-populates condition and dims the manual picker
- Manual condition picker (fallback when skipping scan)
- "Get Selling Price Near Me" → `useSellingPrice` hook → `SellingPriceCard`
- Results: 3-tier price grid + FB Marketplace ↔ Craigslist tab toggle with tips
- `keyboardDismissMode="on-drag"` + `Pressable` wrapper for keyboard dismissal

### Camera (`app/camera.tsx`)
- Full-screen camera with guided overlay frame
- Mode toggle: AI Scan (Claude API) vs Local Scan (on-device HSV)
- Saves image to `FileSystem.documentDirectory/inspections/`
- Navigates to `analysis` on completion

### Analysis (`app/analysis.tsx`)
- Photo, severity badge, summary
- Damage item cards
- **Estimated Repair Cost** section (location-aware, hidden if no damage)
- **Trade-In Value** section — opens `VehicleInfoModal`, saves to `InspectionResult`
- **Sell on Marketplace** section — same modal (mode: `'sell'`), shows `SellingPriceCard` with platform tabs
- Recommendations
- **Share PDF Report** — `buildInspectionReportHtml` → `expo-print` PDF → `expo-sharing` (photo embedded as data URI; best-effort if the image can't be read)
- Delete / New Inspection actions

### Buyer Check (`app/buyercheck.tsx`)
Four tabs:

**AI Scan** — 6-part camera scan using `analyzeVehicleImage`; inline `InlineScanResult` cards with collapsible damage list; scanned part cards color-code by severity.

**Checklist** — Grouped accordion of PPI items (engine, underbody, transmission, brakes, electrical, body, interior). Per-item camera button calls `analyzeCheckItem` → `PhotoResultCard`. Pass/fail toggle per item.

**Model Issues** — Known issues database searchable by make/model. Severity badges (low/medium/high).

**Buyer Tips** — Accordion sections:
1. Complete Buying Process (CL / FB Marketplace) — 14 steps
2. Title Types & What They Mean — Clean, Salvage, Rebuilt, Lemon, Flood, Junk, Bonded, CoD
3. DMV Title Transfer Step by Step — 11 steps
4. FB Marketplace & Private Seller Red Flags
5. ECU & Software Override Signs
6. Odometer Rollback Tells
7. Questions to Ask the Seller
8. Free Tools to Use Before You Meet

## Hooks

All location hooks follow the same pattern:
1. Request foreground location permission
2. `getCurrentPositionAsync` → `reverseGeocodeAsync` → `LocationInfo`
3. Call the pure SDK function
4. Return `{ status, result, error, getEstimate }`

`status` values: `'idle' | 'loading' | 'done' | 'permission_denied' | 'error'`

Passing an `existingLocation` skips the GPS step (used in `analysis.tsx` to reuse a location already fetched for another estimate).

## Claude API Usage

- Model: `claude-sonnet-4-6` (vision-capable)
- Endpoint: `https://api.anthropic.com/v1/messages`
- Image sent as base64 `image` content block (JPEG, max 1024px after resize)
- Prompt returns structured JSON; response parser strips markdown fences before `JSON.parse`
- Error codes: `AUTH_ERROR`, `API_ERROR`, `PARSE_ERROR`, `IMAGE_ERROR`
- API key: `EXPO_PUBLIC_ANTHROPIC_API_KEY` in `.env`; accessed via `expo-constants` with `process.env` fallback

## Key Conventions

- All screens in `app/` via Expo Router file-based routing
- Functional components + hooks only — no class components
- TypeScript strict mode; no `any` without an explanatory comment
- SDK functions are pure (no UI imports, no hooks, no side effects)
- Async operations wrapped in try/catch; errors surfaced via hook `status`/`error` state
- Images persisted to `FileSystem.documentDirectory/inspections/`
- Inspection history serialized as `InspectionResult[]` in AsyncStorage (key: `checkmycar_history`)
- Dark theme throughout: `#0f0f0f` background, `#1a1a1a` cards, `#2a2a2a` borders
- Sell/marketplace accent color: amber `#f59e0b` / `#92400e`
- Buy/safe accent color: blue `#3b82f6`

## Environment

```
EXPO_PUBLIC_ANTHROPIC_API_KEY=your_key_here
```

## Running the Project

```bash
npx expo start            # Start dev server
npx expo start --ios      # iOS simulator
npx expo start --android  # Android emulator
npx tsc --noEmit          # Type-check without building
npm test                  # Run SDK unit tests
```

## Testing

Pure SDK functions have unit tests in `src/sdk/__tests__/` (`decodeVin`,
`costEstimate`, `sellingPrice`, `tradeInEstimate`, `preownedGuide`, `reportHtml`). They run on
Node's built-in test runner (`node:test`) with native TypeScript type-stripping
— no Jest/Babel setup. Because every SDK file's only import is `import type`
(erased at runtime), tests import the modules directly with explicit `.ts`
extensions; `tsconfig` enables `allowImportingTsExtensions` for this. Network-
dependent paths (`decodeVin`'s NHTSA lookup, the `analyze*` Claude calls) are not
unit-tested — `decodeVin` is exercised via its `offlineOnly` path.
