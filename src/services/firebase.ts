import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app'
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  User,
  Auth,
} from 'firebase/auth'
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'

/**
 * Firebase configuration — values are injected from EXPO_PUBLIC_ environment
 * variables defined in .env (which is gitignored). Never hardcode secrets here.
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
}

const FIREBASE_ENV_KEYS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
] as const

/** True when all EXPO_PUBLIC_FIREBASE_* vars were baked into the build. */
export function isFirebaseConfigured(): boolean {
  return FIREBASE_ENV_KEYS.every((key) => {
    const value = process.env[key]
    return typeof value === 'string' && value.length > 0
  })
}

// ─── Initialisation ───────────────────────────────────────────────────────────

let app: FirebaseApp | null = null
let auth: Auth | null = null

/**
 * Initialise Firebase once. Safe to call multiple times — uses the existing
 * app instance if Firebase was already initialised.
 * Returns null if env vars are missing (common on EAS builds without eas env:push).
 */
export function initFirebase(): FirebaseApp | null {
  if (!isFirebaseConfigured()) {
    console.error(
      '[Firebase] Missing EXPO_PUBLIC_FIREBASE_* env vars. ' +
      'For EAS builds run: eas env:push --environment preview --path .env'
    )
    return null
  }

  console.log('[Firebase] initFirebase called. Existing apps:', getApps().length)

  if (getApps().length === 0) {
    try {
      app = initializeApp(firebaseConfig)
      auth = getAuth(app)
      console.log('[Firebase] App and Auth initialised.')
    } catch (error) {
      console.error('[Firebase] Failed to initialise app:', error)
      app = null
      auth = null
      return null
    }
  } else {
    app = getApp()
    auth = getAuth(app)
    console.log('[Firebase] Using existing Firebase app instance.')
  }

  return app
}

/** Returns the Firebase Auth instance, or null if Firebase is not configured. */
export function getFirebaseAuth(): Auth | null {
  if (!auth) initFirebase()
  return auth
}

/** Returns the Firestore instance, or null if Firebase is not configured. */
export function getFirebaseDb() {
  if (!app) initFirebase()
  return app ? getFirestore(app) : null
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Sign in anonymously. Used so every user has a UID without requiring
 * account creation, enabling data persistence from day one.
 */
export async function signInAnon(): Promise<User> {
  const firebaseAuth = getFirebaseAuth()
  if (!firebaseAuth) {
    throw new Error('Firebase is not configured. Set EXPO_PUBLIC_FIREBASE_* and rebuild.')
  }
  const { user } = await signInAnonymously(firebaseAuth)
  return user
}

/**
 * Subscribe to auth state changes. Returns the unsubscribe function.
 */
export function listenAuthState(callback: (user: User | null) => void): () => void {
  const firebaseAuth = getFirebaseAuth()
  if (!firebaseAuth) {
    callback(null)
    return () => {}
  }
  return onAuthStateChanged(firebaseAuth, callback)
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string
  goal: 'lean-bulk' | 'cut' | 'maintain' | 'aggressive-bulk'
  level: 'beginner' | 'intermediate' | 'advanced'
  weight: number          // kg
  height: number          // cm
  age: number
  gender: 'male' | 'female'
  targetCalories: number
  targetProtein: number   // g
  targetWater: number     // L
  units: 'kg' | 'lb'
  autoProgressiveOverload: boolean
  notifications: boolean
  createdAt: Timestamp | null
}

/**
 * Persist (or merge-update) a user's profile document in Firestore.
 */
export async function saveUserProfile(uid: string, profile: Partial<UserProfile>): Promise<void> {
  const db = getFirebaseDb()
  if (!db) return
  await setDoc(
    doc(db, 'users', uid),
    { ...profile, updatedAt: serverTimestamp() },
    { merge: true },
  )
}

/**
 * Fetch a user's profile. Returns null if no document exists yet.
 */
export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const db = getFirebaseDb()
  if (!db) return null
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? (snap.data() as UserProfile) : null
}

// ─── Workout Sessions ─────────────────────────────────────────────────────────

export interface SetLog {
  weight: number
  reps: number
  done: boolean
}

export interface ExerciseLog {
  name: string
  sets: SetLog[]
}

export interface WorkoutSession {
  id?: string
  uid: string
  day: number             // 1–7
  dayName: string
  durationMinutes: number
  exercises: ExerciseLog[]
  totalVolume: number     // kg
  prs: string[]           // exercise names that hit PRs this session
  notes: string           // optional free-text note from the user
  loggedAt: Timestamp | null
}

// ─── Custom Foods ─────────────────────────────────────────────────────────────

/**
 * A food entry created by the user. Stored in Firestore under
 * users/{uid}/customFoods and cached in AsyncStorage.
 */
export interface CustomFood {
  id: string                // client-generated: Date.now().toString()
  uid: string
  name: string
  category: string          // e.g. 'Breakfast', 'Snacks'
  caloriesPerServing: number
  proteinG: number
  carbsG: number
  fatG: number
  servingDescription: string
  createdAt: number         // epoch ms for conflict resolution
}

/**
 * Save a custom food to Firestore subcollection users/{uid}/customFoods.
 * @param uid  - Firebase user UID
 * @param food - The complete CustomFood object
 */
export async function saveCustomFood(uid: string, food: CustomFood): Promise<void> {
  const db = getFirebaseDb()
  if (!db) return
  await setDoc(doc(db, 'users', uid, 'customFoods', food.id), food)
}

