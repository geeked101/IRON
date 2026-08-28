/**
 * SessionStatsScreen.tsx
 *
 * Shown after user taps "Complete workout" on DayExerciseListScreen.
 * Computes session stats, detects PRs, saves to Firebase, and
 * marks the queue position as completed.
 *
 * After tapping "Save session" the user is returned to Home
 * with the navigation stack reset so back-button doesn't loop back here.
 */

import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '../store/index'
import { useQueueStore } from '../store/queueStore'
import {
  saveWorkoutSession, updatePR, fetchAllPRs,
  SetLog, ExerciseLog, PR,
} from '../services/firebase'
import { estimateOneRepMax } from '../utils/progressiveOverload'
import { colors, spacing, radius } from '../theme'
import { useScaledFont } from '../hooks/useScaledFont'

/** SessionStatsScreen — final screen of the workout flow. */
export default function SessionStatsScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets()
  const f = useScaledFont()
  const { uid } = useAuthStore()
  const { markSessionCompleted } = useQueueStore()

  const {
    day = 1,
    dayName = 'Workout',
    startTime,
    exercises = [] as { name: string; sets: SetLog[] }[],
  } = route.params ?? {}

  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [newPRs, setNewPRs] = useState<string[]>([])
  const savedRef = useRef(false)

  // ── Compute stats ────────────────────────────────────────────────────────────

  const durationMinutes = startTime
    ? Math.round((Date.now() - new Date(startTime).getTime()) / 60000)
    : 0

  const totalVolume = exercises.reduce((acc: number, ex: { name: string; sets: SetLog[] }) =>
    acc + ex.sets.reduce((a, s) => a + s.weight * s.reps, 0), 0
  )

  const totalSets = exercises.reduce((acc: number, ex: { name: string; sets: SetLog[] }) =>
    acc + ex.sets.length, 0
  )

  const exercisesLogged = exercises.filter((ex: { name: string; sets: SetLog[] }) => ex.sets.length > 0).length

  // ── Detect PRs on mount ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!uid) return
    detectPRs()
  }, [uid])

  /**
   * Compares each exercise's best set against stored PRs.
   * Calls updatePR for any new records found.
   */
  async function detectPRs() {
    if (!uid) return
    try {
      const existingPRs = await fetchAllPRs(uid)
      const prMap: Record<string, PR> = {}
      existingPRs.forEach(pr => { prMap[pr.exerciseName] = pr })

      const detected: string[] = []

      for (const ex of exercises) {
        if (ex.sets.length === 0) continue
        const bestSet = ex.sets.reduce((a: SetLog, b: SetLog) =>
          estimateOneRepMax(b.weight, b.reps) > estimateOneRepMax(a.weight, a.reps) ? b : a
        , ex.sets[0])

        const existing = prMap[ex.name]
        const new1RM = estimateOneRepMax(bestSet.weight, bestSet.reps)
        const old1RM = existing ? estimateOneRepMax(existing.weight, existing.reps) : 0

        if (new1RM > old1RM) {
          await updatePR(uid, ex.name, bestSet.weight, bestSet.reps)
          detected.push(ex.name)
        }
      }

      setNewPRs(detected)
    } catch (err) {
      console.warn('[SessionStats] PR detection error:', err)
    }
  }

  /**
   * Saves the session to Firestore, marks queue position completed,
   * and resets navigation to Home.
   */
  async function handleSave() {
    if (savedRef.current || saving) return
    savedRef.current = true
    setSaving(true)

    try {
      const exerciseLogs: ExerciseLog[] = exercises.map((ex: { name: string; sets: SetLog[] }) => ({
        name: ex.name,
        sets: ex.sets,
      }))

      if (uid) {
        await saveWorkoutSession({
          uid,
          day,
          dayName,
          durationMinutes,
          exercises: exerciseLogs,
          totalVolume,
          prs: newPRs,
          notes,
          loggedAt: null,
        } as any)

        await markSessionCompleted(uid)
      }

      // Reset Workout stack and switch tab back to Home so back button doesn't loop
      navigation.reset({ index: 0, routes: [{ name: 'WorkoutHome' }] })
      navigation.getParent()?.navigate('Home')
    } catch (err) {
      savedRef.current = false
      setSaving(false)
      Alert.alert('Save failed', 'Could not save session. Please try again.')
      console.error('[SessionStats] Save error:', err)
    }
  }

  return (
    <ScrollView
      style={[s.container, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.ph}>
        {/* Header */}
        <Text style={[s.muted, { fontSize: f.label }]}>{dayName} · Complete</Text>
        <Text style={[s.title, { fontSize: f.h1 }]}>Session done. 🦾</Text>

        {/* Duration hero card */}
        <View style={s.heroCard}>
          <Text style={[s.heroLabel, { fontSize: f.label }]}>DURATION</Text>
          <Text style={[s.heroVal, { fontSize: 52 }]}>
            {durationMinutes}<Text style={[s.heroUnit, { fontSize: 18 }]}>min</Text>
          </Text>
        </View>

        {/* Stat grid */}
        <View style={s.grid2}>
          <View style={s.statCard}>
            <Text style={[s.statVal, { fontSize: f.statVal }]}>{exercisesLogged}</Text>
            <Text style={[s.statLab, { fontSize: f.small }]}>exercises</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statVal, { fontSize: f.statVal }]}>{totalSets}</Text>
            <Text style={[s.statLab, { fontSize: f.small }]}>total sets</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statVal, { fontSize: f.statVal }]}>{(totalVolume / 1000).toFixed(1)}</Text>
            <Text style={[s.statLab, { fontSize: f.small }]}>tonnes moved</Text>
          </View>
          <View style={[s.statCard, newPRs.length > 0 && s.statCardGreen]}>
            <Text style={[s.statVal, { fontSize: f.statVal, color: newPRs.length > 0 ? colors.green : colors.titanium }]}>
              {newPRs.length}
            </Text>
            <Text style={[s.statLab, { fontSize: f.small, color: newPRs.length > 0 ? colors.green : colors.textSecondary }]}>
              new PRs
            </Text>
          </View>
        </View>

        {/* New PRs list */}
        {newPRs.length > 0 && (
          <View style={[s.card, { backgroundColor: colors.greenBg, borderColor: colors.greenBorder }]}>
            <Text style={[s.cardLabel, { fontSize: f.label, color: colors.green }]}>NEW PERSONAL RECORDS 🏆</Text>
            {newPRs.map((pr, i) => (
              <Text key={i} style={[s.prRow, { fontSize: f.body }]}>· {pr}</Text>
            ))}
          </View>
        )}

        {/* Exercise breakdown */}
        <View style={s.card}>
          <Text style={[s.cardLabel, { fontSize: f.label }]}>BREAKDOWN</Text>
          {exercises.map((ex: { name: string; sets: SetLog[] }, i: number) => {
            const doneSets = ex.sets.filter(s => s.done)
            const bestSet = ex.sets.length > 0
              ? ex.sets.reduce((a: SetLog, b: SetLog) => b.weight > a.weight ? b : a, ex.sets[0])
              : null
            return (
              <View key={i} style={s.breakRow}>
                <Text style={[s.breakName, { fontSize: f.body }]} numberOfLines={1}>{ex.name}</Text>
                <Text style={[s.breakVal, { fontSize: f.small }]}>
                  {ex.sets.length > 0
                    ? `${ex.sets.length} sets · ${bestSet?.weight ?? 0}kg`
                    : 'skipped'
                  }
                </Text>
              </View>
            )
          })}
        </View>

        {/* Notes */}
        <View style={s.card}>
          <Text style={[s.cardLabel, { fontSize: f.label }]}>SESSION NOTES</Text>
          <TextInput
            style={[s.notesInput, { fontSize: f.body }]}
            placeholder="How did it go? (e.g. felt strong, left knee tight...)"
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={300}
            textAlignVertical="top"
          />
          <Text style={[s.charCount, { fontSize: f.label, color: notes.length > 250 ? colors.amber : colors.textMuted }]}>
            {notes.length} / 300
          </Text>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[s.saveBtn, saving && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={[s.saveBtnText, { fontSize: f.body + 2 }]}>
            {saving ? 'Saving...' : 'Save session'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: insets.bottom + spacing.xxl }} />
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  ph: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  muted: { color: colors.textMuted, marginBottom: 2 },
  title: { fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.md },
  heroCard: { backgroundColor: colors.greenBg, borderWidth: 0.5, borderColor: colors.greenBorder, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.sm },
  heroLabel: { color: colors.green, letterSpacing: 1, marginBottom: spacing.xs },
  heroVal: { fontWeight: '600', color: colors.titanium },
  heroUnit: { color: colors.textMuted, fontWeight: '400' },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: colors.bgDeep, borderRadius: radius.md, padding: spacing.md },
  statCardGreen: { backgroundColor: colors.greenBg, borderWidth: 0.5, borderColor: colors.greenBorder },
  statVal: { fontWeight: '500', color: colors.titanium },
  statLab: { color: colors.textSecondary, marginTop: 3 },
  card: { backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
  cardLabel: { color: colors.textMuted, letterSpacing: 1, marginBottom: spacing.sm },
  prRow: { color: colors.greenText, paddingVertical: 3 },
  breakRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#1a1e28' },
  breakName: { color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  breakVal: { color: colors.titaniumMid },
  notesInput: { color: colors.textPrimary, minHeight: 80, paddingTop: spacing.xs },
  charCount: { textAlign: 'right', marginTop: spacing.xs },
  saveBtn: { backgroundColor: colors.titanium, borderRadius: radius.lg, height: 64, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontWeight: '700', color: colors.bg },
})
