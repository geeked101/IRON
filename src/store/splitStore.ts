/**
 * splitStore.ts
 *
 * Store for managing custom workout splits and exercise customization.
 * Allows users to add, edit, reorder, or remove exercises from any workout day,
 * or reset to default PPL split.
 */

import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { WORKOUT_SPLIT, WorkoutDay, Exercise } from '../data/workoutSplit'

const SPLIT_STORAGE_KEY = '@iron_custom_workout_split_v1'

interface SplitState {
  split: WorkoutDay[]
  isCustomized: boolean
  loadSplit: () => Promise<void>
  saveSplit: (newSplit: WorkoutDay[]) => Promise<void>
  addExerciseToDay: (dayNumber: number, exercise: Exercise) => Promise<void>
  updateExerciseInDay: (dayNumber: number, exerciseIndex: number, updated: Partial<Exercise>) => Promise<void>
  removeExerciseFromDay: (dayNumber: number, exerciseIndex: number) => Promise<void>
  resetToDefaultSplit: () => Promise<void>
}

export const useSplitStore = create<SplitState>((set, get) => ({
  split: WORKOUT_SPLIT,
  isCustomized: false,

  loadSplit: async () => {
    try {
      const json = await AsyncStorage.getItem(SPLIT_STORAGE_KEY)
      if (json) {
        const parsed = JSON.parse(json) as WorkoutDay[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          set({ split: parsed, isCustomized: true })
          return
        }
      }
    } catch (e) {
      console.warn('[SplitStore] Error loading custom split:', e)
    }
    set({ split: WORKOUT_SPLIT, isCustomized: false })
  },

  saveSplit: async (newSplit: WorkoutDay[]) => {
    try {
      await AsyncStorage.setItem(SPLIT_STORAGE_KEY, JSON.stringify(newSplit))
      set({ split: newSplit, isCustomized: true })
    } catch (e) {
      console.error('[SplitStore] Error saving split:', e)
    }
  },

  addExerciseToDay: async (dayNumber: number, exercise: Exercise) => {
    const current = get().split
    const updated = current.map(d => {
      if (d.day === dayNumber) {
        return { ...d, exercises: [...d.exercises, exercise] }
      }
      return d
    })
    await get().saveSplit(updated)
  },

  updateExerciseInDay: async (dayNumber: number, exerciseIndex: number, updatedProps: Partial<Exercise>) => {
    const current = get().split
    const updated = current.map(d => {
      if (d.day === dayNumber) {
        const exercises = [...d.exercises]
        if (exercises[exerciseIndex]) {
          exercises[exerciseIndex] = { ...exercises[exerciseIndex], ...updatedProps }
        }
        return { ...d, exercises }
      }
      return d
    })
    await get().saveSplit(updated)
  },

  removeExerciseFromDay: async (dayNumber: number, exerciseIndex: number) => {
    const current = get().split
    const updated = current.map(d => {
      if (d.day === dayNumber) {
        const exercises = d.exercises.filter((_, idx) => idx !== exerciseIndex)
        return { ...d, exercises }
      }
      return d
    })
    await get().saveSplit(updated)
  },

  resetToDefaultSplit: async () => {
    try {
      await AsyncStorage.removeItem(SPLIT_STORAGE_KEY)
      set({ split: WORKOUT_SPLIT, isCustomized: false })
    } catch (e) {
      console.error('[SplitStore] Error resetting split:', e)
    }
  },
}))
