/**
 * HomeScreen.tsx
 *
 * Home tab — three states driven by the sequential queue store:
 *   (a) Ready       — shows current day name + "Start Workout" CTA
 *   (b) Completed   — shows session stats + "Next Day →" button
 *   (c) Rest prompt — bottom-sheet modal after Day 6 is completed
 *
 * All day logic is derived from useQueueStore. No calendar/date-of-week
 * logic is used to determine which workout day is active.
 */

import React, { useEffect, useState, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, Animated, Pressable, TextInput, Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { format } from 'date-fns'
import { useIsFocused } from '@react-navigation/native'
import { colors, spacing, radius, typography } from '../theme'
import { useProfileStore, useNutritionStore, useAuthStore } from '../store/index'
import { useQueueStore } from '../store/queueStore'
import { WORKOUT_SPLIT } from '../data/workoutSplit'
import { fetchRecentSessions, WorkoutSession, logWeight } from '../services/firebase'
import { calculateWorkoutStreak } from '../utils/progressiveOverload'
import { useScaledFont } from '../hooks/useScaledFont'
import ShimmerGlow from '../components/ShimmerGlow'

import SyncBadge from '../components/SyncBadge'

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Displays a single metric stat with optional progress bar. */
function StatCard({ value, label, unit, color, progress }: {
  value: string | number
  label: string
  unit?: string
  color?: string
  progress?: number
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statRow}>
        <Text style={[styles.statVal, color ? { color } : {}]}>
          {value}
          {unit && <Text style={styles.statUnit}>{unit}</Text>}
        </Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      {progress !== undefined && (
        <View style={styles.progressBg}>
          <View style={[styles.progressFg, { width: `${Math.min(progress * 100, 100)}%` as any }]} />
        </View>
      )}
    </View>
  )
}

// ─── Rest-day bottom-sheet modal ──────────────────────────────────────────────

interface RestDayModalProps {
  visible: boolean
  cycleCount: number
  onRestDay: () => void
  onKeepGoing: () => void
}

/**
 * Slide-up bottom-sheet modal that appears after Day 6 is completed.
 * Offers "Yes — Rest Day" (insert Day 7 then cycle) or "No — Keep Going"
 * (advance straight to Day 1, increment cycle).
 */
