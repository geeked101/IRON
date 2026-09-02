# IRON — Production Release Checklist

> Gate every public release through this checklist. Mark items ✅ before submitting an EAS build.

## 1. Code Integrity
- [ ] `npx tsc --noEmit` exits clean (zero errors)
- [ ] `npm test` passes all test suites
- [ ] No `console.error` / unhandled Promise rejection warnings remain in runtime logs

## 2. Account & Recovery Flow
- [ ] **Splash → "I already have an account"** opens the recovery modal with three tabs:
  - [ ] **Google** tab signs in and syncs remote profile
  - [ ] **Email** tab authenticates, handles wrong password with a clear message, sends password reset emails
  - [ ] **Device** tab correctly detects or offers to create a local fallback profile
- [ ] New user completing onboarding lands on HomeScreen with correct `cycleCount = 1`, `currentDay = 1`
- [ ] Google sign-in on a device that already has a local profile migrates local data to the cloud UID

## 3. Queue & Data Safety
- [ ] Tapping a future day on WorkoutScreen shows **"Jump to Day X?"** with the non-destructive copy ("all logs preserved")
- [ ] After a jump, the **"↺ Jumped from Day N"** undo banner appears; tapping it restores the queue
- [ ] Undo banner disappears after reverting
- [ ] Completing Day 6 → rest-day modal renders dynamic cycle copy (no placeholder text)
- [ ] Rest day "Yes" → queue advances to Day 7; Day 7 completion → cycles to Day 1, `cycleCount++`
- [ ] "No — Keep Going" → jumps directly to Day 1 of next cycle

## 4. Sync Transparency
- [ ] **SyncBadge** is visible on HomeScreen below the header
- [ ] **SyncBadge** is visible in Settings → ACCOUNT & SYNC
- [ ] Badge correctly shows: `Synced` (green), `Pending` (amber), `Syncing` (blue), `Offline` (grey), `Error` (red)
- [ ] "Sync Now" button appears on `pending` / `offline` / `error` states and triggers `flushSyncQueue`
- [ ] Last synced time updates after a successful flush

## 5. Navigation Edge Cases
- [ ] Completing a session in WorkoutStack resets to `WorkoutHome` and switches to Home tab (no loop)
- [ ] If `getParent()` is undefined, no crash occurs (checked null guard)
- [ ] Settings → Reset → OK dismisses and triggers onboarding via `setOnboarded(false)`, not `navigation.navigate`
- [ ] No "Onboarding" route is manually pushed from nested tab context

## 6. Cloud Degradation (no Firebase env vars)
- [ ] App starts without crashing when `EXPO_PUBLIC_FIREBASE_*` vars are absent
- [ ] `GoogleSignInButton` shows "Local-First Mode" badge instead of broken auth button
- [ ] `SyncBadge` shows `Offline` state — not an error state
- [ ] All local SQLite features (logging, PRs, weight, nutrition) work fully offline

## 7. Store Configuration
| Variable | Expected |
|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Set in `.env` or EAS secret |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Set |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Set |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Set |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Set |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Set (for OAuth) |

## 8. EAS Build
- [ ] `eas.json` configured for `production` profile
- [ ] Android `versionCode` bumped
- [ ] iOS `buildNumber` bumped
- [ ] `app.config.js` `version` string updated
- [ ] Run `eas build --platform android --profile production` — build succeeds
- [ ] Run `eas build --platform ios --profile production` — build succeeds

## 9. Smoke Test (on physical device after build)
- [ ] Cold launch < 3 seconds
- [ ] First-time onboarding completes in < 2 minutes
- [ ] Start a workout session, log sets, finish session — HomeScreen shows completion state
- [ ] Log weight — HomeScreen weight chip updates
- [ ] Settings — Sign Out — splash screen appears
- [ ] Re-sign in — data is restored from Firestore
- [ ] Aeroplane mode — app works; reconnect — pending badge appears, then clears

---

*Last updated automatically by IRON release pipeline.*
