/**
 * customFoodStore.ts
 *
 * Manages user-created custom foods for the IRON nutrition logger.
 *
 * Persistence strategy:
 *   1. AsyncStorage (key: iron_custom_foods) — instant, works offline
 *   2. Firestore users/{uid}/customFoods — syncs across devices
 *
 * On load: AsyncStorage is read first (fast), then Firestore is checked
 * and merged — Firestore wins on id conflict (higher createdAt wins).
 *
 * On add/remove: AsyncStorage is updated synchronously, Firestore
 * write is fired in the background (non-blocking, offline safe).
 */

import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  CustomFood,
  saveCustomFood,
  fetchCustomFoods,
  deleteCustomFood,
} from '../services/firebase'

/** AsyncStorage key for the custom food cache. */
const ASYNC_KEY = 'iron_custom_foods'

// ─── Store interface ──────────────────────────────────────────────────────────

interface CustomFoodState {
  foods: CustomFood[]
  loading: boolean

  /**
   * Load custom foods from AsyncStorage first, then reconcile with Firestore.
   * Safe to call repeatedly — merges by id, keeps highest createdAt.
   * @param uid - Firebase user UID
   */
  load: (uid: string) => Promise<void>

  /**
   * Add a new custom food. Writes to AsyncStorage immediately,
   * then syncs to Firestore in the background.
   * @param uid  - Firebase user UID
   * @param food - Food data without id/uid/createdAt (generated here)
   */
  add: (
    uid: string,
    food: Omit<CustomFood, 'id' | 'uid' | 'createdAt'>
  ) => Promise<void>

  /**
   * Remove a custom food by id. Removes from AsyncStorage immediately,
   * then deletes from Firestore in the background.
   * @param uid    - Firebase user UID
   * @param foodId - The food's id field
   */
  remove: (uid: string, foodId: string) => Promise<void>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Read the cached food list from AsyncStorage. Returns [] on miss or parse error. */
async function readCache(): Promise<CustomFood[]> {
  try {
    const raw = await AsyncStorage.getItem(ASYNC_KEY)
    if (!raw) return []
    return JSON.parse(raw) as CustomFood[]
  } catch {
    return []
  }
}

/** Write the food list to AsyncStorage. */
async function writeCache(foods: CustomFood[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ASYNC_KEY, JSON.stringify(foods))
  } catch (err) {
    console.warn('[CustomFoodStore] AsyncStorage write failed:', err)
  }
}

/**
 * Merge two food arrays by id. When the same id appears in both,
 * the entry with the higher createdAt wins.
 */
function mergeFoods(local: CustomFood[], remote: CustomFood[]): CustomFood[] {
  const map = new Map<string, CustomFood>()
  for (const f of local) map.set(f.id, f)
  for (const f of remote) {
    const existing = map.get(f.id)
    if (!existing || f.createdAt > existing.createdAt) {
      map.set(f.id, f)
    }
  }
  return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt)
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCustomFoodStore = create<CustomFoodState>((set, get) => ({
  foods: [],
  loading: false,

  load: async (uid) => {
    set({ loading: true })

    // Step 1 — AsyncStorage (instant)
    const cached = await readCache()
    set({ foods: cached })

    // Step 2 — Firestore reconciliation (background)
    try {
      const remote = await fetchCustomFoods(uid)
      if (remote.length > 0 || cached.length > 0) {
        const merged = mergeFoods(cached, remote)
        set({ foods: merged })
        await writeCache(merged)
      }
    } catch (err) {
      console.warn('[CustomFoodStore] Firestore load failed (offline?):', err)
    } finally {
      set({ loading: false })
    }
  },

  add: async (uid, foodData) => {
    const newFood: CustomFood = {
      ...foodData,
      id: Date.now().toString(),
      uid,
      createdAt: Date.now(),
    }

    // Update local state and cache immediately
    const updated = [newFood, ...get().foods]
    set({ foods: updated })
    await writeCache(updated)

    // Firestore in background — non-blocking
    saveCustomFood(uid, newFood).catch(err =>
      console.warn('[CustomFoodStore] Firestore add failed (will retry on next load):', err)
    )
  },

  remove: async (uid, foodId) => {
    const updated = get().foods.filter(f => f.id !== foodId)
    set({ foods: updated })
    await writeCache(updated)

    // Firestore delete in background
    deleteCustomFood(uid, foodId).catch(err =>
      console.warn('[CustomFoodStore] Firestore delete failed:', err)
    )
  },
}))