function RestDayModal({ visible, cycleCount, onRestDay, onKeepGoing }: RestDayModalProps) {
  const slideAnim = useRef(new Animated.Value(300)).current

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 10,
      }).start()
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }).start()
    }
  }, [visible])

  if (!visible) return null

  const nextCycle = cycleCount + 1

  return (
    <Modal transparent animationType="none" visible={visible} statusBarTranslucent>
      <Pressable style={styles.modalOverlay} onPress={onKeepGoing}>
        <Animated.View
          style={[styles.modalSheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Take a rest day?</Text>
          <Text style={styles.modalSub}>
            You've completed 6 training days. Your body might thank you for a recovery session before starting the next cycle.
          </Text>

          <TouchableOpacity
            style={[styles.modalBtn, styles.modalBtnPrimary]}
            onPress={onRestDay}
            activeOpacity={0.8}
          >
            <Text style={styles.modalBtnPrimaryText}>Yes — Rest Day</Text>
            <Text style={styles.modalBtnSub}>Queue Day 7, then start Cycle {nextCycle}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modalBtn, styles.modalBtnSecondary]}
            onPress={onKeepGoing}
            activeOpacity={0.8}
          >
            <Text style={styles.modalBtnSecondaryText}>No — Keep Going</Text>
            <Text style={[styles.modalBtnSub, { color: colors.titaniumMid }]}>Skip to Day 1, Cycle {nextCycle}</Text>
          </TouchableOpacity>
        </Animated.View>
      </Pressable>
    </Modal>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

/** HomeScreen — entry point for daily workout flow. */
export default function HomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets()
  const isFocused = useIsFocused()
  const f = useScaledFont()

  const { uid } = useAuthStore()
  const { profile, setProfile, saveProfile } = useProfileStore()
  const { totalCalories, targetCalories, totalProtein, targetProtein, waterLitres, targetWater, load } = useNutritionStore()

  const {
    currentDay, sessionCompleted, cycleCount, pendingRestPrompt,
    advanceDay, clearRestPrompt,
  } = useQueueStore()

  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [showRestModal, setShowRestModal] = useState(false)
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [weightInput, setWeightInput] = useState('')

  // Show the rest-day modal when the store flags it
  useEffect(() => {
    if (pendingRestPrompt && sessionCompleted) {
      setShowRestModal(true)
    }
  }, [pendingRestPrompt, sessionCompleted])

  useEffect(() => {
    if (isFocused) {
      load()
      if (uid) {
        fetchRecentSessions(uid).then(setSessions)
      }
    }
  }, [isFocused, uid])

  /** Save a new body weight log entry. */
  async function handleLogWeight() {
    const val = parseFloat(weightInput)
    if (isNaN(val) || val < 20 || val > 300) {
      Alert.alert('Invalid weight', 'Please enter a weight between 20 and 300 kg.')
      return
    }
    if (uid) {
      await logWeight(uid, val)
      setProfile({ weight: val })
      await saveProfile()
    }
    setWeightInput('')
    setShowWeightModal(false)
  }

  const todayWorkout = WORKOUT_SPLIT.find(d => d.day === currentDay) ?? WORKOUT_SPLIT[0]
  const streakCount = calculateWorkoutStreak(sessions)
  const isRestDay = currentDay === 7

  // ── Rest-day modal handlers ─────────────────────────────────────────────────

  /**
   * User chose to take a rest day.
   * Queues Day 7 (recovery) as the current day, then on next advance → Day 1 / new cycle.
   */
  async function handleRestDay() {
    setShowRestModal(false)
    await clearRestPrompt(uid)
    // Advance to Day 7 (rest); cycleCount increments on the NEXT advance (Day 7 → Day 1)
    await advanceDay(7, uid)
  }

  /**
   * User chose to skip the rest day.
   * Goes straight to Day 1 of the next cycle.
   */
  async function handleKeepGoing() {
    setShowRestModal(false)
    await clearRestPrompt(uid)
    // Advance from Day 6 → Day 1 (crossesCycleBoundary = true → cycleCount++)
    await advanceDay(1, uid)
  }

  // ── "Next Day →" handler ────────────────────────────────────────────────────

  /**
   * Triggered by the "Next Day →" button on the Completed state.
   * If Day 6 was just completed, shows the rest-day modal instead of advancing immediately.
   */
  async function handleNextDay() {
    if (pendingRestPrompt) {
      setShowRestModal(true)
      return
    }
    await advanceDay(undefined, uid)
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            {/* Cycle + Day sub-header + Streak */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={[styles.cycleLabel, { fontSize: f.label }]}>
                Cycle {cycleCount} · Day {currentDay}
              </Text>
              <View style={styles.headerStreakBadge}>
                <Text style={styles.headerStreakText}>🔥 {streakCount} Streak</Text>
              </View>
            </View>
            <Text style={[styles.greeting, { fontSize: f.h2 }]}>
              {isRestDay ? 'Recovery day.' : `${todayWorkout.name} day.`}
            </Text>
          </View>
          <View style={styles.weightBox}>
            <Text style={[styles.weightVal, { fontSize: f.bigNum }]}>
              {profile?.weight ?? 54}<Text style={[styles.weightUnit, { fontSize: f.small }]}>kg</Text>
            </Text>
            <Text style={[styles.weightLabel, { fontSize: f.label }]}>body weight</Text>
          </View>
        </View>

        {/* Momentum & Forgiving Consistency Banner */}
        <View style={styles.momentumBanner}>
          <Text style={styles.momentumText}>
            ⚡ {streakCount > 0 ? `${streakCount}-workout momentum! Keep pushing.` : "You're on track. Ready when you are."}
          </Text>
        </View>

        <View style={{ paddingHorizontal: spacing.lg }}>
          <SyncBadge />
        </View>

        {/* Calorie card */}
        <View style={styles.calorieCard}>
          <View style={styles.calorieRow}>
            <View>
              <Text style={[styles.calorieLabel, { fontSize: f.label }]}>Calories</Text>
              <Text style={[styles.calorieVal, { fontSize: f.h2 }]}>
                {totalCalories}
                <Text style={[styles.calorieTarget, { fontSize: f.small }]}> / {targetCalories}</Text>
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.remainLabel, { fontSize: f.label }]}>remaining</Text>
              <Text style={[styles.remainVal, { fontSize: f.h3 }]}>{Math.max(0, targetCalories - totalCalories)}</Text>
            </View>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFg, {
              width: `${Math.min((totalCalories / targetCalories) * 100, 100)}%` as any,
              backgroundColor: colors.green,
            }]} />
          </View>
        </View>

        {/* Macro grid */}
        <View style={styles.grid2}>
          <StatCard
            value={totalProtein}
            unit="g"
            label={`protein / ${targetProtein}g`}
            progress={totalProtein / targetProtein}
          />
          <StatCard
            value={waterLitres.toFixed(1)}
            unit="L"
            label={`water / ${targetWater}L`}
            color={colors.blue}
            progress={waterLitres / targetWater}
          />
        </View>

        {/* Streak */}
        <View style={styles.streakCard}>
          <Text style={[styles.statVal, { color: colors.green, fontSize: f.statVal + 6 }]}>
            {streakCount}<Text style={[{ fontSize: f.small, color: colors.textMuted }]}> days</Text>
          </Text>
          <Text style={[styles.statLabel, { fontSize: f.label }]}>current streak</Text>
          <View style={styles.streakDots}>
            {Array.from({ length: 7 }).map((_, i) => (
              <View key={i} style={[styles.dot, i < Math.min(streakCount, 7) && styles.dotFilled]} />
            ))}
          </View>
        </View>

        {/* ── STATE (b): Session completed — show stats + Next Day button ─── */}
        {sessionCompleted && (
          <View style={styles.completedCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Text style={[styles.completedLabel, { fontSize: f.label, color: colors.green }]}>WORKOUT COMPLETE 💥</Text>
            </View>
            <Text style={[styles.completedDay, { fontSize: f.h3 }]}>
              {todayWorkout.name} · Day {currentDay} crushed ✓
            </Text>
            <TouchableOpacity
              style={styles.nextDayBtn}
              onPress={handleNextDay}
              activeOpacity={0.85}
            >
              <Text style={[styles.nextDayBtnText, { fontSize: f.body + 1 }]}>
                {pendingRestPrompt ? 'Take Recovery Rest Day →' : `Unlock Day ${currentDay < 6 ? currentDay + 1 : 1} →`}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STATE (a): Ready — show Start Workout button ─── */}
        {!sessionCompleted && !isRestDay && (
          <TouchableOpacity
            style={[styles.startBtn, { overflow: 'hidden' }]}
            onPress={() => navigation.navigate('Workout', {
              screen: 'DayExerciseList',
              params: { day: currentDay },
            })}
            activeOpacity={0.85}
          >
            <ShimmerGlow />
            <Text style={[styles.startBtnText, { fontSize: f.body + 1 }]}>
              Start {todayWorkout.name} workout
            </Text>
          </TouchableOpacity>
        )}

        {/* ── STATE (a): Ready — rest day variant ─── */}
        {!sessionCompleted && isRestDay && (
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: colors.bgInset, borderWidth: 0.5, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Workout', { screen: 'Recovery' })}
            activeOpacity={0.85}
          >
            <Text style={[styles.startBtnText, { fontSize: f.body + 1, color: colors.titaniumMid }]}>
              View recovery routine
            </Text>
          </TouchableOpacity>
        )}

        {/* This week split overview */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.lg, fontSize: f.label }]}>
          THIS CYCLE — DAYS
        </Text>
        {WORKOUT_SPLIT.map(day => (
          <TouchableOpacity
            key={day.day}
            style={[
              styles.dayCard,
              day.day === currentDay && styles.dayCardToday,
            ]}
            onPress={() => navigation.navigate('Workout', {
              screen: 'DayExerciseList',
              params: { day: day.day },
            })}
            activeOpacity={0.7}
          >
            <Text style={[styles.dayNum, { fontSize: f.label }]}>D{day.day}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.dayName, { fontSize: f.dayName - 1 }]}>{day.name}</Text>
              <Text style={[styles.dayFocus, { fontSize: f.small }]}>{day.focus}</Text>
            </View>
            {day.day === currentDay && (
              <View style={styles.todayBadge}>
                <Text style={[styles.todayBadgeText, { fontSize: f.label }]}>Today</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Rest-day bottom-sheet */}
      <RestDayModal
        visible={showRestModal}
        cycleCount={cycleCount}
        onRestDay={handleRestDay}
        onKeepGoing={handleKeepGoing}
      />
    </>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: spacing.md, paddingBottom: spacing.md },

  cycleLabel: { color: colors.textMuted, letterSpacing: 1, marginBottom: 3 },
  headerStreakBadge: { backgroundColor: colors.greenBg, borderWidth: 0.5, borderColor: colors.greenBorder, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  headerStreakText: { fontSize: 10, color: colors.green, fontWeight: '700' },
  momentumBanner: { backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md },
  momentumText: { fontSize: 12, color: colors.titaniumMid, fontWeight: '500' },
  greeting: { fontWeight: '500', color: colors.textPrimary },

  weightBox: { alignItems: 'flex-end' },
  weightVal: { fontWeight: '500', color: colors.textPrimary },
  weightUnit: { color: colors.textMuted },
  weightLabel: { color: colors.textSecondary },

  calorieCard: { backgroundColor: colors.greenBg, borderWidth: 0.5, borderColor: colors.greenBorder, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm },
  calorieRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  calorieLabel: { color: colors.green, letterSpacing: 1, marginBottom: 3 },
  calorieVal: { fontWeight: '500', color: colors.titanium },
  calorieTarget: { color: colors.textMuted },
  remainLabel: { color: colors.textSecondary, marginBottom: 3 },
  remainVal: { fontWeight: '500', color: colors.green },

  progressBg: { height: 5, backgroundColor: '#0f1117', borderRadius: 3, marginTop: 4 },
  progressFg: { height: 5, backgroundColor: colors.titaniumMid, borderRadius: 3 },

  grid2: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  statCard: { flex: 1, backgroundColor: colors.bgDeep, borderRadius: radius.md, padding: spacing.md },
  statRow: { flexDirection: 'row', alignItems: 'baseline' },
  statVal: { fontSize: 22, fontWeight: '500', color: colors.titanium },
  statUnit: { fontSize: 13, color: colors.textMuted },
  statLabel: { color: colors.textSecondary, marginTop: 2 },

  streakCard: { backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm },
  streakDots: { flexDirection: 'row', gap: 6, marginTop: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#222' },
  dotFilled: { backgroundColor: colors.green },

  // State (b) — completed card
  completedCard: { backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.titaniumFaint, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm },
  completedLabel: { color: colors.titaniumMid, letterSpacing: 1, marginBottom: spacing.xs },
  completedDay: { fontWeight: '500', color: colors.textPrimary, marginBottom: spacing.md },
  nextDayBtn: { backgroundColor: colors.titanium, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  nextDayBtnText: { fontWeight: '600', color: colors.bg },

  // State (a) — start button
  startBtn: { backgroundColor: colors.titanium, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.sm },
  startBtnText: { fontWeight: '500', color: colors.bg },

  sectionLabel: { color: colors.textMuted, letterSpacing: 1, marginBottom: spacing.sm },
  dayCard: { backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: 6 },
  dayCardToday: { borderColor: colors.titaniumMid },
  dayNum: { color: colors.textMuted, width: 24 },
  dayName: { fontWeight: '500', color: colors.textPrimary },
  dayFocus: { color: colors.textSecondary, marginTop: 1 },
  todayBadge: { backgroundColor: colors.titanium, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  todayBadgeText: { fontWeight: '500', color: colors.bg },

  // Rest-day modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.bgInset, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: 20, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm },
  modalSub: { fontSize: 13, color: colors.textMuted, lineHeight: 20, marginBottom: spacing.lg },
  modalBtn: { borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm },
  modalBtnPrimary: { backgroundColor: colors.titanium },
  modalBtnPrimaryText: { fontSize: 16, fontWeight: '600', color: colors.bg, marginBottom: 3 },
  modalBtnSecondary: { backgroundColor: colors.bgDeep, borderWidth: 0.5, borderColor: colors.border },
  modalBtnSecondaryText: { fontSize: 16, fontWeight: '500', color: colors.titanium, marginBottom: 3 },
  modalBtnSub: { fontSize: 11, color: colors.bg, opacity: 0.7 },
})
