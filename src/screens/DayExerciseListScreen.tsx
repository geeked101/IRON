/**
 * DayExerciseListScreen.tsx
 *
 * Entry point for a workout session. Shows all exercises for the selected day
 * as a list. User taps each exercise to log sets, returns here automatically
 * after tapping "Done with exercise", then taps "Complete workout" when finished.
 *
 * Flow:
 *   Home/WorkoutScreen → DayExerciseListScreen → SingleExerciseScreen
 *                      ← (returns with updatedExercise param)
 *   → SessionStatsScreen when "Complete workout" tapped
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Platform, Alert, Animated,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '../store/index'
import { fetchRecentSessions, WorkoutSession, SetLog } from '../services/firebase'
import { WORKOUT_SPLIT, WorkoutDay, Exercise } from '../data/workoutSplit'
import { useSplitStore } from '../store/splitStore'
import { colors, spacing, radius } from '../theme'
import { useScaledFont } from '../hooks/useScaledFont'

// ─── Types ─────────────────────────────────────────────────────────────────────

/** One exercise entry in the session list. */
export interface SessionExercise {
  name: string
  targetSets: number
  targetReps: string
  restSeconds: number
  primaryMuscles: string[]
  formCues: string[]
  isCustom?: boolean
}

// ─── Add Exercise Modal (Android-safe) ─────────────────────────────────────────

interface AddExerciseModalProps {
  visible: boolean
  onAdd: (name: string) => void
  onClose: () => void
}

/**
 * Cross-platform modal for adding a custom exercise to the current session.
 * Uses Alert.prompt on iOS and a custom Modal+TextInput on Android
 * (Alert.prompt is not available on Android).
 */
function AddExerciseModal({ visible, onAdd, onClose }: AddExerciseModalProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  function handleSave() {
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setError('Exercise name must be at least 2 characters.')
      return
    }
    onAdd(trimmed)
    setName('')
    setError('')
    onClose()
  }

  if (!visible) return null

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={ae.overlay}>
        <View style={ae.sheet}>
          <Text style={ae.title}>Add exercise</Text>
          <Text style={ae.sub}>Added to this session only — not saved to the split.</Text>
          <TextInput
            style={[ae.input, error ? ae.inputError : {}]}
            placeholder="e.g. Hack Squat"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={(t) => { setName(t); setError('') }}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
          {error ? <Text style={ae.error}>{error}</Text> : null}
          <TouchableOpacity style={ae.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Text style={ae.saveBtnText}>Add to session</Text>
          </TouchableOpacity>
          <TouchableOpacity style={ae.cancelBtn} onPress={onClose}>
            <Text style={ae.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const ae = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: spacing.lg },
  sheet: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.xl, borderWidth: 0.5, borderColor: colors.border },
  title: { fontSize: 18, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  sub: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md },
  input: { backgroundColor: colors.bgDeep, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 16, color: colors.textPrimary, minHeight: 52 },
  inputError: { borderColor: colors.red },
  error: { fontSize: 12, color: colors.red, marginTop: 6 },
  saveBtn: { backgroundColor: colors.titanium, borderRadius: radius.md, height: 56, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: colors.bg },
  cancelBtn: { height: 48, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  cancelText: { fontSize: 14, color: colors.textMuted },
})

// ─── Exercise Card ──────────────────────────────────────────────────────────────

interface ExerciseCardProps {
  exercise: SessionExercise
  isDone: boolean
  lastWeight: string
  onPress: () => void
  onSwap?: () => void
}

/**
 * Renders a single exercise row with name, target, last-session hint,
 * 1-tap Swap control, and a green checkmark/border when completed.
 */
