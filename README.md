# IRON 🦾

> A digital lifting journal with titanium bones. Built for progression, not aesthetics.

Lean bulk companion · Workout tracker · Progressive overload system · Nutrition logger · Physique dashboard

---

## Stack

| Layer | Tech |
|---|---|
| Framework | React Native + Expo ~51 |
| Navigation | React Navigation v6 |
| State | Zustand |
| Backend | Firebase (Auth + Firestore) |
| Charts | react-native-chart-kit |
| Notifications | Expo Notifications |
| Language | TypeScript |

---

## Project Structure

```
IRON/
├── App.tsx                          # Root entry, Firebase init, navigation
├── src/
│   ├── theme/
│   │   └── index.ts                 # Titanium color system, typography, spacing
│   ├── navigation/
│   │   ├── RootNavigator.tsx        # Auth-gated root: Onboarding vs Main
│   │   └── OnboardingNavigator.tsx  # 7-step first-launch flow
│   ├── store/
│   │   └── index.ts                 # Zustand: auth, profile, workout, nutrition
│   ├── services/
│   │   ├── firebase.ts              # Firestore CRUD: sessions, weight, nutrition, PRs
│   │   └── notifications.ts         # Expo scheduled notifications
│   ├── data/
│   │   ├── workoutSplit.ts          # Full PPL×2 split, all exercises + form cues
│   │   └── kenyaFoods.ts            # 20-item Kenyan food database with macros
│   ├── utils/
│   │   └── progressiveOverload.ts   # Smart progression, 1RM calc, bulk insights
│   └── screens/
│       ├── HomeScreen.tsx           # Command center
│       ├── WorkoutScreen.tsx        # Day selector
│       ├── ActiveWorkoutScreen.tsx  # Live set-by-set tracker + rest timer
│       ├── NutritionScreen.tsx      # Macro dashboard + meal logger
│       ├── ProgressScreen.tsx       # Weight/strength/volume charts
│       ├── RecoveryScreen.tsx       # Day 7 rest UI
│       ├── SettingsScreen.tsx       # Profile + preferences
│       └── onboarding/
│           ├── SplashScreen.tsx
│           ├── GoalScreen.tsx
│           ├── LevelScreen.tsx
│           ├── StatsScreen.tsx
│           ├── TargetsScreen.tsx
│           ├── NotificationsScreen.tsx
│           └── ReadyScreen.tsx
```

---

## Getting Started

### 1. Install dependencies

```bash
cd IRON
npm install
```

### 2. Set up Firebase

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project called `iron-app`
3. Enable **Anonymous Authentication**
4. Create a **Firestore** database (start in production mode)
5. Copy your Firebase config into `src/services/firebase.ts`

### 3. Firestore Collections

Create these collections (they auto-create on first write):

| Collection | Document ID | Purpose |
|---|---|---|
| `users` | `{uid}` | Profile + preferences |
| `sessions` | auto | Workous}` | Daily nutrition logs |
| `prs` | `{uid}_{exerciseName}` | Personal records |

### 4. Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
    match /sessions/{docId} {
      allow read, write: if request.auth.uid == resource.data.uid
        || (request.auth != null && request.resource.data.uid == request.auth.uid);
    }
    match /weightLogs/{docId} {
      allow read, write: if request.auth.uid == resource.data.uid
        || (request.auth != null && request.resource.data.uid == request.auth.uid);
    }
    match /nutrition/{docId} {
      allow read, write: if request.auth != null;
    }
    match /prs/{docId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 5. Run the app

```bash
npx expo start
```

Scan the QR code with **Expo Go** on your phone.

---

## Core Features

### Progressive Overload Engine
Located in `src/utils/progressiveOverload.ts`

- Brzycki 1RM estimation
- Session-over-session analysis
- Auto-suggests +2.5kg when all target reps hit
- Detects fatigue and suggests deload

### Smart Bulk Insights
- Mifflin-St Jeor BMR → TDEE calculation
- Weekly weight trend analysis
- Auto-flags when weight stalls (→ eat more) or rises too fast (→ scale back)

### Kenyan Food Database
`src/data/kenyaFoods.ts` — 20 foods across 6 categories:
Staples · Meat · Vegetables · Legumes · Snacks · Drinks

Includes the Mass Shake (850 kcal, 35g protein — liquid construction material).

---

## Titanium Theme

```
Background:  #0B0D12
Cards:       #161A22
Deep:        #0f1117
Accent:      #C0C4CC  (titanium highlight)
Mid:         #8B8F98  (titanium mid)
Text:        #F5F7FA
```

Feels like gym equipment forged by spacecraft engineers.

---

## Build for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build Android APK
eas build --platform android --profile preview

# Build iOS (requires Apple Developer account)
eas build --platform ios
```

---

## What's Next (Phase 2)

- [ ] AI 
- [ ] Barcode scanner 
- [ ] Apple Health / Google Fit integration
- [ ] Smart recovery score (HRV-based)
- [ ] Custom workout creator
- [ ] Social — share PRs

---

*IRON. Not a fitness influencer app. A digital lifting journal with titanium bones.*
