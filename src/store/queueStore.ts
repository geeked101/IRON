/**
 * queueStore.ts
 *
 * Sequential workout queue store for the IRON app.
 * Replaces calendar-based day logic entirely.
 *
 * State is dual-persisted:
 *   - AsyncStorage key: "iron_queue"  (survives restarts, no auth required)
 *   - Firestore users/{uid} merged field "queue" (survives device changes)
 */

import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getFirebaseDb } from '../services/firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'

/** Minimum day number in the PPL×2 split. */
const MIN_DAY = 1

/** Maximum day number (Day 7 = Recovery / Rest). */
const MAX_DAY = 7

/** AsyncStorage key used to persist the queue. */
const ASYNC_KEY = 'iron_queue'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Serialisable snapshot stored in AsyncStorage and Firestore. */
export interface QueueSnapshot {
  currentDay: number
  previousDay: number | null
  lastCompletedDay: number | null
  cycleCount: number
  sessionCompleted: boolean
  /** True when the user has finished Day 6 and the rest-day prompt is pending. */
  pendingRestPrompt: boolean
}

/** Full Zustand store state and actions. */
export interface QueueState extends QueueSnapshot {
  /**
   * Load persisted state from AsyncStorage first, then reconcile with
   * Firestore when a UID is available.
   * @param uid - Firebase UID (optional; skipped when not yet authenticated)
   */
  load: (uid?: string | null) => Promise<void>

  /**
   * Persist current state to AsyncStorage and (when a UID is provided)
   * to the Firestore users/{uid} document via merge.
   * @param uid - Firebase UID (optional)
   */
  persist: (uid?: string | null) => Promise<void>

  /**
   * Mark the current day's session as completed.
   * Sets sessionCompleted = true and lastCompletedDay = currentDay.
   * Also sets pendingRestPrompt = true when completing Day 6.
   * @param uid - Firebase UID for immediate persistence
   */
  markSessionCompleted: (uid?: string | null) => Promise<void>

  /**
   * Advance the queue to the next (or a specific target) day.
   * Resets sessionCompleted. Increments cycleCount when rolling past Day 6.
   * @param targetDay - explicit day to jump to (skip logic). Defaults to natural next.
   * @param uid - Firebase UID for immediate persistence
   */
  advanceDay: (targetDay?: number, uid?: string | null) => Promise<void>

  /**
   * Jump directly to a specific day, bypassing intervening days.
   * Bypassed day count is recorded in previousDay allowing easy undo.
   * @param day - destination day (1–7)
   * @param uid - Firebase UID for immediate persistence
   */
  skipToDay: (day: number, uid?: string | null) => Promise<void>

  /**
   * Revert the previous queue jump, restoring the active day prior to skipping.
   * @param uid - Firebase UID for immediate persistence
   */
  undoSkip: (uid?: string | null) => Promise<void>

  /**
   * Clear the pending rest-day prompt flag without advancing.
   * Called after the bottom-sheet modal is dismissed.
   * @param uid - Firebase UID for immediate persistence
   */
  clearRestPrompt: (uid?: string | null) => Promise<void>
}

// ─── Default state ────────────────────────────────────────────────────────────

