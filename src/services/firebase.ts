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
import {
  dbSaveUserProfile,
  dbGetUserProfile,
  dbGetAnyUserProfile,
  dbSaveWorkoutSession,
  dbGetRecentWorkoutSessions,
  dbUpsertPR,
  dbGetAllPRs,
  dbAddWeightLog,
  dbGetWeightHistory,
  dbSaveNutritionLog,
  dbGetNutritionLog,
  dbGetRecentNutritionLogs,
  dbSaveCustomFood,
  dbGetCustomFoods,
  dbDeleteCustomFood,
} from './localDb'

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
 * Persist (or merge-update) a user's profile document.
 * Writes to local SQLite immediately, then syncs to Firestore in background.
 */
export async function saveUserProfile(uid: string, profile: Partial<UserProfile>): Promise<void> {
  // 1. Save to local SQLite immediately (offline-first)
  try {
    dbSaveUserProfile({ ...profile, uid })
  } catch (err) {
    console.error('[LocalDB] Error saving user profile locally:', err)
  }

  // 2. Sync to Firestore in background if available
  const db = getFirebaseDb()
  if (!db) return
  try {
    await setDoc(
      doc(db, 'users', uid),
      { ...profile, updatedAt: serverTimestamp() },
      { merge: true },
    )
  } catch (err) {
    console.warn('[Firebase] Background profile sync failed (offline?):', err)
  }
}

/**
 * Fetch a user's profile. Reads from local SQLite first for zero latency.
 */
export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  // 1. Read from local SQLite
  try {
    const local = uid ? dbGetUserProfile(uid) : dbGetAnyUserProfile()
    if (local) return local
  } catch (err) {
    console.error('[LocalDB] Error reading user profile locally:', err)
  }

  // 2. Fallback to Firestore if local not found and online
  const db = getFirebaseDb()
  if (!db || !uid) return null
  try {
    const snap = await getDoc(doc(db, 'users', uid))
    if (snap.exists()) {
      const data = snap.data() as UserProfile
      dbSaveUserProfile(data)
      return data
    }
  } catch (err) {
    console.warn('[Firebase] Profile fetch failed (offline?):', err)
  }
  return null
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
 * A food entry created by the user. Stored in local SQLite and Firestore.
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
 * Save a custom food to local SQLite and Firestore.
 */
export async function saveCustomFood(uid: string, food: CustomFood): Promise<void> {
  // 1. Save to local SQLite
  try {
    dbSaveCustomFood(uid, food)
  } catch (err) {
    console.error('[LocalDB] Error saving custom food locally:', err)
  }

  // 2. Sync to Firestore in background
  const db = getFirebaseDb()
  if (!db) return
  try {
    await setDoc(doc(db, 'users', uid, 'customFoods', food.id), food)
  } catch (err) {
    console.warn('[Firebase] Custom food sync failed (offline?):', err)
  }
}

/**
 * Fetch all custom foods for a user from local SQLite with Firestore sync fallback.
 */
export async function fetchCustomFoods(uid: string): Promise<CustomFood[]> {
  try {
    const local = dbGetCustomFoods(uid)
    if (local.length > 0) return local
  } catch (err) {
    console.error('[LocalDB] Error reading custom foods locally:', err)
  }

  const db = getFirebaseDb()
  if (!db) return []
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'customFoods'))
    const foods = snap.docs.map(d => d.data() as CustomFood)
    foods.forEach(f => dbSaveCustomFood(uid, f))
    return foods
  } catch (err) {
    console.warn('[Firebase] Custom foods fetch failed (offline?):', err)
    return []
  }
}

/**
 * Delete a custom food by its id from local SQLite and Firestore.
 */
export async function deleteCustomFood(uid: string, foodId: string): Promise<void> {
  try {
    dbDeleteCustomFood(uid, foodId)
  } catch (err) {
    console.error('[LocalDB] Error deleting custom food locally:', err)
  }

  const db = getFirebaseDb()
  if (!db) return
  try {
    const { deleteDoc } = await import('firebase/firestore')
    await deleteDoc(doc(db, 'users', uid, 'customFoods', foodId))
  } catch (err) {
    console.warn('[Firebase] Custom food delete sync failed (offline?):', err)
  }
}

