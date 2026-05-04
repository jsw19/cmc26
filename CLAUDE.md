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

## Project Structure

```
checkmycar/
├── app/                          # Expo Router screens
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Bottom tab bar (Home, History, Buy, Sell)
│   │   ├── index.tsx             # Home screen — inspection launcher + quick cards
│   │   ├── history.tsx           # Inspection history list
│   │   ├── preowned.tsx          # Buy tab — pre-owned market range guide
│   │   └── sell.tsx              # Sell tab — AI scan + FB/CL listing price estimator
│   ├── _layout.tsx               # Root layout (InspectionProvider, SafeArea)
│   ├── camera.tsx                # Full-screen camera capture (AI or local scan)
│   ├── analysis.tsx              # Inspection results (damage, cost, trade-in, sell)
│   └── buyercheck.tsx            # PPI screen — AI Scan | Checklist | Model Issues | Buyer Tips
├── src/
│   ├── sdk/                      # Reusable SDK — zero UI dependencies
│   │   ├── index.ts              # Public exports
│   │   ├── types.ts              # All shared TypeScript types
│   │   ├── analyze.ts            # Claude API vision call + JSON parsing
│   │   ├── analyzeLocal.ts       # On-device HSV pixel analysis (offline fallback)
│   │   ├── analyzeCheckItem.ts   # Claude API call scoped to a PPI checklist item
│   │   ├── costEstimate.ts       # Repair cost estimator (regional multipliers)
│   │   ├── tradeInEstimate.ts    # Dealer trade-in + private-party value estimator
│   │   ├── sellingPrice.ts       # FB Marketplace / Craigslist listing price estimator
│   │   └── preownedGuide.ts      # Pre-owned market range finder by budget + category
│   ├── components/
│   │   ├── SeverityBadge.tsx     # Colored severity pill (none/minor/moderate/severe)
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
│   │   └── modelIssues.ts         # Known issues database by make/model
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

### Home (`app/(tabs)/index.tsx`)
- 6-part inspection launcher grid (underbody → engine bay)
- "Buying a Used Car?" card → `buyercheck`
- "Selling Your Car?" card → `sell` tab
- Recent inspections list

### History (`app/(tabs)/history.tsx`)
- Full inspection history from AsyncStorage
- Tap any card → `analysis` screen

### Buy / Pre-Owned Guide (`app/(tabs)/preowned.tsx`)
- Enter budget + segment filter
- Shows market price ranges by vehicle category for user's region

### Sell (`app/(tabs)/sell.tsx`)
- Vehicle info form (year, make, model, mileage, category)
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
```
