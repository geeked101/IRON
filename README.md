# IRON

Digital lifting journal and progression system built with React Native and Expo.

## Overview

IRON is a mobile application designed for workout tracking, progressive overload management, nutrition logging, and physique tracking. It uses a 6-day sequential workout cycle with rest day prompts, offline-first local state persistence, and optional Firestore synchronization.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native (Expo SDK 54) |
| Language | TypeScript |
| Navigation | React Navigation v6 (Stack + Bottom Tabs) |
| State Management | Zustand + AsyncStorage |
| Backend & Database | Firebase (Auth + Firestore) |
| UI & Visuals | Vanilla React Native StyleSheet + Custom Theme System |
| Notifications | Expo Notifications |

## Directory Structure

```
IRON/
├── App.tsx                          # Application root entry point
├── app.config.js                    # Expo configuration with env variable mapping
├── eas.json                         # EAS build profiles (development, preview, production)
├── src/
│   ├── components/                  # UI components and interactive visualizers
│   │   ├── AddCustomFoodModal.tsx   # Custom food entry with live macro ratio bar
│   │   ├── BreathingRestTimer.tsx   # Rest timer with animated halo pulse
│   │   ├── MuscleHeatmap.tsx        # Interactive muscle fatigue & recovery heatmap
│   │   ├── PRCelebrationModal.tsx   # Personal record modal
│   │   └── ShimmerGlow.tsx          # Metallic shine sweep animation component
│   ├── context/
│   │   └── FontSizeContext.tsx      # App-wide text scale provider
│   ├── data/
│   │   ├── kenyaFoods.ts            # Local food catalog with macro breakdowns
│   │   └── workoutSplit.ts          # PPL split definitions and exercise metadata
│   ├── hooks/
│   │   └── useScaledFont.ts         # Hook for typography scaling
│   ├── navigation/
│   │   ├── OnboardingNavigator.tsx  # Initial user setup stack navigator
│   │   └── RootNavigator.tsx        # Root navigation stack and tab router
│   ├── screens/
│   │   ├── ActiveWorkoutScreen.tsx  # Real-time workout execution and set logger
│   │   ├── DayExerciseListScreen.tsx # Day exercise selection and completion tracker
│   │   ├── HomeScreen.tsx           # Dashboard, workout queue status, daily macros
│   │   ├── NutritionScreen.tsx      # Calorie and macro logger
│   │   ├── PhotoDetailScreen.tsx    # Fullscreen progress photo view
│   │   ├── PhotoProgressScreen.tsx  # Physique progress photo gallery
│   │   ├── ProgressScreen.tsx       # Analytics, strength 1RM, and weight charts
│   │   ├── RecoveryScreen.tsx       # Rest day metrics and stretch routine
│   │   ├── SessionStatsScreen.tsx   # Post-workout summary and PR detection
│   │   ├── SettingsScreen.tsx       # Preferences and text scale options
│   │   ├── SingleExerciseScreen.tsx # Exercise set logger and form cues
│   │   └── onboarding/              # Multi-step onboarding screens
│   ├── services/
│   │   ├── firebase.ts              # Firestore data service with null-safety checks
│   │   └── notifications.ts         # Local notification scheduling service
│   ├── store/
│   │   ├── authStore.ts             # Auth state and profile store
│   │   ├── customFoodStore.ts       # Custom user food items store
│   │   ├── index.ts                 # Store exports
│   │   └── queueStore.ts            # Sequential workout queue state machine
│   ├── theme/
│   │   └── index.ts                 # Titanium dark design tokens
│   └── utils/
│       └── progressiveOverload.ts   # 1RM calculation and progression logic
```

## Getting Started

### Prerequisites

- Node.js (v18 or newer recommended)
- npm or yarn
- Expo Go mobile app (for device testing)

### Installation

1. Clone the repository:
   ```bash
   git clone git@github.com:geeked101/IRON.git
   cd IRON
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Environment Setup (Optional for cloud sync):
   Copy `.env.example` to `.env` and set your Firebase configuration keys:
   ```bash
   cp .env.example .env
   ```
   If `.env` is omitted, the application operates in local offline mode using `AsyncStorage`.

4. Start the Metro bundler:
   ```bash
   npx expo start
   ```

## Key Modules

### Sequential Workout Queue
Centralized in `src/store/queueStore.ts`. Tracks workout progression through a 6-day sequential cycle regardless of calendar days. Completing Day 6 triggers a rest prompt before advancing to Day 7 (Recovery) or rolling over to Day 1 of the next cycle.

### Progressive Overload Engine
Implemented in `src/utils/progressiveOverload.ts`. Calculates estimated 1RM using the Brzycki formula and evaluates set performance against target reps to suggest weight adjustments (+2.5kg increment on completion or deload adjustments).

### Dynamic Font Scaling
Managed via `src/context/FontSizeContext.tsx` and consumed through `useScaledFont()`. Allows users to adjust text scaling (Small, Medium, Large, Extra Large) across all screens dynamically.

### Security Architecture

1. **Environment Variables**: API keys and backend project configuration are loaded from environment variables (`EXPO_PUBLIC_FIREBASE_*`) and ignored by `.gitignore`.
2. **Authentication Isolation**: Authentication uses Firebase Anonymous Auth or user identity. Each user is isolated by `uid`.
3. **Firestore Security Rules**: Deploy the following rules to secure document access by user ID:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /sessions/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.uid;
      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
    }
    match /weightLogs/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.uid;
      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
    }
    match /nutrition/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.uid;
      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
    }
    match /prs/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.uid;
      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
    }
  }
}
```

## Build and Deployment

### Development Build
```bash
npx expo run:android
```

### Production Build via EAS
```bash
# Install EAS CLI
npm install -g eas-cli

# Build Android APK
eas build --platform android --profile preview
```

## License

MIT License.