/**
 * Save a completed workout session to local SQLite and Firestore.
 * Returns the session ID.
 */
export async function saveWorkoutSession(session: Omit<WorkoutSession, 'id'>): Promise<string> {
  // 1. Save to local SQLite immediately
  let localId = ''
  try {
    localId = dbSaveWorkoutSession(session)
  } catch (err) {
    console.error('[LocalDB] Error saving workout session locally:', err)
    localId = `sess_${Date.now()}`
  }

  // 2. Sync to Firestore in background
  const db = getFirebaseDb()
  if (db) {
    addDoc(collection(db, 'sessions'), {
      ...session,
      loggedAt: serverTimestamp(),
    }).catch(err => {
      console.warn('[Firebase] Workout session sync failed (offline?):', err)
    })
  }

  return localId
}

/**
 * Fetch the most recent sessions for a user from local SQLite.
 */
export async function fetchRecentSessions(uid: string, sessionLimit = 20): Promise<WorkoutSession[]> {
  try {
    const local = dbGetRecentWorkoutSessions(uid, sessionLimit)
    if (local.length > 0) return local
  } catch (err) {
    console.error('[LocalDB] Error reading workout sessions locally:', err)
  }

  const db = getFirebaseDb()
  if (!db) return []
  try {
    const q = query(
      collection(db, 'sessions'),
      where('uid', '==', uid),
      orderBy('loggedAt', 'desc'),
      limit(sessionLimit),
    )
    const snap = await getDocs(q)
    const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkoutSession))
    sessions.forEach(s => dbSaveWorkoutSession(s))
    return sessions
  } catch (err) {
    console.warn('[Firebase] Recent sessions fetch failed (offline?):', err)
    return []
  }
}

// ─── Weight Logs ──────────────────────────────────────────────────────────────

export interface WeightLog {
  id?: string
  uid: string
  weight: number
  loggedAt: Timestamp | null
}

/**
 * Append a body-weight entry to local SQLite and Firestore.
 */
export async function logWeight(uid: string, weight: number): Promise<string> {
  let localId = ''
  try {
    localId = dbAddWeightLog(uid, weight)
  } catch (err) {
    console.error('[LocalDB] Error saving weight log locally:', err)
    localId = `w_${Date.now()}`
  }

  const db = getFirebaseDb()
  if (db) {
    addDoc(collection(db, 'weightLogs'), {
      uid,
      weight,
      loggedAt: serverTimestamp(),
    }).catch(err => {
      console.warn('[Firebase] Weight log sync failed (offline?):', err)
    })
  }

  return localId
}

/**
 * Fetch all weight entries for a user from local SQLite.
 */
