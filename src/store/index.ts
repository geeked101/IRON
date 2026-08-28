import { create } from 'zustand'
import { format } from 'date-fns'
import {
  signInAnon,
  listenAuthState,
  isFirebaseConfigured,
  fetchUserProfile,
  saveUserProfile,
  UserProfile,
  SetLog,
  ExerciseLog,
  MealEntry,
  saveNutritionLog,
  fetchNutritionLog,
} from '../services/firebase'

// ─── Auth Store ───────────────────────────────────────────────────────────────

interface AuthState {
  uid: string | null
  isReady: boolean
  isOnboarded: boolean
  initialize: () => void
  setOnboarded: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  uid: null,
  isReady: false,
  isOnboarded: false,

  initialize: () => {
    try {
      console.log('[AuthStore] Setting up authentication state listener...')
      listenAuthState(async (user) => {
        try {
          if (user) {
            console.log('[AuthStore] User authenticated successfully:', user.uid)
            const profile = await fetchUserProfile(user.uid)
            if (profile) {
              useProfileStore.getState().setProfile(profile)
            }
            set({
              uid: user.uid,
              isReady: true,
              isOnboarded: !!profile?.goal,
            })
          } else if (isFirebaseConfigured()) {
            console.log('[AuthStore] No user found, initiating anonymous sign-in...')
            await signInAnon()
          } else {
            console.warn('[AuthStore] Firebase not configured — running without cloud sync.')
            set({ uid: null, isReady: true, isOnboarded: false })
          }
        } catch (error) {
          console.error('[AuthStore] Error inside auth state handler:', error)
          // Gracefully complete loading state to avoid infinite loading screens
          set({ isReady: true })
        }
      })
    } catch (error) {
      console.error('[AuthStore] Error setting up auth listener:', error)
      set({ isReady: true })
    }
  },

  setOnboarded: () => set({ isOnboarded: true }),
}))

// ─── Profile Store ─────────────────────────────────────────────────────────────

interface ProfileState {
  profile: UserProfile | null
  setProfile: (p: Partial<UserProfile>) => void
  saveProfile: () => Promise<void>
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,

  setProfile: (partial) =>
    set((s) => ({
      profile: s.profile ? { ...s.profile, ...partial } : (partial as UserProfile),
    })),

  saveProfile: async () => {
    const { profile } = get()
    const { uid } = useAuthStore.getState()
    if (!profile?.goal) return

    const payload: Partial<UserProfile> = {
      ...profile,
      uid: uid ?? profile.uid ?? '',
      gender: profile.gender ?? 'male',
      notifications: profile.notifications ?? false,
      autoProgressiveOverload: profile.autoProgressiveOverload ?? true,
    }

    if (uid) {
      try {
        await saveUserProfile(uid, payload)
      } catch (error) {
        console.warn('[ProfileStore] Firestore save failed; entering app locally:', error)
      }
    }

    useAuthStore.getState().setOnboarded()
  },
}))

// ─── Workout Store ─────────────────────────────────────────────────────────────

interface ActiveSet {
  weight: number
  reps: number
  done: boolean
}

interface WorkoutState {
  activeDay: number
  activeDayName: string
  activeExerciseIndex: number
  exercises: { name: string; targetSets: number; targetReps: string; sets: ActiveSet[] }[]
  sessionStartTime: Date | null
  isSessionActive: boolean

  startSession: (day: number, dayName: string, exercises: string[]) => void
  logSet: (exerciseIndex: number, weight: number, reps: number) => void
  toggleSet: (exerciseIndex: number, setIndex: number) => void
  nextExercise: () => void
  finishSession: () => ExerciseLog[]
  resetSession: () => void
}

