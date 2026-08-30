# 💪 IRON

Your personal gym tracker and trainer — a mobile app that keeps you accountable, pushes your limits, and tracks every rep that counts.

**IRON** is a React Native + Firebase mobile app designed to help you nail progressive overload, log nutrition, track your physique journey, and stay motivated. Built for people serious about their gains.

---

## What You Get

- **Workout Tracking**: Follow a structured 6-day cycle (PPL split) with real-time set logging and form cues
- **Progressive Overload Engine**: Automatic 1RM calculations and smart weight recommendations to keep pushing harder
- **Nutrition Logging**: Log meals, track macros, and hit your daily targets with a built-in food database
- **Physique Progress**: Photo gallery to visually track your transformation over time
- **Recovery Insights**: Rest day metrics and guided stretching routines
- **Personal Records**: Celebrate PRs with automatic detection and celebratory alerts
- **Custom Font Scaling**: Adjust text size across the entire app to your preference

---

## Tech Stack

| Layer | Tech |
|---|---|
| **Framework** | React Native (Expo SDK 54) |
| **Language** | TypeScript |
| **Navigation** | React Navigation v6 |
| **State Management** | Zustand + AsyncStorage |
| **Backend** | Firebase (Auth + Firestore) |
| **UI** | React Native StyleSheet + Custom Theme |
| **Notifications** | Expo Notifications |

---

## Quick Start

### Prerequisites
- Node.js v18+
- npm or yarn
- Expo Go app (for testing on your phone)

### Setup

1. **Clone and install:**
   ```bash
   git clone git@github.com:geeked101/IRON.git
   cd IRON
   npm install
   ```

2. **Set up Firebase (optional for cloud sync):**
   ```bash
   cp .env.example .env
   # Add your Firebase keys
   ```
   *(Skip this for offline-only mode)*

3. **Run it:**
   ```bash
   npx expo start
   ```

---

## Project Structure

```
IRON/
├── App.tsx                    # App entry point
├── src/
│   ├── components/           # UI building blocks (timers, modals, heatmaps)
│   ├── screens/             # Full app pages (Home, Workout, Nutrition, Progress, etc.)
│   ├── store/               # State management (auth, workouts, custom foods)
│   ├── services/            # Firebase + notifications
│   ├── utils/               # Progressive overload calculations
│   ├── data/                # Workout splits & food database
│   └── theme/               # Design tokens (dark titanium theme)
```

---

## Key Features Explained

### Sequential Workout Queue
Never wonder what workout's next. IRON tracks your position in a 6-day PPL cycle, independent of calendar days. Finish Day 6 → rest day prompt → start Day 1 fresh.

### Progressive Overload Engine
Uses the Brzycki formula to calculate your 1RM and automatically suggests weight increases (+2.5kg) when you hit your target reps. Built-in progression tracking keeps you accountable.

### Dynamic Font Scaling
Users can adjust text size (Small → Extra Large) in settings, and every screen respects that choice instantly.

---

## Security

- **Auth Isolation**: Each user's data is isolated by their Firebase UID
- **Firestore Rules**: All collections (`users`, `sessions`, `nutrition`, `prs`, etc.) enforce user-level read/write permissions
- **Environment Variables**: Secrets stay in `.env` and out of version control

---

## Build & Deploy

### Development
```bash
npx expo run:android
```

### Production (via EAS)
```bash
npm install -g eas-cli
eas build --platform android --profile preview
```

---

## License

MIT License — build something awesome! 🚀
