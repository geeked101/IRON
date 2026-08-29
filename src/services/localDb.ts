/**
 * localDb.ts
 *
 * Local SQLite database manager for the IRON app using expo-sqlite.
 * Guarantees 100% offline-first data persistence for user profiles,
 * workout sessions, exercise sets, PRs, weight tracking, nutrition logs,
 * and custom foods.
 */

import * as SQLite from 'expo-sqlite'
import type {
  UserProfile,
  WorkoutSession,
  PR,
  WeightLog,
  NutritionLog,
  CustomFood,
} from './firebase'

const DB_NAME = 'iron.db'

let dbInstance: SQLite.SQLiteDatabase | null = null

/**
 * Get or initialize the SQLite database connection.
 */
export function getLocalDb(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync(DB_NAME)
  }
  return dbInstance
}

/**
 * Initialize all required tables and indexes on application startup.
 */
export function initLocalDatabase(): void {
  try {
    const db = getLocalDb()

    db.execSync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS user_profile (
        uid TEXT PRIMARY KEY,
        goal TEXT,
        level TEXT,
        weight REAL,
        height REAL,
        age INTEGER,
        gender TEXT,
        target_calories INTEGER,
        target_protein REAL,
        target_water REAL,
        units TEXT,
        auto_progressive_overload INTEGER,
        notifications INTEGER,
        created_at TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS workout_sessions (
        id TEXT PRIMARY KEY,
        uid TEXT NOT NULL,
        day INTEGER NOT NULL,
        day_name TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        total_volume REAL NOT NULL,
        prs_json TEXT,
        notes TEXT,
        exercises_json TEXT NOT NULL,
        logged_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_uid_date ON workout_sessions(uid, logged_at DESC);

      CREATE TABLE IF NOT EXISTS personal_records (
        id TEXT PRIMARY KEY,
        uid TEXT NOT NULL,
        exercise_name TEXT NOT NULL,
        weight REAL NOT NULL,
        reps INTEGER NOT NULL,
        achieved_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_prs_uid ON personal_records(uid);

      CREATE TABLE IF NOT EXISTS weight_logs (
        id TEXT PRIMARY KEY,
        uid TEXT NOT NULL,
        weight REAL NOT NULL,
        logged_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_weight_uid_date ON weight_logs(uid, logged_at ASC);

      CREATE TABLE IF NOT EXISTS nutrition_logs (
        id TEXT PRIMARY KEY,
        uid TEXT NOT NULL,
        date TEXT NOT NULL,
        meals_json TEXT NOT NULL,
        total_calories REAL NOT NULL,
        total_protein REAL NOT NULL,
        water_litres REAL NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_nutrition_uid_date ON nutrition_logs(uid, date DESC);

      CREATE TABLE IF NOT EXISTS custom_foods (
        id TEXT PRIMARY KEY,
        uid TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        calories_per_serving REAL NOT NULL,
        protein_g REAL NOT NULL,
        carbs_g REAL NOT NULL,
        fat_g REAL NOT NULL,
        serving_description TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_custom_foods_uid ON custom_foods(uid);
    `)

    console.log('[LocalDB] Database schema initialized successfully.')
  } catch (error) {
    console.error('[LocalDB] Error initializing database schema:', error)
  }
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export function dbSaveUserProfile(profile: Partial<UserProfile> & { uid: string }): void {
  const db = getLocalDb()
  const now = new Date().toISOString()
  const existing = dbGetUserProfile(profile.uid)

  const finalProfile = {
    goal: profile.goal ?? existing?.goal ?? 'lean-bulk',
    level: profile.level ?? existing?.level ?? 'beginner',
    weight: profile.weight ?? existing?.weight ?? 70,
    height: profile.height ?? existing?.height ?? 175,
    age: profile.age ?? existing?.age ?? 22,
    gender: profile.gender ?? existing?.gender ?? 'male',
    targetCalories: profile.targetCalories ?? existing?.targetCalories ?? 2700,
    targetProtein: profile.targetProtein ?? existing?.targetProtein ?? 110,
    targetWater: profile.targetWater ?? existing?.targetWater ?? 4,
    units: profile.units ?? existing?.units ?? 'kg',
    autoProgressiveOverload: (profile.autoProgressiveOverload ?? existing?.autoProgressiveOverload ?? true) ? 1 : 0,
    notifications: (profile.notifications ?? existing?.notifications ?? false) ? 1 : 0,
    createdAt: existing?.createdAt ? String(existing.createdAt) : now,
    updatedAt: now,
  }

  db.runSync(
    `INSERT INTO user_profile (
      uid, goal, level, weight, height, age, gender,
      target_calories, target_protein, target_water, units,
      auto_progressive_overload, notifications, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(uid) DO UPDATE SET
      goal = excluded.goal,
      level = excluded.level,
      weight = excluded.weight,
      height = excluded.height,
      age = excluded.age,
      gender = excluded.gender,
      target_calories = excluded.target_calories,
      target_protein = excluded.target_protein,
      target_water = excluded.target_water,
      units = excluded.units,
      auto_progressive_overload = excluded.auto_progressive_overload,
      notifications = excluded.notifications,
      updated_at = excluded.updated_at;`,
    [
      profile.uid,
      finalProfile.goal,
      finalProfile.level,
      finalProfile.weight,
      finalProfile.height,
      finalProfile.age,
      finalProfile.gender,
      finalProfile.targetCalories,
      finalProfile.targetProtein,
      finalProfile.targetWater,
      finalProfile.units,
      finalProfile.autoProgressiveOverload,
      finalProfile.notifications,
      finalProfile.createdAt,
      finalProfile.updatedAt,
    ]
  )
}

export function dbGetUserProfile(uid: string): UserProfile | null {
  const db = getLocalDb()
  const row = db.getFirstSync<any>(
    `SELECT * FROM user_profile WHERE uid = ? LIMIT 1;`,
    [uid]
  )

  if (!row) return null

  return {
    uid: row.uid,
    goal: row.goal,
    level: row.level,
    weight: row.weight,
    height: row.height,
    age: row.age,
    gender: row.gender,
    targetCalories: row.target_calories,
    targetProtein: row.target_protein,
    targetWater: row.target_water,
    units: row.units,
    autoProgressiveOverload: row.auto_progressive_overload === 1,
    notifications: row.notifications === 1,
    createdAt: row.created_at,
  }
}

/** Get the latest user profile saved on the device (useful on cold start when uid isn't known yet). */
export function dbGetAnyUserProfile(): UserProfile | null {
  const db = getLocalDb()
  const row = db.getFirstSync<any>(
    `SELECT * FROM user_profile ORDER BY updated_at DESC LIMIT 1;`
  )

  if (!row) return null

  return {
    uid: row.uid,
    goal: row.goal,
    level: row.level,
    weight: row.weight,
    height: row.height,
    age: row.age,
    gender: row.gender,
    targetCalories: row.target_calories,
    targetProtein: row.target_protein,
    targetWater: row.target_water,
    units: row.units,
    autoProgressiveOverload: row.auto_progressive_overload === 1,
    notifications: row.notifications === 1,
    createdAt: row.created_at,
  }
}

// ─── Workout Sessions ─────────────────────────────────────────────────────────

export function dbSaveWorkoutSession(session: Omit<WorkoutSession, 'id'> & { id?: string }): string {
  const db = getLocalDb()
  const id = session.id || `local_sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  const loggedAt = session.loggedAt
    ? (typeof (session.loggedAt as any).toDate === 'function'
        ? (session.loggedAt as any).toDate().toISOString()
        : String(session.loggedAt))
    : new Date().toISOString()

  db.runSync(
    `INSERT INTO workout_sessions (
      id, uid, day, day_name, duration_minutes, total_volume,
      prs_json, notes, exercises_json, logged_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      day = excluded.day,
      day_name = excluded.day_name,
      duration_minutes = excluded.duration_minutes,
      total_volume = excluded.total_volume,
      prs_json = excluded.prs_json,
      notes = excluded.notes,
      exercises_json = excluded.exercises_json,
      logged_at = excluded.logged_at;`,
    [
      id,
      session.uid,
      session.day,
      session.dayName,
      session.durationMinutes,
      session.totalVolume,
      JSON.stringify(session.prs || []),
      session.notes || '',
      JSON.stringify(session.exercises || []),
      loggedAt,
    ]
  )

  return id
}

export function dbGetRecentWorkoutSessions(uid: string, sessionLimit = 20): WorkoutSession[] {
  const db = getLocalDb()
  const rows = db.getAllSync<any>(
    `SELECT * FROM workout_sessions WHERE uid = ? ORDER BY logged_at DESC LIMIT ?;`,
    [uid, sessionLimit]
  )

  return rows.map((r) => ({
    id: r.id,
    uid: r.uid,
    day: r.day,
    dayName: r.day_name,
    durationMinutes: r.duration_minutes,
    totalVolume: r.total_volume,
    prs: JSON.parse(r.prs_json || '[]'),
    notes: r.notes || '',
    exercises: JSON.parse(r.exercises_json || '[]'),
    loggedAt: r.logged_at ? new Date(r.logged_at) : (new Date() as any),
  }))
}

// ─── Personal Records ─────────────────────────────────────────────────────────

export function dbUpsertPR(uid: string, exerciseName: string, weight: number, reps: number): void {
  const db = getLocalDb()
  const id = `${uid}_${exerciseName.trim().toLowerCase().replace(/\s+/g, '_')}`
  const achievedAt = new Date().toISOString()

  db.runSync(
    `INSERT INTO personal_records (id, uid, exercise_name, weight, reps, achieved_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       weight = excluded.weight,
       reps = excluded.reps,
       achieved_at = excluded.achieved_at;`,
    [id, uid, exerciseName, weight, reps, achievedAt]
  )
}

export function dbGetAllPRs(uid: string): PR[] {
  const db = getLocalDb()
  const rows = db.getAllSync<any>(
    `SELECT * FROM personal_records WHERE uid = ?;`,
    [uid]
  )

  return rows.map((r) => ({
    exerciseName: r.exercise_name,
    weight: r.weight,
    reps: r.reps,
    achievedAt: r.achieved_at ? new Date(r.achieved_at) : (new Date() as any),
  }))
}

// ─── Weight Logs ──────────────────────────────────────────────────────────────

export function dbAddWeightLog(uid: string, weight: number, dateStr?: string): string {
  const db = getLocalDb()
  const id = `local_w_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  const loggedAt = dateStr || new Date().toISOString()

  db.runSync(
    `INSERT INTO weight_logs (id, uid, weight, logged_at) VALUES (?, ?, ?, ?);`,
    [id, uid, weight, loggedAt]
  )

  return id
}

export function dbGetWeightHistory(uid: string): WeightLog[] {
  const db = getLocalDb()
  const rows = db.getAllSync<any>(
    `SELECT * FROM weight_logs WHERE uid = ? ORDER BY logged_at ASC;`,
    [uid]
  )

  return rows.map((r) => ({
    id: r.id,
    uid: r.uid,
    weight: r.weight,
    loggedAt: r.logged_at ? new Date(r.logged_at) : (new Date() as any),
  }))
}

// ─── Nutrition Logs ───────────────────────────────────────────────────────────

export function dbSaveNutritionLog(
  uid: string,
  date: string,
  data: Partial<NutritionLog>
): void {
  const db = getLocalDb()
  const id = `${uid}_${date}`
  const existing = dbGetNutritionLog(uid, date)

  const meals = data.meals ?? existing?.meals ?? []
  const totalCalories = data.totalCalories ?? existing?.totalCalories ?? 0
  const totalProtein = data.totalProtein ?? existing?.totalProtein ?? 0
  const waterLitres = data.waterLitres ?? existing?.waterLitres ?? 0
  const updatedAt = new Date().toISOString()

  db.runSync(
    `INSERT INTO nutrition_logs (
      id, uid, date, meals_json, total_calories, total_protein, water_litres, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      meals_json = excluded.meals_json,
      total_calories = excluded.total_calories,
      total_protein = excluded.total_protein,
      water_litres = excluded.water_litres,
      updated_at = excluded.updated_at;`,
    [
      id,
      uid,
      date,
      JSON.stringify(meals),
      totalCalories,
      totalProtein,
      waterLitres,
      updatedAt,
    ]
  )
}

export function dbGetNutritionLog(uid: string, date: string): NutritionLog | null {
  const db = getLocalDb()
  const row = db.getFirstSync<any>(
    `SELECT * FROM nutrition_logs WHERE uid = ? AND date = ? LIMIT 1;`,
    [uid, date]
  )

  if (!row) return null

  return {
    id: row.id,
    uid: row.uid,
    date: row.date,
    meals: JSON.parse(row.meals_json || '[]'),
    totalCalories: row.total_calories,
    totalProtein: row.total_protein,
    waterLitres: row.water_litres,
  }
}

export function dbGetRecentNutritionLogs(uid: string, limitDays = 7): NutritionLog[] {
  const db = getLocalDb()
  const rows = db.getAllSync<any>(
    `SELECT * FROM nutrition_logs WHERE uid = ? ORDER BY date DESC LIMIT ?;`,
    [uid, limitDays]
  )

  return rows.map((r) => ({
    id: r.id,
    uid: r.uid,
    date: r.date,
    meals: JSON.parse(r.meals_json || '[]'),
    totalCalories: r.total_calories,
    totalProtein: r.total_protein,
    waterLitres: r.water_litres,
  }))
}

// ─── Custom Foods ─────────────────────────────────────────────────────────────

export function dbSaveCustomFood(uid: string, food: CustomFood): void {
  const db = getLocalDb()

  db.runSync(
    `INSERT INTO custom_foods (
      id, uid, name, category, calories_per_serving, protein_g, carbs_g, fat_g, serving_description, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      category = excluded.category,
      calories_per_serving = excluded.calories_per_serving,
      protein_g = excluded.protein_g,
      carbs_g = excluded.carbs_g,
      fat_g = excluded.fat_g,
      serving_description = excluded.serving_description,
      created_at = excluded.created_at;`,
    [
      food.id,
      uid,
      food.name,
      food.category || 'General',
      food.caloriesPerServing,
      food.proteinG,
      food.carbsG,
      food.fatG,
      food.servingDescription || '',
      food.createdAt || Date.now(),
    ]
  )
}

export function dbGetCustomFoods(uid: string): CustomFood[] {
  const db = getLocalDb()
  const rows = db.getAllSync<any>(
    `SELECT * FROM custom_foods WHERE uid = ? ORDER BY created_at DESC;`,
    [uid]
  )

  return rows.map((r) => ({
    id: r.id,
    uid: r.uid,
    name: r.name,
    category: r.category,
    caloriesPerServing: r.calories_per_serving,
    proteinG: r.protein_g,
    carbsG: r.carbs_g,
    fatG: r.fat_g,
    servingDescription: r.serving_description,
    createdAt: r.created_at,
  }))
}

export function dbDeleteCustomFood(uid: string, foodId: string): void {
  const db = getLocalDb()
  db.runSync(`DELETE FROM custom_foods WHERE uid = ? AND id = ?;`, [uid, foodId])
}
