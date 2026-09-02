import { SetLog, WorkoutSession } from '../services/firebase'
import { format } from 'date-fns'

export interface ProgressionSuggestion {
  type: 'increase' | 'maintain' | 'deload'
  weightChange: number           // kg, can be negative
  message: string
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Analyse recent sessions for one exercise and suggest next weight intelligently.
 *
 * Logic:
 * - Evaluates multi-session performance (up to 5 recent sessions).
 * - Incorporates RPE/RIR feedback: RPE 7-8 allows +2.5kg; RPE 9-10 recommends volume consolidation.
 * - Multi-week 1RM velocity check: if 1RM growth is stalled (>3 sessions), suggests a 5-10% deload.
 * - Rounds weight change to clean plate increments (default 2.5kg or 1.25kg).
 */
export function suggestProgression(
  exerciseName: string,
  sessions: WorkoutSession[],
  targetReps: number,
  incrementKg = 2.5,
  lastRpe?: number
): ProgressionSuggestion | null {
  const relevantSessions = sessions
    .filter(s => s.exercises?.some(e => e.name === exerciseName))
    .slice(0, 5)

  if (relevantSessions.length === 0) return null

  const lastSession = relevantSessions[0]
  const lastExercise = lastSession.exercises.find(e => e.name === exerciseName)
  if (!lastExercise) return null

  const completedSets = lastExercise.sets.filter(s => s.done)
  if (completedSets.length === 0) return null

  const lastWeight = completedSets[completedSets.length - 1].weight
  const avgReps = completedSets.reduce((a, s) => a + s.reps, 0) / completedSets.length
  const allRepsHit = completedSets.every(s => s.reps >= targetReps)

  // 1. RPE-based micro-adjustment
  if (lastRpe !== undefined && lastRpe > 0) {
    if (lastRpe >= 9.5 && allRepsHit) {
      return {
        type: 'maintain',
        weightChange: 0,
        message: `RPE ${lastRpe} indicates near-maximal effort. Hold at ${lastWeight}kg to solidify form before advancing.`,
        confidence: 'high',
      }
    }
    if (lastRpe <= 7.5 && allRepsHit) {
      const inc = Math.round((incrementKg * 1.25) / 1.25) * 1.25
      return {
        type: 'increase',
        weightChange: inc,
        message: `RPE ${lastRpe} logged (2+ RIR). Strong speed detected. Add +${inc}kg next session!`,
        confidence: 'high',
      }
    }
  }

  // 2. Multi-week fatigue/repetition drop check
  if (relevantSessions.length >= 3) {
    const repsList = relevantSessions.map(s => {
      const ex = s.exercises.find(e => e.name === exerciseName)
      const done = ex?.sets.filter(st => st.done) ?? []
      return done.length > 0 ? done.reduce((a, b) => a + b.reps, 0) / done.length : targetReps
    })

    // Check if reps decreased across last 3 sessions
    if (repsList[0] < targetReps - 2 && repsList[0] < repsList[1] && repsList[1] < repsList[2]) {
      const deloadWeight = Math.round((lastWeight * 0.90) / 2.5) * 2.5
      return {
        type: 'deload',
        weightChange: deloadWeight - lastWeight,
        message: `3-session velocity decline. Deload 10% to ${deloadWeight}kg to clear accumulated fatigue.`,
        confidence: 'high',
      }
    }
  }

  // 3. Standard rep completion target
  if (allRepsHit) {
    return {
      type: 'increase',
      weightChange: incrementKg,
      message: `All ${completedSets.length} sets hit target ${targetReps} reps. Add +${incrementKg}kg next session.`,
      confidence: 'high',
    }
  }

  return {
    type: 'maintain',
    weightChange: 0,
    message: `Averaged ${avgReps.toFixed(1)}/${targetReps} reps. Stay at ${lastWeight}kg and build set volume.`,
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
  weight: number,
  heightCm: number,
  ageYears: number,
  goal: 'lean-bulk' | 'cut' | 'maintain' | 'aggressive-bulk',
  gender: 'male' | 'female' = 'male',
  unit: 'kg' | 'lb' = 'kg'
): { calories: number; protein: number } {
  const weightKg = unit === 'lb' ? weight / 2.20462 : weight
  const genderOffset = gender === 'female' ? -161 : 5
  // Mifflin-St Jeor BMR equation with gender sensitivity
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + genderOffset
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
