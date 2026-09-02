# Copilot Instructions for IRON

This guide helps you work effectively with the IRON codebase. Reference this when making changes or exploring features.

## Quick Start

```bash
npm install          # Install dependencies (Expo + React Native stack)
npm start            # Start Metro bundler (requires Expo Go app on device)
npm run android      # Run on Android (requires Android SDK)
npm run build:android # Build production APK via EAS
```

**No tests or linters** exist in this project. Code changes don't require test validation.

## Architecture Overview

IRON is a **React Native + Expo** fitness app with an offline-first, cloud-optional architecture. The key mental model:

### Three-Layer State Management

1. **AsyncStorage** (persistent local JSON)
   - Survives app restarts and device reboots
   - No authentication required; no UID needed
   - Used for UI state (font scale), workout queue, nutrition logs

2. **Firestore** (optional cloud sync, behind `isFirebaseConfigured()` check)
   - Only syncs when Firebase env vars are present
   - Merges into AsyncStorage state (local is source of truth)
   - Each user's data is isolated by `uid` via security rules

3. **Zustand Stores** (in-memory, ephemeral)
   - Derive computed state from AsyncStorage/Firestore
   - Actions mutate store, then persist down to AsyncStorage
   - See `src/store/index.ts` for store definitions

### Core Stores & Flows

| Store | Purpose | Key Methods |
|-------|---------|-------------|
| `useAuthStore` | Local UID generation; Firebase listener attachment | `initialize()`, `setOnboarded()`, `setUid()` |
| `useProfileStore` | User profile (goal, targets, gender, etc.) | `setProfile()`, `saveProfile()` |
| `useWorkoutStore` | Active session state (exercises, sets, reps) | `startSession()`, `logSet()`, `finishSession()` |
| `useQueueStore` | Sequential 6-day + rest cycle progression | `load()`, `completeDay()`, `nextCycle()` |
| `useNutritionStore` | Daily meal tracking & water logging | `addMeal()`, `addWater()`, `save()` |

### Sequential Workout Queue (queueStore)

The queue replaces calendar-day logic. Progress is **sequential**, not calendar-based:

- **Days 1–6**: PPL×2 split (Push, Pull, Legs, repeated)
- **Day 7**: Recovery day (rest day prompt shown after Day 6 completion)
- After completing Day 7, returns to Day 1 of the next cycle

Current state stored in `QueueSnapshot`:
```typescript
currentDay: 1–7        // Current day in the cycle
lastCompletedDay       // Last day finished (track streaks)
cycleCount            // How many full cycles completed
sessionCompleted      // Did user finish today's exercises?
pendingRestPrompt     // Show rest-day dialog after Day 6?
```

**Dual-persist pattern**: Load from AsyncStorage first (instant), then reconcile with Firestore if authenticated.

### Progressive Overload Engine (progressiveOverload.ts)

Calculates suggested weight increments for exercises:

- **Brzycki 1RM formula**: Estimates 1RM from weight + reps
- **RPE feedback** (Rate of Perceived Exertion):
  - RPE 7–8 → suggest +2.5kg
  - RPE 9–10 → recommend consolidation (maintain weight, increase reps)
  - RPE < 7 → consider deload
- **Deload logic**: If 1RM hasn't grown in 3+ sessions, suggest 5–10% reduction
- **Plate increments**: Default 2.5kg (customizable)

Used in `SessionStatsScreen` to display post-workout suggestions.

### Database Services (services/firebase.ts & services/localDb.ts)

**Firebase Service**:
- Lazy-initialized via `initFirebase()` in `App.tsx`
- `isFirebaseConfigured()` returns `false` if env vars are missing
- Offers dual-auth: Firebase Anonymous (no account) or Google Auth

**Local Database** (SQLite via Expo):
- Pre-populates schema on app init via `initLocalDatabase()`
- Cache layer for Firestore reads
- Survives across restarts
- Migration function `dbMigrateUserUid()` transfers local data when Firebase auth succeeds

**Pattern**: When Firebase auth completes, migrate all local SQLite records from temporary `local_*` UID to real Firebase UID.

### Navigation Structure

- **RootNavigator** (src/navigation/RootNavigator.tsx)
  - Bottom Tab Navigator: Home, Workout, Nutrition, Progress, Recovery, Settings
  - Stack overlays for exercise detail and onboarding flows

- **OnboardingNavigator** (src/navigation/OnboardingNavigator.tsx)
  - Multi-step setup: gender, body weight, goal, preferences

### Theme & Typography

**Colors** (Titanium dark design):
- Imported from `src/theme/index.ts`
- Use `backgroundColor: theme.backgroundColor` throughout

