import { SetLog, WorkoutSession } from '../services/firebase'
import { format } from 'date-fns'

export interface ProgressionSuggestion {
  type: 'increase' | 'maintain' | 'deload'
  weightChange: number           // kg, can be negative
  message: string
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Analyse recent sessions for one exercise and suggest next weight.
 *
 * Logic:
 * - If all target reps were completed in the last session → suggest +2.5kg
 * - If all sets completed but reps dropped >2 from target → maintain
 * - If reps dropped consistently over 2+ sessions → deload by 5%
 */
export function suggestProgression(
  exerciseName: string,
  sessions: WorkoutSession[],
  targetReps: number,
  incrementKg = 2.5
): ProgressionSuggestion | null {
  const relevantSessions = sessions
    .filter(s => s.exercises.some(e => e.name === exerciseName))
    .slice(0, 3)

  if (relevantSessions.length === 0) return null

  const lastSession = relevantSessions[0]
  const lastExercise = lastSession.exercises.find(e => e.name === exerciseName)
  if (!lastExercise) return null

  const completedSets = lastExercise.sets.filter(s => s.done)
  if (completedSets.length === 0) return null

  const lastWeight = completedSets[completedSets.length - 1].weight
  const avgReps = completedSets.reduce((a, s) => a + s.reps, 0) / completedSets.length
  const allRepsHit = completedSets.every(s => s.reps >= targetReps)

  // Check for consistent drop over 2 sessions
  if (relevantSessions.length >= 2) {
    const prevSession = relevantSessions[1]
    const prevExercise = prevSession.exercises.find(e => e.name === exerciseName)
    const prevSets = prevExercise?.sets.filter(s => s.done) ?? []
    const prevAvgReps = prevSets.length > 0
      ? prevSets.reduce((a, s) => a + s.reps, 0) / prevSets.length
      : targetReps

    if (avgReps < targetReps - 2 && avgReps < prevAvgReps - 1) {
      const deloadWeight = Math.round((lastWeight * 0.95) / 2.5) * 2.5
      return {
        type: 'deload',
        weightChange: deloadWeight - lastWeight,
        message: `Reps dropping. Deload to ${deloadWeight}kg and rebuild.`,
        confidence: 'medium',
      }
    }
  }

  if (allRepsHit) {
    return {
      type: 'increase',
      weightChange: incrementKg,
      message: `All ${completedSets.length} sets completed. Add ${incrementKg}kg next session.`,
      confidence: 'high',
    }
  }

  return {
    type: 'maintain',
    weightChange: 0,
    message: `Hit ${Math.round(avgReps)}/${targetReps} reps avg. Stay at ${lastWeight}kg and lock in form.`,
    confidence: 'medium',
  }
}

/**
 * Compute estimated 1RM from weight and reps (Brzycki formula).
 */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (reps === 1) return weight
  return Math.round(weight / (1.0278 - 0.0278 * reps))
}

/**
 * Calculate lean bulk calorie target from bodyweight and goal.
 */
export function calculateCaloricTarget(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  goal: 'lean-bulk' | 'cut' | 'maintain' | 'aggressive-bulk'
): { calories: number; protein: number } {
  // Mifflin-St Jeor BMR (assuming male for now)
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5
  // Moderate activity multiplier
  const tdee = Math.round(bmr * 1.55)

  const surplusMap = {
    'lean-bulk': 250,
    'aggressive-bulk': 500,
    'maintain': 0,
    'cut': -400,
  }

  const calories = tdee + surplusMap[goal]
  // Protein: 2.2g per kg bodyweight for hypertrophy
  const protein = Math.round(weightKg * 2.2)

  return { calories, protein }
}

/**
 * Smart bulk insight — analyse weight trend and calories.
 */
export interface BulkInsight {
  type: 'on-track' | 'increase-calories' | 'decrease-calories' | 'great'
  message: string
}

export function generateBulkInsight(
  weightHistory: number[],   // ordered oldest → newest
  avgDailyCalories: number,
  targetCalories: number,
  goal: string
): BulkInsight {
  if (weightHistory.length < 7) {
    return { type: 'on-track', message: 'Keep logging daily weight — insights appear after 1 week.' }
  }

  const recent = weightHistory.slice(-7)
  const older = weightHistory.slice(-14, -7)
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
  const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg
  const weeklyChange = recentAvg - olderAvg

  if (goal === 'lean-bulk') {
    if (Math.abs(weeklyChange) < 0.1) {
      return { type: 'increase-calories', message: `Weight flat for 7 days. Add 200–250 kcal/day to restart the bulk.` }
    }
    if (weeklyChange > 0.6) {
      return { type: 'decrease-calories', message: `Gaining ${weeklyChange.toFixed(1)}kg/week — slightly fast. Drop 150 kcal to keep it lean.` }
    }
    if (weeklyChange > 0.15 && weeklyChange <= 0.6) {
      return { type: 'great', message: `Gaining ${weeklyChange.toFixed(2)}kg/week. Perfect lean bulk rate. Stay the course.` }
    }
  }

  return { type: 'on-track', message: 'Looking good. Keep consistent with nutrition and training.' }
}

/**
 * Calculate the current consecutive workout days streak, allowing at most a 2-day gap (to accommodate rest days).
 */
export function calculateWorkoutStreak(sessions: WorkoutSession[]): number {
  if (sessions.length === 0) return 0

  const dates = sessions
    .map(s => {
      if (!s.loggedAt) return null
      const d = typeof s.loggedAt.toDate === 'function' ? s.loggedAt.toDate() : new Date(s.loggedAt as any)
      return format(d, 'yyyy-MM-dd')
    })
    .filter((d): d is string => d !== null)

  const uniqueDates = Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a))
  if (uniqueDates.length === 0) return 0

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const yesterdayStr = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd')

  if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) {
    return 0
  }

  let streak = 1
  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const cur = new Date(uniqueDates[i]).getTime()
    const prev = new Date(uniqueDates[i + 1]).getTime()
    const diffDays = (cur - prev) / (1000 * 60 * 60 * 24)

    if (diffDays <= 2) {
      streak++
    } else {
      break
    }
  }

  return streak
}