export async function fetchWeightHistory(uid: string): Promise<WeightLog[]> {
  try {
    const local = dbGetWeightHistory(uid)
    if (local.length > 0) return local
  } catch (err) {
    console.error('[LocalDB] Error reading weight history locally:', err)
  }

  const db = getFirebaseDb()
  if (!db) return []
  try {
    const q = query(
      collection(db, 'weightLogs'),
      where('uid', '==', uid),
      orderBy('loggedAt', 'asc'),
    )
    const snap = await getDocs(q)
    const history = snap.docs.map(d => ({ id: d.id, ...d.data() } as WeightLog))
    history.forEach(w => dbAddWeightLog(uid, w.weight, w.loggedAt ? String(w.loggedAt) : undefined))
    return history
  } catch (err) {
    console.warn('[Firebase] Weight history fetch failed (offline?):', err)
    return []
  }
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
 * Save (or merge-update) a nutrition log in local SQLite and Firestore.
 */
export async function saveNutritionLog(
  uid: string,
  date: string,
  data: Partial<NutritionLog>,
): Promise<void> {
  try {
    dbSaveNutritionLog(uid, date, data)
  } catch (err) {
    console.error('[LocalDB] Error saving nutrition log locally:', err)
  }

  const db = getFirebaseDb()
  if (!db) return
  try {
    await setDoc(
      doc(db, 'nutrition', `${uid}_${date}`),
      { uid, date, ...data, updatedAt: serverTimestamp() },
      { merge: true },
    )
  } catch (err) {
    console.warn('[Firebase] Nutrition log sync failed (offline?):', err)
  }
}

/**
 * Fetch a single day's nutrition log from local SQLite.
 */
export async function fetchNutritionLog(uid: string, date: string): Promise<NutritionLog | null> {
  try {
    const local = dbGetNutritionLog(uid, date)
    if (local) return local
  } catch (err) {
    console.error('[LocalDB] Error reading nutrition log locally:', err)
  }

  const db = getFirebaseDb()
  if (!db) return null
  try {
    const snap = await getDoc(doc(db, 'nutrition', `${uid}_${date}`))
    if (snap.exists()) {
      const data = snap.data() as NutritionLog
      dbSaveNutritionLog(uid, date, data)
      return data
    }
  } catch (err) {
    console.warn('[Firebase] Nutrition log fetch failed (offline?):', err)
  }
  return null
}

/**
 * Fetch recent nutrition logs from local SQLite.
 */
export async function fetchRecentNutritionLogs(uid: string, limitDays = 7): Promise<NutritionLog[]> {
  try {
    const local = dbGetRecentNutritionLogs(uid, limitDays)
    if (local.length > 0) return local
  } catch (err) {
    console.error('[LocalDB] Error reading recent nutrition logs locally:', err)
  }

  const db = getFirebaseDb()
  if (!db) return []
  try {
    const q = query(
      collection(db, 'nutrition'),
      where('uid', '==', uid),
      orderBy('date', 'desc'),
      limit(limitDays)
    )
    const snap = await getDocs(q)
    const logs = snap.docs.map(d => d.data() as NutritionLog)
    logs.forEach(l => dbSaveNutritionLog(uid, l.date, l))
    return logs
  } catch (err) {
    console.warn('[Firebase] Recent nutrition logs fetch failed (offline?):', err)
    return []
  }
}

// ─── Personal Records ─────────────────────────────────────────────────────────

export interface PR {
  exerciseName: string
  weight: number
  reps: number
  achievedAt: Timestamp | null
}

/**
 * Upsert a personal record for a given exercise in local SQLite and Firestore.
 */
export async function updatePR(
  uid: string,
  exercise: string,
  weight: number,
  reps: number,
): Promise<void> {
  try {
    dbUpsertPR(uid, exercise, weight, reps)
  } catch (err) {
    console.error('[LocalDB] Error saving PR locally:', err)
  }

  const db = getFirebaseDb()
  if (!db) return
  try {
    await setDoc(
      doc(db, 'prs', `${uid}_${exercise.replace(/\s+/g, '_')}`),
      { uid, exerciseName: exercise, weight, reps, achievedAt: serverTimestamp() },
      { merge: true },
    )
  } catch (err) {
    console.warn('[Firebase] PR sync failed (offline?):', err)
  }
}

/**
 * Fetch all personal records for a user from local SQLite.
 */
export async function fetchAllPRs(uid: string): Promise<PR[]> {
  try {
    const local = dbGetAllPRs(uid)
    if (local.length > 0) return local
  } catch (err) {
    console.error('[LocalDB] Error reading PRs locally:', err)
  }

  const db = getFirebaseDb()
  if (!db) return []
  try {
    const q = query(collection(db, 'prs'), where('uid', '==', uid))
    const snap = await getDocs(q)
    const prs = snap.docs.map(d => d.data() as PR)
    prs.forEach(p => dbUpsertPR(uid, p.exerciseName, p.weight, p.reps))
    return prs
  } catch (err) {
    console.warn('[Firebase] PRs fetch failed (offline?):', err)
    return []
  }
}