function ExerciseCard({ exercise, isDone, lastWeight, onPress, onSwap }: ExerciseCardProps) {
  const f = useScaledFont()
  return (
    <TouchableOpacity
      style={[ec.card, isDone && ec.cardDone]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {isDone && <View style={ec.doneBorder} />}
      <View style={{ flex: 1, paddingLeft: isDone ? spacing.sm : 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[ec.name, { fontSize: f.body + 1 }]}>{exercise.name}</Text>
          {exercise.isCustom && (
            <View style={ec.customBadge}>
              <Text style={ec.customBadgeText}>custom</Text>
            </View>
          )}
        </View>
        <Text style={[ec.target, { fontSize: f.small }]}>
          {exercise.targetSets} sets × {exercise.targetReps} reps
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {onSwap && !isDone && (
            <TouchableOpacity
              style={ec.swapBtn}
              onPress={(e) => {
                e.stopPropagation()
                onSwap()
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={ec.swapBtnText}>Swap 🔄</Text>
            </TouchableOpacity>
          )}
          {isDone ? (
            <View style={ec.checkCircle}>
              <Text style={ec.checkMark}>✓</Text>
            </View>
          ) : (
            <View style={ec.arrowCircle}>
              <Text style={ec.arrow}>›</Text>
            </View>
          )}
        </View>
        {lastWeight !== '—' && (
          <Text style={[ec.lastWeight, { fontSize: f.small }]}>Last: {lastWeight}</Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

const ec = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.md, marginBottom: 8, minHeight: 72,
  },
  cardDone: { borderColor: colors.greenBorder, backgroundColor: '#111d10' },
  doneBorder: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: colors.green, borderTopLeftRadius: radius.lg, borderBottomLeftRadius: radius.lg },
  name: { fontWeight: '600', color: colors.textPrimary },
  target: { color: colors.textMuted, marginTop: 3 },
  lastWeight: { color: colors.amber, fontWeight: '500' },
  customBadge: { backgroundColor: colors.bgInset, borderWidth: 0.5, borderColor: colors.titaniumFaint, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  customBadgeText: { fontSize: 9, color: colors.titaniumMid, letterSpacing: 0.5 },
  checkCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.greenBg, borderWidth: 1, borderColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  checkMark: { fontSize: 14, color: colors.green, fontWeight: '700' },
  arrowCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bgInset, alignItems: 'center', justifyContent: 'center' },
  arrow: { fontSize: 18, color: colors.titaniumMid, lineHeight: 22 },
  swapBtn: { backgroundColor: colors.bgDeep, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  swapBtnText: { fontSize: 11, color: colors.titaniumMid, fontWeight: '600' },
})

// ─── Main Screen ────────────────────────────────────────────────────────────────

/** DayExerciseListScreen — the session hub screen. */
export default function DayExerciseListScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets()
  const f = useScaledFont()
  const { uid } = useAuthStore()
  const { day = 1 } = route.params ?? {}
  const { split } = useSplitStore()

  const workoutDay = split.find((d: WorkoutDay) => d.day === day) ?? WORKOUT_SPLIT.find((d: WorkoutDay) => d.day === day) ?? WORKOUT_SPLIT[0]

  // ── Session state ──────────────────────────────────────────────────────────
  const [exercises, setExercises] = useState<SessionExercise[]>(
    workoutDay.exercises.map((e: Exercise) => ({ ...e }))
  )
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set())
  const [sessionSets, setSessionSets] = useState<Record<string, SetLog[]>>({})
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const sessionStartTime = useRef(new Date())
  const progressAnim = useRef(new Animated.Value(0)).current

  // ── Fetch recent sessions for last-weight hints ────────────────────────────
  useEffect(() => {
    if (uid) {
      fetchRecentSessions(uid, 5).then(setRecentSessions)
    }
  }, [uid])

  // ── Animate progress bar ───────────────────────────────────────────────────
  useEffect(() => {
    const pct = exercises.length > 0 ? completedExercises.size / exercises.length : 0
    Animated.timing(progressAnim, {
      toValue: pct,
      duration: 350,
      useNativeDriver: false,
    }).start()
  }, [completedExercises.size, exercises.length])

  // ── Receive returning data from SingleExerciseScreen ──────────────────────
  useEffect(() => {
    const updated = route.params?.updatedExercise as { name: string; sets: SetLog[] } | undefined
    if (!updated) return

    // Merge sets into sessionSets
    setSessionSets(prev => ({ ...prev, [updated.name]: updated.sets }))

    // Mark exercise as done if at least one set was logged
    if (updated.sets.length > 0) {
      setCompletedExercises(prev => {
        const next = new Set(prev)
        next.add(updated.name)
        return next
      })
    }

    // Clear param so this effect doesn't re-fire
    navigation.setParams({ updatedExercise: undefined })
  }, [route.params?.updatedExercise])

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Finds the last logged weight for an exercise from recent sessions.
   * Returns formatted string e.g. "80kg" or "—" if no history.
   */
  function getLastWeight(exerciseName: string): string {
    for (const session of recentSessions) {
      const ex = session.exercises?.find(e => e.name === exerciseName)
      if (ex && ex.sets.length > 0) {
        const lastSet = ex.sets[ex.sets.length - 1]
        return `${lastSet.weight}kg`
      }
    }
    return '—'
  }

  /**
   * Cycles through available exercise variants (original, homeVariant, swapOptions).
   */
  function handleSwapExercise(index: number) {
    const targetEx = workoutDay.exercises[index]
    if (!targetEx) return
    const options = [
      targetEx.name,
      ...(targetEx.homeVariant ? [targetEx.homeVariant] : []),
      ...(targetEx.swapOptions ?? []),
    ]
    if (options.length <= 1) return

    setExercises(prev => prev.map((ex, i) => {
      if (i !== index) return ex
      const curIdx = options.indexOf(ex.name)
      const nextIdx = (curIdx + 1) % options.length
      return { ...ex, name: options[nextIdx] }
    }))
  }

  /**
   * Adds a custom exercise to the current session list.
   * @param name - the exercise name entered by the user
   */
  function handleAddExercise(name: string) {
    const newEx: SessionExercise = {
      name,
      targetSets: 3,
      targetReps: '10',
      restSeconds: 60,
      primaryMuscles: [],
      formCues: [],
      isCustom: true,
    }
    setExercises(prev => [...prev, newEx])
  }

  /**
   * Navigate to SingleExerciseScreen for the tapped exercise.
   * Passes existing sets so the user can continue where they left off.
   */
  function handleExercisePress(exercise: SessionExercise) {
    navigation.navigate('SingleExercise', {
      day,
      exerciseName: exercise.name,
      targetSets: exercise.targetSets,
      targetReps: exercise.targetReps,
      restSeconds: exercise.restSeconds,
      primaryMuscles: exercise.primaryMuscles,
      formCues: exercise.formCues,
      initialSets: sessionSets[exercise.name] ?? [],
    })
  }

  /** Navigate to stats screen with full session data. */
  function handleComplete() {
    navigation.navigate('SessionStats', {
      day,
      dayName: workoutDay.name,
      startTime: sessionStartTime.current.toISOString(),
      exercises: exercises.map(ex => ({
        name: ex.name,
        sets: sessionSets[ex.name] ?? [],
      })),
    })
  }

  const doneCount = completedExercises.size
  const totalCount = exercises.length
  const allDone = doneCount === totalCount && totalCount > 0

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.dayTitle, { fontSize: f.h2 }]}>
            Day {day} · {workoutDay.name}
          </Text>
          <Text style={[s.dayFocus, { fontSize: f.small }]}>{workoutDay.focus}</Text>
        </View>
        <Text style={[s.progressFraction, { fontSize: f.small }]}>
          {doneCount} / {totalCount}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={s.progressBg}>
        <Animated.View style={[s.progressFg, {
          width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
        }]} />
      </View>

      {/* Exercise list */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.sectionLabel, { fontSize: f.label }]}>EXERCISES</Text>

        {exercises.map((ex, idx) => (
          <ExerciseCard
            key={ex.name}
            exercise={ex}
            isDone={completedExercises.has(ex.name)}
            lastWeight={getLastWeight(ex.name)}
            onPress={() => handleExercisePress(ex)}
            onSwap={() => handleSwapExercise(idx)}
          />
        ))}

        {/* Add exercise row */}
        <TouchableOpacity
          style={s.addRow}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.7}
        >
          <View style={s.addIcon}>
            <Text style={s.addIconText}>+</Text>
          </View>
          <Text style={[s.addText, { fontSize: f.body }]}>Add exercise to today</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky complete button */}
      <View style={[s.stickyBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        {!allDone && doneCount > 0 && (
          <Text style={[s.partialNote, { fontSize: f.small }]}>
            {totalCount - doneCount} exercise{totalCount - doneCount !== 1 ? 's' : ''} remaining — you can still complete
          </Text>
        )}
        <TouchableOpacity
          style={[s.completeBtn, doneCount === 0 && s.completeBtnDisabled]}
          onPress={handleComplete}
          disabled={doneCount === 0}
          activeOpacity={0.85}
        >
          <Text style={[s.completeBtnText, { fontSize: f.body + 2 }]}>
            {allDone ? 'Complete workout ✓' : 'Complete workout'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add exercise modal */}
      <AddExerciseModal
        visible={showAddModal}
        onAdd={handleAddExercise}
        onClose={() => setShowAddModal(false)}
      />
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { paddingVertical: spacing.sm, paddingRight: spacing.sm },
  backText: { fontSize: 14, color: colors.titaniumMid },
  dayTitle: { fontWeight: '600', color: colors.textPrimary },
  dayFocus: { color: colors.textMuted, marginTop: 2 },
  progressFraction: { color: colors.titaniumMid, fontWeight: '500' },
  progressBg: { height: 3, backgroundColor: colors.bgInset, marginHorizontal: spacing.lg, borderRadius: 2, marginBottom: spacing.md },
  progressFg: { height: 3, backgroundColor: colors.titanium, borderRadius: 2 },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  sectionLabel: { color: colors.textMuted, letterSpacing: 1.2, marginBottom: spacing.sm },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 0.5, borderColor: colors.border, borderStyle: 'dashed', borderRadius: radius.lg, padding: spacing.md, minHeight: 56, marginTop: spacing.xs },
  addIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgInset, alignItems: 'center', justifyContent: 'center' },
  addIconText: { fontSize: 20, color: colors.titaniumMid, lineHeight: 24 },
  addText: { color: colors.textMuted },
  stickyBar: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.bg, borderTopWidth: 0.5, borderTopColor: colors.border },
  partialNote: { color: colors.textMuted, textAlign: 'center', marginBottom: spacing.sm },
  completeBtn: { backgroundColor: colors.titanium, borderRadius: radius.lg, height: 64, alignItems: 'center', justifyContent: 'center' },
  completeBtnDisabled: { opacity: 0.35 },
  completeBtnText: { fontWeight: '700', color: colors.bg, letterSpacing: 0.3 },
})
