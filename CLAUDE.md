# CheckMyCar — Claude Code Guide

## Project Overview

CheckMyCar is a mobile app that lets users photograph vehicles (especially the underbody) to detect corrosion, rust, and structural damage using AI vision analysis via the Claude API.

## Tech Stack

- **Framework**: React Native with Expo (managed workflow)
- **Language**: TypeScript (strict)
- **Navigation**: React Navigation v6
- **Camera**: expo-camera
- **AI**: Claude API (claude-sonnet-4-6) for image analysis via vision
- **State**: React Context + useReducer (no Redux)

## Project Structure

```
checkmycar/
├── app/                    # Expo Router screens (file-based routing)
│   ├── (tabs)/
│   │   ├── index.tsx       # Home screen
│   │   └── history.tsx     # History screen
│   ├── camera.tsx          # Camera capture screen
│   └── analysis.tsx        # Analysis results screen
├── src/
│   ├── sdk/                # Reusable detection SDK (publishable package)
│   │   ├── index.ts        # Public exports
│   │   ├── capture.ts      # Image capture helpers
│   │   ├── analyze.ts      # Claude API call + response parsing
│   │   └── types.ts        # Shared types (InspectionResult, DamageItem, etc.)
│   ├── components/         # Shared UI components
│   ├── hooks/              # Custom hooks
│   ├── context/            # App-wide state (InspectionContext)
│   └── utils/              # Helpers (storage, formatting)
├── assets/                 # Images, fonts, icons
├── CLAUDE.md
├── app.json
├── package.json
└── tsconfig.json
```

## SDK Design

The `src/sdk/` module is the core reusable package. It should work independently of the UI:

```ts
import { analyzeVehicleImage } from '@/src/sdk';

const result = await analyzeVehicleImage(base64Image, { apiKey, vehiclePart: 'underbody' });
// result: InspectionResult { severity, damages: DamageItem[], summary, timestamp }
```

Key types (`src/sdk/types.ts`):
- `DamageItem` — `{ type, location, severity: 'none'|'minor'|'moderate'|'severe', confidence }`
- `InspectionResult` — `{ id, timestamp, vehiclePart, imageUri, damages, overallSeverity, summary }`

## Claude API Usage

- Model: `claude-sonnet-4-6` (vision-capable)
- Image sent as base64 in a `image` content block
- Prompt instructs the model to return structured JSON with damage assessment
- Always validate/parse the JSON response before returning to UI
- API key stored in `.env` (never committed); accessed via `expo-constants`

## Key Conventions

- All screens are in `app/` using Expo Router file-based routing
- Components are functional with hooks only — no class components
- TypeScript strict mode; no `any` unless absolutely necessary with a comment
- Navigation params typed via `RootParamList`
- Async operations wrapped in try/catch; errors surfaced to UI via error state
- Images stored locally via `expo-file-system`; inspection history in `AsyncStorage`

## Environment

```
EXPO_PUBLIC_ANTHROPIC_API_KEY=your_key_here
```

## Running the Project

```bash
npx expo start          # Start dev server
npx expo start --ios    # iOS simulator
npx expo start --android # Android emulator
```

## Development Notes

- Camera screen uses guided overlay UI — show outlines for underbody, front, rear, sides
- Analysis screen polls/waits for Claude response and shows a loading state
- History is persisted to AsyncStorage as serialized `InspectionResult[]`
- The SDK (`src/sdk/`) should have zero UI dependencies — plain TypeScript only
