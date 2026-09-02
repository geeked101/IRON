/**
 * validation.ts
 *
 * Centralized form validation guardrails and safety bounds for the IRON app.
 * Ensures robust data integrity across workouts, nutrition, profile settings,
 * custom exercises, and custom food creation.
 */

export interface ValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Validate a set entry (weight, reps, optional RPE).
 */
export function validateSetInput(
  weightInput: string | number,
  repsInput: string | number,
  rpeInput?: string | number
): ValidationResult {
  const weight = typeof weightInput === 'number' ? weightInput : parseFloat(weightInput)
  const reps = typeof repsInput === 'number' ? repsInput : parseInt(repsInput, 10)

  if (isNaN(weight) || weight <= 0) {
    return { isValid: false, error: 'Weight must be a positive number greater than 0.' }
  }
  if (weight > 600) {
    return { isValid: false, error: 'Weight exceeds maximum allowable limit (600 kg/lb).' }
  }

  if (isNaN(reps) || reps <= 0 || !Number.isInteger(reps)) {
    return { isValid: false, error: 'Reps must be a positive whole number greater than 0.' }
  }
  if (reps > 100) {
    return { isValid: false, error: 'Reps count cannot exceed 100 reps per set.' }
  }

  if (rpeInput !== undefined && rpeInput !== '') {
    const rpe = typeof rpeInput === 'number' ? rpeInput : parseFloat(rpeInput)
    if (isNaN(rpe) || rpe < 5 || rpe > 10) {
      return { isValid: false, error: 'RPE must be between 5.0 and 10.0.' }
    }
  }

  return { isValid: true }
}

/**
 * Validate user profile body stats and target inputs.
 */
export function validateProfileInput(data: {
  weight?: number | string
  height?: number | string
  age?: number | string
  targetCalories?: number | string
  targetProtein?: number | string
  targetWater?: number | string
}): ValidationResult {
  if (data.weight !== undefined) {
    const w = typeof data.weight === 'number' ? data.weight : parseFloat(data.weight)
    if (isNaN(w) || w < 30 || w > 350) {
      return { isValid: false, error: 'Body weight must be between 30 and 350.' }
    }
  }

  if (data.height !== undefined) {
    const h = typeof data.height === 'number' ? data.height : parseFloat(data.height)
    if (isNaN(h) || h < 100 || h > 250) {
      return { isValid: false, error: 'Height must be between 100 cm and 250 cm.' }
    }
  }

  if (data.age !== undefined) {
    const a = typeof data.age === 'number' ? data.age : parseInt(String(data.age), 10)
    if (isNaN(a) || a < 12 || a > 100) {
      return { isValid: false, error: 'Age must be between 12 and 100 years.' }
    }
  }

  if (data.targetCalories !== undefined) {
    const c = typeof data.targetCalories === 'number' ? data.targetCalories : parseInt(String(data.targetCalories), 10)
    if (isNaN(c) || c < 1000 || c > 8000) {
      return { isValid: false, error: 'Daily target calories must be between 1,000 and 8,000 kcal.' }
    }
  }

  if (data.targetProtein !== undefined) {
    const p = typeof data.targetProtein === 'number' ? data.targetProtein : parseFloat(String(data.targetProtein))
    if (isNaN(p) || p < 20 || p > 400) {
      return { isValid: false, error: 'Target protein must be between 20g and 400g.' }
    }
  }

  if (data.targetWater !== undefined) {
    const w = typeof data.targetWater === 'number' ? data.targetWater : parseFloat(String(data.targetWater))
    if (isNaN(w) || w < 0.5 || w > 15) {
      return { isValid: false, error: 'Daily target water must be between 0.5L and 15L.' }
    }
  }

  return { isValid: true }
}

/**
 * Validate custom food item creation.
 */
export function validateCustomFoodInput(data: {
  name: string
  calories: number | string
  protein: number | string
  carbs: number | string
  fat: number | string
}): ValidationResult {
  if (!data.name || data.name.trim().length < 2) {
    return { isValid: false, error: 'Food name must be at least 2 characters.' }
  }

  const cal = typeof data.calories === 'number' ? data.calories : parseFloat(data.calories)
  if (isNaN(cal) || cal < 0 || cal > 5000) {
    return { isValid: false, error: 'Calories must be a valid non-negative number up to 5,000 kcal.' }
  }

  const p = typeof data.protein === 'number' ? data.protein : parseFloat(data.protein)
  const c = typeof data.carbs === 'number' ? data.carbs : parseFloat(data.carbs)
  const f = typeof data.fat === 'number' ? data.fat : parseFloat(data.fat)

  if (isNaN(p) || p < 0 || p > 500) return { isValid: false, error: 'Protein must be between 0g and 500g.' }
  if (isNaN(c) || c < 0 || c > 500) return { isValid: false, error: 'Carbs must be between 0g and 500g.' }
  if (isNaN(f) || f < 0 || f > 500) return { isValid: false, error: 'Fat must be between 0g and 500g.' }

  return { isValid: true }
}

/**
 * Validate custom exercise creation.
 */
export function validateCustomExerciseInput(data: {
  name: string
  muscleGroup: string
  targetSets: number | string
  targetReps: number | string
}): ValidationResult {
  if (!data.name || data.name.trim().length < 2) {
    return { isValid: false, error: 'Exercise name must be at least 2 characters.' }
  }
  if (!data.muscleGroup || data.muscleGroup.trim().length === 0) {
    return { isValid: false, error: 'Muscle group is required.' }
  }

  const sets = typeof data.targetSets === 'number' ? data.targetSets : parseInt(data.targetSets, 10)
  if (isNaN(sets) || sets < 1 || sets > 10) {
    return { isValid: false, error: 'Target sets must be between 1 and 10.' }
  }

  const reps = typeof data.targetReps === 'number' ? data.targetReps : parseInt(data.targetReps, 10)
  if (isNaN(reps) || reps < 1 || reps > 50) {
    return { isValid: false, error: 'Target reps must be between 1 and 50.' }
  }

  return { isValid: true }
}