/**
 * Fetch all custom foods for a user from Firestore.
 * @param uid - Firebase user UID
 */
export async function fetchCustomFoods(uid: string): Promise<CustomFood[]> {
  const db = getFirebaseDb()
  if (!db) return []
  const snap = await getDocs(collection(db, 'users', uid, 'customFoods'))
  return snap.docs.map(d => d.data() as CustomFood)
}

/**
 * Delete a custom food by its id from Firestore.
 * @param uid    - Firebase user UID
 * @param foodId - The food's id field
 */
export async function deleteCustomFood(uid: string, foodId: string): Promise<void> {
  const db = getFirebaseDb()
  if (!db) return
  const { deleteDoc } = await import('firebase/firestore')
  await deleteDoc(doc(db, 'users', uid, 'customFoods', foodId))
}

/**
 * Save a completed workout session to Firestore.
 * Returns the new document ID.
 */
export async function saveWorkoutSession(session: Omit<WorkoutSession, 'id'>): Promise<string> {
  const db = getFirebaseDb()
  if (!db) return ''
  const ref = await addDoc(collection(db, 'sessions'), {
    ...session,
    loggedAt: serverTimestamp(),
  })
  return ref.id
}

/**
 * Fetch the most recent sessions for a user, ordered by date descending.
 * Applies the limit server-side for efficiency.
 */
export async function fetchRecentSessions(uid: string, sessionLimit = 20): Promise<WorkoutSession[]> {
  const db = getFirebaseDb()
  if (!db) return []
  const q = query(
    collection(db, 'sessions'),
    where('uid', '==', uid),
    orderBy('loggedAt', 'desc'),
    limit(sessionLimit),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkoutSession))
}

// ─── Weight Logs ──────────────────────────────────────────────────────────────

export interface WeightLog {
  id?: string
  uid: string
  weight: number
  loggedAt: Timestamp | null
}

/**
 * Append a body-weight entry for the given user.
 */
export async function logWeight(uid: string, weight: number): Promise<string> {
  const db = getFirebaseDb()
  if (!db) return ''
  const ref = await addDoc(collection(db, 'weightLogs'), {
    uid,
    weight,
    loggedAt: serverTimestamp(),
  })
  return ref.id
}

/**
 * Fetch all weight entries for a user in ascending chronological order.
 */
export async function fetchWeightHistory(uid: string): Promise<WeightLog[]> {
  const db = getFirebaseDb()
  if (!db) return []
  const q = query(
    collection(db, 'weightLogs'),
    where('uid', '==', uid),
    orderBy('loggedAt', 'asc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as WeightLog))
}

// ─── Nutrition Logs ───────────────────────────────────────────────────────────

export interface NutritionLog {
  id?: string
  uid: string
  date: string            // 'YYYY-MM-DD'
  meals: MealEntry[]
  totalCalories: number
  totalProtein: number
  waterLitres: number
}

export interface MealEntry {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  servings: number
  time: string            // 'HH:MM'
}

/**
 * Save (or merge-update) a nutrition log for the given user and date.
 * Document ID is `{uid}_{date}` for quick lookup.
 */
export async function saveNutritionLog(
  uid: string,
  date: string,
  data: Partial<NutritionLog>,
): Promise<void> {
  const db = getFirebaseDb()
  if (!db) return
  await setDoc(
    doc(db, 'nutrition', `${uid}_${date}`),
    { uid, date, ...data, updatedAt: serverTimestamp() },
    { merge: true },
  )
}

/**
 * Fetch a single day's nutrition log. Returns null if not yet logged.
 */
export async function fetchNutritionLog(uid: string, date: string): Promise<NutritionLog | null> {
  const db = getFirebaseDb()
  if (!db) return null
  const snap = await getDoc(doc(db, 'nutrition', `${uid}_${date}`))
  return snap.exists() ? (snap.data() as NutritionLog) : null
}

/**
 * Fetch recent nutrition logs.
 */
export async function fetchRecentNutritionLogs(uid: string, limitDays = 7): Promise<NutritionLog[]> {
  const db = getFirebaseDb()
  if (!db) return []
  const q = query(
    collection(db, 'nutrition'),
    where('uid', '==', uid),
    orderBy('date', 'desc'),
    limit(limitDays)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as NutritionLog)
}

// ─── Personal Records ─────────────────────────────────────────────────────────

export interface PR {
  exerciseName: string
  weight: number
  reps: number
  achievedAt: Timestamp | null
}

/**
 * Upsert a personal record for a given exercise.
 * Document ID is `{uid}_{exercise_name_with_underscores}`.
 */
export async function updatePR(
  uid: string,
  exercise: string,
  weight: number,
  reps: number,
): Promise<void> {
  const db = getFirebaseDb()
  if (!db) return
  await setDoc(
    doc(db, 'prs', `${uid}_${exercise.replace(/\s+/g, '_')}`),
    { uid, exerciseName: exercise, weight, reps, achievedAt: serverTimestamp() },
    { merge: true },
  )
}

/**
 * Fetch all personal records for a user.
 */
export async function fetchAllPRs(uid: string): Promise<PR[]> {
  const db = getFirebaseDb()
  if (!db) return []
  const q = query(collection(db, 'prs'), where('uid', '==', uid))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as PR)
}