const DEFAULT_SNAPSHOT: QueueSnapshot = {
  currentDay: 1,
  previousDay: null,
  lastCompletedDay: null,
  cycleCount: 1,
  sessionCompleted: false,
  pendingRestPrompt: false,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Calculate the natural next day in the queue.
 * Day 6 → Day 7 (rest), Day 7 → Day 1 (new cycle).
 * @param current - current day number
 */
function naturalNextDay(current: number): number {
  if (current >= MAX_DAY) return MIN_DAY
  return current + 1
}

/**
 * Determine whether advancing from `from` day to `to` day
 * crosses a cycle boundary (i.e. increments cycleCount).
 * A cycle boundary is crossed when to < from OR from === MAX_DAY.
 */
function crossesCycleBoundary(from: number, to: number): boolean {
  return to < from || from >= MAX_DAY
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useQueueStore = create<QueueState>((set, get) => ({
  ...DEFAULT_SNAPSHOT,

  // ── load ──────────────────────────────────────────────────────────────────

  load: async (uid) => {
    try {
      // 1. Read from AsyncStorage (fastest, works offline)
      const raw = await AsyncStorage.getItem(ASYNC_KEY)
      let snapshot: QueueSnapshot = DEFAULT_SNAPSHOT

      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<QueueSnapshot>
          snapshot = { ...DEFAULT_SNAPSHOT, ...parsed }
        } catch {
          console.warn('[QueueStore] Failed to parse AsyncStorage snapshot; using defaults.')
        }
      }

      // 2. If authenticated, check Firestore for a potentially newer snapshot
      //    (e.g. user switched devices)
      if (uid) {
        try {
          const db = getFirebaseDb()
          if (db) {
            const ref = doc(db, 'users', uid)
            const snap = await getDoc(ref)
            if (snap.exists()) {
              const data = snap.data()
              if (data?.queue) {
                const remote = data.queue as Partial<QueueSnapshot>
                // Firestore wins if its cycleCount is higher, otherwise local wins
                if ((remote.cycleCount ?? 0) > snapshot.cycleCount) {
                  snapshot = { ...DEFAULT_SNAPSHOT, ...remote }
                }
              }
            }
          }
        } catch (err) {
          console.warn('[QueueStore] Firestore load failed (offline?); using local state:', err)
        }
      }

      set(snapshot)
    } catch (err) {
      console.error('[QueueStore] load error:', err)
    }
  },

  // ── persist ───────────────────────────────────────────────────────────────

  persist: async (uid) => {
    const state = get()
    const snapshot: QueueSnapshot = {
      currentDay: state.currentDay,
      previousDay: state.previousDay,
      lastCompletedDay: state.lastCompletedDay,
      cycleCount: state.cycleCount,
      sessionCompleted: state.sessionCompleted,
      pendingRestPrompt: state.pendingRestPrompt,
    }

    // Always persist to AsyncStorage
    try {
      await AsyncStorage.setItem(ASYNC_KEY, JSON.stringify(snapshot))
    } catch (err) {
      console.error('[QueueStore] AsyncStorage write error:', err)
    }

    // Persist to Firestore when authenticated
    if (uid) {
      try {
        const db = getFirebaseDb()
        if (db) {
          await setDoc(
            doc(db, 'users', uid),
            { queue: snapshot },
            { merge: true },
          )
        }
      } catch (err) {
        console.warn('[QueueStore] Firestore write error (offline?):', err)
      }
    }
  },

  // ── markSessionCompleted ──────────────────────────────────────────────────

  markSessionCompleted: async (uid) => {
    const { currentDay } = get()
    const pendingRestPrompt = currentDay === 6

    set({
      sessionCompleted: true,
      lastCompletedDay: currentDay,
      pendingRestPrompt,
    })
    await get().persist(uid)
  },

  // ── advanceDay ────────────────────────────────────────────────────────────

  advanceDay: async (targetDay, uid) => {
    const { currentDay, cycleCount } = get()
    const next = targetDay !== undefined ? targetDay : naturalNextDay(currentDay)
    const newCycle = crossesCycleBoundary(currentDay, next) ? cycleCount + 1 : cycleCount

    set({
      currentDay: next,
      sessionCompleted: false,
      pendingRestPrompt: false,
      cycleCount: newCycle,
    })
    await get().persist(uid)
  },

  // ── skipToDay ─────────────────────────────────────────────────────────────

  skipToDay: async (day, uid) => {
    const { cycleCount, currentDay } = get()
    const newCycle = crossesCycleBoundary(currentDay, day) ? cycleCount + 1 : cycleCount

    set({
      previousDay: currentDay,
      currentDay: day,
      sessionCompleted: false,
      pendingRestPrompt: false,
      cycleCount: newCycle,
    })
    await get().persist(uid)
  },

  // ── undoSkip ──────────────────────────────────────────────────────────────

  undoSkip: async (uid) => {
    const { previousDay, currentDay } = get()
    if (previousDay === null || previousDay === currentDay) return

    set({
      currentDay: previousDay,
      previousDay: null,
      sessionCompleted: false,
      pendingRestPrompt: false,
    })
    await get().persist(uid)
  },

  // ── clearRestPrompt ───────────────────────────────────────────────────────

  clearRestPrompt: async (uid) => {
    set({ pendingRestPrompt: false })
    await get().persist(uid)
  },
}))