**Font Scaling**:
- Global user preference via `FontSizeContext` (Small, Medium, Large, Extra Large)
- Hook `useScaledFont()` returns scaled `fontSize` value
- Always use `useScaledFont()` instead of hardcoded font sizes

## Naming Conventions

### File Structure
- **Components**: PascalCase, export default, can be folder-based or single file
- **Screens**: PascalCase, end with `Screen` suffix
- **Stores**: camelCase, start with `use`, leverage Zustand's naming
- **Hooks**: camelCase, start with `use`
- **Utilities**: camelCase, flat functions (no classes unless absolutely necessary)

### TypeScript Patterns
- Strict mode enabled (`tsconfig.json`)
- Use `interface` for object shapes, `type` for unions
- Avoid `any`; use `unknown` with type guards
- Export types from service files; import in components

### Zustand Patterns
- **Store creation**: `create<StateType>()` with middleware (`persist`, `createJSONStorage`)
- **Selectors**: Destructure from hook or use selector function to avoid unnecessary re-renders
- **Async actions**: Return `Promise<void>` or `Promise<T>`; handle errors with `try/catch` and `console.warn()` (don't throw in stores)
- **Persistence key**: Prefix with `iron_` (e.g., `iron_queue`, `iron_profile_storage`)

## Key Files & When to Edit

| Path | Purpose | When to Change |
|------|---------|--------|
| `src/store/queueStore.ts` | Workout progression logic | Changing cycle mechanics, rest day behavior |
| `src/utils/progressiveOverload.ts` | Weight suggestion algorithm | Adjusting 1RM formula, RPE thresholds, deload rules |
| `src/theme/index.ts` | Color tokens, spacing, borders | Adding new colors or adjusting existing theme |
| `src/context/FontSizeContext.tsx` | Font scale provider | Adding new scale levels |
| `src/services/firebase.ts` | Cloud sync & auth logic | Firestore schema changes, new cloud features |
| `src/services/localDb.ts` | SQLite schema & caching | Local database structure changes |
| `src/data/workoutSplit.ts` | PPL×2 exercise definitions | Adding/removing exercises or changing splits |
| `src/navigation/RootNavigator.tsx` | Screen routing | Adding new screens or restructuring tabs |

## Common Patterns

### Adding a New Screen

1. Create `src/screens/MyNewScreen.tsx` with `export default function MyNewScreen() { ... }`
2. Import in `RootNavigator.tsx` and add to navigation stack
3. Use `useScaledFont()` for typography
4. Import theme colors from `src/theme/index.ts`
5. Connect to store(s) via Zustand hooks: `const value = useStore(s => s.property)`

### Modifying Workout Split

1. Edit `src/data/workoutSplit.ts` (arrays of exercise objects)
2. Update `queueStore.ts` if cycle length changes (currently 6-day + rest)
3. Re-run app to pick up changes; data migration not needed for local-only mode

### Adding a New Zustand Store

1. Create in `src/store/newStore.ts`
2. Wrap with `persist()` middleware if it should survive restarts
3. Use `AsyncStorage` as storage backend
4. Export from `src/store/index.ts`
5. Access in components via hook: `const { value } = useNewStore()`

### Firestore Sync

When adding a new data entity:
1. Define schema in `src/services/firebase.ts` (types and functions)
2. Create Firestore collection and add security rules
3. Implement `save()` and `fetch()` functions in `firebase.ts`
4. Add optional sync in the relevant Zustand store via Firebase listener
5. Document in README security rules section

## Development Notes

### Offline-First

- **Always assume AsyncStorage is available** and use it as the primary store
- Firestore is optional; wrap all cloud calls in `if (isFirebaseConfigured())`
- Cached reads from SQLite fallback to remote Firestore if not found locally
- App works 100% without `.env` file set

### Debugging

- Use `console.log()` or `console.warn()` for error tracking (visible in Metro bundler)
- Check AsyncStorage via Expo DevTools
- Firestore rules can be tested in Firebase Console → Firestore → Rules

### Performance

- Zustand selectors prevent unnecessary re-renders: `useStore(s => s.specificValue)` instead of `useStore().specificValue`
- Large arrays (meals, sets) use `.slice()` or `.filter()` to derive stable references
- Images via Expo Image Picker; stored as file URIs in AsyncStorage

### Environment Variables

- All Firebase config is optional; env vars prefixed `EXPO_PUBLIC_*`
- Access via `process.env.EXPO_PUBLIC_KEY_NAME`
- `.env` is git-ignored; developers copy `.env.example` and fill manually

## Before Committing

1. Ensure `npm start` runs without errors
2. Verify changes work on device (Expo Go app)
3. Check that both offline (no `.env`) and cloud-sync modes work if Firebase vars are added
4. Test on Android if making platform-specific changes