const DEFAULT_SETS = 4
const DEFAULT_REPS = '8–10'

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  activeDay: 1,
  activeDayName: 'Push',
  activeExerciseIndex: 0,
  exercises: [],
  sessionStartTime: null,
  isSessionActive: false,

  startSession: (day, dayName, exerciseNames) => {
    set({
      activeDay: day,
      activeDayName: dayName,
      activeExerciseIndex: 0,
      sessionStartTime: new Date(),
      isSessionActive: true,
      exercises: exerciseNames.map(name => ({
        name,
        targetSets: DEFAULT_SETS,
        targetReps: DEFAULT_REPS,
        sets: [],
      })),
    })
  },

  logSet: (exerciseIndex, weight, reps) => {
    set((s) => {
      const exercises = [...s.exercises]
      exercises[exerciseIndex] = {
        ...exercises[exerciseIndex],
        sets: [
          ...exercises[exerciseIndex].sets,
          { weight, reps, done: false },
        ],
      }
      return { exercises }
    })
  },

  toggleSet: (exerciseIndex, setIndex) => {
    set((s) => {
      const exercises = [...s.exercises]
      const sets = [...exercises[exerciseIndex].sets]
      sets[setIndex] = { ...sets[setIndex], done: !sets[setIndex].done }
      exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets }
      return { exercises }
    })
  },

  nextExercise: () => {
    set((s) => ({
      activeExerciseIndex: Math.min(
        s.activeExerciseIndex + 1,
        s.exercises.length - 1
      ),
    }))
  },

  finishSession: () => {
    const { exercises } = get()
    return exercises.map(ex => ({
      name: ex.name,
      sets: ex.sets,
    }))
  },

  resetSession: () => {
    set({
      exercises: [],
      sessionStartTime: null,
      isSessionActive: false,
      activeExerciseIndex: 0,
    })
  },
}))

// ─── Nutrition Store ──────────────────────────────────────────────────────────

interface NutritionState {
  date: string
  meals: MealEntry[]
  waterLitres: number
  targetCalories: number
  targetProtein: number
  targetWater: number
  totalCalories: number
  totalProtein: number
  load: () => Promise<void>
  addMeal: (meal: MealEntry) => void
  addWater: (litres: number) => void
  save: () => Promise<void>
}

export const useNutritionStore = create<NutritionState>((set, get) => ({
  date: format(new Date(), 'yyyy-MM-dd'),
  meals: [],
  waterLitres: 0,
  targetCalories: 2700,
  targetProtein: 110,
  targetWater: 4,
  totalCalories: 0,
  totalProtein: 0,

  load: async () => {
    const { uid } = useAuthStore.getState()
    const { date } = get()
    if (!uid) return

    // Sync targets from profile store if available
    const profile = useProfileStore.getState().profile
    if (profile) {
      set({
        targetCalories: profile.targetCalories ?? 2700,
        targetProtein: profile.targetProtein ?? 110,
        targetWater: profile.targetWater ?? 4,
      })
    }

    const log = await fetchNutritionLog(uid, date)
    if (log) {
      set({
        meals: log.meals,
        waterLitres: log.waterLitres,
        totalCalories: log.totalCalories,
        totalProtein: log.totalProtein,
      })
    } else {
      set({
        meals: [],
        waterLitres: 0,
        totalCalories: 0,
        totalProtein: 0,
      })
    }
  },

  addMeal: async (meal) => {
    set((s) => {
      const meals = [...s.meals, meal]
      const totalCalories = meals.reduce((a, m) => a + m.calories, 0)
      const totalProtein = meals.reduce((a, m) => a + m.protein, 0)
      return { meals, totalCalories, totalProtein }
    })
    await get().save()
  },

  addWater: async (litres) => {
    set((s) => ({ waterLitres: Math.min(s.waterLitres + litres, 10) }))
    await get().save()
  },

  save: async () => {
    const { uid } = useAuthStore.getState()
    const s = get()
    if (!uid) return
    await saveNutritionLog(uid, s.date, {
      meals: s.meals,
      waterLitres: s.waterLitres,
      totalCalories: s.totalCalories,
      totalProtein: s.totalProtein,
    })
  },
}))
