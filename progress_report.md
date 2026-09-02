# IRON App — Architecture & Stability Progress Report
*Updated: 2026-09-02*

---

## ✅ Verified Architecture & Flow Status

| Area | Status | Verified Behavior |
|------|--------|-------------------|
| Local SQLite Database (`expo-sqlite`) | ✅ | Offline-first persistence for user profiles, workouts, PRs, weight, and nutrition |
| Cloud Sync & UID Migration | ✅ | Automatic SQLite UID migration (`dbMigrateUserUid`) when transitioning to Firebase auth |
| Onboarding Flow | ✅ | Multi-step onboarding + runtime notification setup & account restoration |
| Navigation Architecture | ✅ | `RootNavigator` gates Onboarding vs Main Tabs. Primary logger path: Day List → Single Exercise → Session Stats |
| Build & EAS Config | ✅ | EAS build gracefully warns on missing Firebase env vars without failing offline builds |
| PR Persist Engine | ✅ | PRs calculated for UI preview on mount, but written to SQLite/Firestore ONLY on user "Save session" |
| Daily Target Math | ✅ | Gender-sensitive & unit-aware Mifflin-St Jeor formula (`calculateCaloricTarget`) |
| Data Management | ✅ | Fully functional JSON data export and complete app data reset in Settings |
| Graceful Cloud Degradation | ✅ | Informative Local-First Mode status badge & dialogs when Firebase credentials are omitted |
| TypeScript & Diagnostics | ✅ | Clean compilation with 0 errors |

---

## 🛠️ Resolved Architectural Debt & Audit Findings

1. **Auth UID Swapping Data Loss (Resolved)**
   - Added `dbMigrateUserUid(oldUid, newUid)` in `localDb.ts`.
   - Updated `useAuthStore.initialize()` to automatically migrate all SQLite tables (`user_profile`, `workout_sessions`, `personal_records`, `weight_logs`, `nutrition_logs`, `custom_foods`) when Firebase assigns a cloud UID.

2. **PR Detection Mount Side-Effects (Resolved)**
   - Refactored `SessionStatsScreen.tsx` to detect PRs immutably for UI feedback on mount.
   - Database writes to `personal_records` are deferred until the user explicitly taps "Save session".

3. **Documentation & Navigation Realignment (Resolved)**
   - Updated `README.md` and `RootNavigator.tsx` header trees to eliminate stale file references (`ActiveWorkoutScreen.tsx`, `authStore.ts`).

4. **Graceful Cloud Degradation (Resolved)**
   - Updated `GoogleSignInButton.tsx` and `firebase.ts` to detect missing cloud credentials gracefully.
   - Converts Google Sign-In into an interactive Local-First Mode status badge detailing offline SQLite availability.

5. **Recovery Screen Progression & Rest Day Modal (Resolved)**
   - Implemented real rest day session logging and queue Advancement (`Cycle N → Cycle N+1`) in `RecoveryScreen.tsx`.
   - Fixed literal `{n+1}` copy in `RestDayModal` with dynamic cycle calculations.

---

## 🚀 Status: PRODUCTION READINESS ACHIEVED
The IRON application now features consolidated offline persistence, safe auth state transitions, accurate calorie/unit calculations, clean navigation paths, and verified build pipelines.