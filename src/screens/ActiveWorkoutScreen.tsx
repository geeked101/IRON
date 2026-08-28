import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { colors, spacing, radius, typography } from '../theme'
import { useWorkoutStore, useAuthStore } from '../store/index'
import { useQueueStore } from '../store/queueStore'
import { saveWorkoutSession, updatePR, fetchRecentSessions, fetchAllPRs, WorkoutSession } from '../services/firebase'
import { WORKOUT_SPLIT } from '../data/workoutSplit'
import { suggestProgression, estimateOneRepMax } from '../utils/progressiveOverload'
import BreathingRestTimer from '../components/BreathingRestTimer'

// ─── Rest Timer ───────────────────────────────────────────────────────────────

function RestTimer({ seconds, onSkip }: { seconds: number; onSkip: () => void }) {
  const [remaining, setRemaining] = useState(seconds)
  const [max] = useState(seconds)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current!)
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current!)
  }, [])

  const pct = remaining / max
  const color = pct > 0.5 ? colors.titaniumMid : pct > 0.25 ? colors.amber : colors.red
  const circumference = 2 * Math.PI * 52

  return (
    <View style={rt.wrap}>
      <View style={rt.ringWrap}>
        {/* SVG-like circle using border */}
        <View style={[rt.ringOuter, { borderColor: colors.bgInset }]}>
          <View style={rt.ringInner}>
            <Text style={[rt.timeText, { color }]}>{remaining}</Text>
            <Text style={rt.timeSub}>sec</Text>
          </View>
        </View>
        {/* Progress indicator strip */}
        <View style={[rt.progressArc, {
          width: `${pct * 100}%` as any,
          backgroundColor: color,
        }]} />
      </View>
      <TouchableOpacity style={rt.skipBtn} onPress={onSkip}>
        <Text style={rt.skipText}>Skip rest</Text>
      </TouchableOpacity>
    </View>
  )
}

const rt = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.xl },
  ringWrap: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  ringOuter: { width: 130, height: 130, borderRadius: 65, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  ringInner: { alignItems: 'center' },
  timeText: { fontSize: 40, fontWeight: '500' },
  timeSub: { fontSize: 12, color: colors.textMuted, marginTop: -4 },
  progressArc: { height: 4, borderRadius: 2, position: 'absolute', bottom: 0, left: 0 },
  skipBtn: { backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  skipText: { fontSize: 14, color: colors.titaniumMid },
})

// ─── Set Row ──────────────────────────────────────────────────────────────────

function SetRow({ index, weight, reps, done, onToggle }: {
  index: number; weight: number; reps: number; done: boolean; onToggle: () => void
}) {
  return (
    <View style={sr.row}>
      <Text style={sr.num}>{index + 1}</Text>
      <Text style={sr.cell}>{weight}kg</Text>
      <Text style={sr.cell}>{reps}</Text>
      <Text style={sr.cell}>{weight * reps}</Text>
      <TouchableOpacity style={[sr.check, done && sr.checkDone]} onPress={onToggle}>
        {done && <Text style={sr.checkMark}>✓</Text>}
      </TouchableOpacity>
    </View>
  )
}

const sr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#1a1e28' },
  num: { width: 28, fontSize: 12, color: colors.textMuted },
  cell: { flex: 1, textAlign: 'center', fontSize: 14, color: colors.titanium },
  check: { width: 32, height: 32, borderRadius: 8, borderWidth: 0.5, borderColor: colors.border, backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: colors.greenBg, borderColor: colors.greenBorder },
  checkMark: { fontSize: 14, color: colors.green },
})

// ─── Main Screen ─────────────────────────────────────────────────────────────

type Tab = 'sets' | 'history' | 'info'
type Phase = 'tracking' | 'resting' | 'done'

export default function ActiveWorkoutScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets()
  const { day = 1 } = route?.params ?? {}
  const workout = WORKOUT_SPLIT.find(d => d.day === day) ?? WORKOUT_SPLIT[0]

  const {
    exercises, activeExerciseIndex, sessionStartTime,
    startSession, logSet, toggleSet, nextExercise, finishSession, resetSession
  } = useWorkoutStore()
  const { uid } = useAuthStore()
  const { markSessionCompleted } = useQueueStore()

  const [tab, setTab] = useState<Tab>('sets')
  const [phase, setPhase] = useState<Phase>('tracking')
  const [curWeight, setCurWeight] = useState(60)
  const [curReps, setCurReps] = useState(10)
  const [elapsed, setElapsed] = useState(0)
  const [sessions, setSessions] = useState<WorkoutSession[]>([])

  const activeEx = exercises[activeExerciseIndex]
  const workoutEx = workout.exercises[activeExerciseIndex]

  const targetRepsNum = parseInt(workoutEx?.targetReps ?? '10', 10) || 10
  const suggestion = activeEx
    ? suggestProgression(activeEx.name, sessions, targetRepsNum)
    : null

  // Fetch recent sessions for progression recommendations
  useEffect(() => {
    if (uid) {
      fetchRecentSessions(uid).then(setSessions)
    }
  }, [uid])

  // Init session
  useEffect(() => {
    startSession(day, workout.name, workout.exercises.map(e => e.name))
  }, [])

  // Elapsed timer
  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const elapsedStr = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`

  function handleLogSet() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    logSet(activeExerciseIndex, curWeight, curReps)
  }

  function handleToggleSet(i: number) {
    toggleSet(activeExerciseIndex, i)
  }

  function handleRestDone() {
    setPhase('tracking')
    setTab('sets')
  }

  function handleNextExercise() {
    if (activeExerciseIndex >= exercises.length - 1) {
      handleFinish()
    } else {
      setPhase('resting')
      nextExercise()
    }
  }

  async function handleFinish() {
    const exerciseLogs = finishSession()
    const duration = Math.round(elapsed / 60)
    const totalVolume = exerciseLogs.reduce((acc, ex) =>
      acc + ex.sets.reduce((a, s) => a + s.weight * s.reps, 0), 0
    )
    const prsHit: string[] = []

    if (uid) {
      // Check for PRs
      const allPRs = await fetchAllPRs(uid)
      const prMap = new Map(allPRs.map(pr => [pr.exerciseName, pr]))

      for (const ex of exerciseLogs) {
        const completedSets = ex.sets.filter(s => s.done)
        if (completedSets.length > 0) {
          // Sort descending by weight then by reps
          const bestSet = completedSets.sort((a, b) => {
            if (b.weight !== a.weight) return b.weight - a.weight
            return b.reps - a.reps
          })[0]

          const currentPR = prMap.get(ex.name)
          if (!currentPR || bestSet.weight > currentPR.weight || (bestSet.weight === currentPR.weight && bestSet.reps > currentPR.reps)) {
            prsHit.push(ex.name)
            await updatePR(uid, ex.name, bestSet.weight, bestSet.reps)
          }
        }
      }

      await saveWorkoutSession({
        uid,
        day,
        dayName: workout.name,
        durationMinutes: duration,
        exercises: exerciseLogs,
        totalVolume,
        prs: prsHit,
        notes: '',
        loggedAt: null,
      })
      // Mark the queue session as completed so HomeScreen advances to state (b)
      await markSessionCompleted(uid)
    }
    setPhase('done')
  }

  // ── Session Done ──
  if (phase === 'done') {
    const duration = Math.round(elapsed / 60)
    const totalVol = exercises.reduce((acc, ex) =>
      acc + ex.sets.reduce((a, s) => a + s.weight * s.reps, 0), 0
    )

    const firstExerciseName = workout.exercises[0]?.name ?? 'Bench Press'
    const targetRepsNum = parseInt(workout.exercises[0]?.targetReps ?? '10', 10) || 10
    const firstExerciseSuggestion = suggestProgression(
      firstExerciseName,
      [
        {
          uid: uid ?? '',
          day,
          dayName: workout.name,
          durationMinutes: duration,
          exercises: exercises.map(e => ({ name: e.name, sets: e.sets })),
          totalVolume: totalVol,
          prs: [],
          notes: '',
          loggedAt: null
        },
        ...sessions
      ],
      targetRepsNum
    )

    return (
      <ScrollView style={[s.container, { paddingTop: insets.top }]}>
        <View style={s.ph}>
          <Text style={s.dateText}>{workout.name} · Complete</Text>
          <Text style={s.bigTitle}>Session done.</Text>

          <View style={[s.card, { backgroundColor: colors.greenBg, borderColor: colors.greenBorder, alignItems: 'center', marginBottom: spacing.sm }]}>
            <Text style={[s.label, { color: colors.green }]}>DURATION</Text>
            <Text style={[s.bigNum, { fontSize: 48 }]}>{duration}<Text style={{ fontSize: 18, color: colors.textMuted }}>min</Text></Text>
          </View>

          <View style={s.grid2}>
            <View style={s.statCard}><Text style={s.statVal}>{exercises.length}</Text><Text style={s.statLab}>exercises</Text></View>
            <View style={s.statCard}><Text style={s.statVal}>{exercises.reduce((a, e) => a + e.sets.length, 0)}</Text><Text style={s.statLab}>total sets</Text></View>
            <View style={s.statCard}><Text style={s.statVal}>{(totalVol / 1000).toFixed(1)}</Text><Text style={s.statLab}>tonnes moved</Text></View>
            <View style={[
              s.statCard,
              firstExerciseSuggestion?.type === 'increase' && { backgroundColor: colors.greenBg, borderColor: colors.greenBorder },
              firstExerciseSuggestion?.type === 'deload' && { backgroundColor: colors.purpleBg, borderColor: colors.purpleBorder },
            ]}>
              <Text style={[
                s.statVal,
                firstExerciseSuggestion?.type === 'increase' && { color: colors.green },
                firstExerciseSuggestion?.type === 'deload' && { color: colors.purpleText },
                (!firstExerciseSuggestion || firstExerciseSuggestion.type === 'maintain') && { color: colors.titaniumMid },
              ]}>
                {firstExerciseSuggestion ? (firstExerciseSuggestion.weightChange > 0 ? `+${firstExerciseSuggestion.weightChange}` : `${firstExerciseSuggestion.weightChange}`) : '+0'}kg
              </Text>
              <Text style={[
                s.statLab,
                firstExerciseSuggestion?.type === 'increase' && { color: colors.green },
                firstExerciseSuggestion?.type === 'deload' && { color: colors.purpleText },
                (!firstExerciseSuggestion || firstExerciseSuggestion.type === 'maintain') && { color: colors.textMuted },
              ]}>
                {firstExerciseName.toLowerCase()} suggestion
              </Text>
            </View>
          </View>

          <View style={s.card}>
            <Text style={[s.label, { marginBottom: spacing.sm }]}>BREAKDOWN</Text>
            {exercises.map((ex, i) => (
              <View key={i} style={s.breakRow}>
                <Text style={s.breakName}>{ex.name}</Text>
                <Text style={s.breakVal}>
                  {ex.sets.length} × {ex.sets[0]?.weight ?? 0}kg
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={s.primBtn} onPress={() => { resetSession(); navigation.goBack() }}>
            <Text style={s.primBtnText}>Save &amp; exit</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    )
  }

  // ── Rest Timer ──
  if (phase === 'resting') {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <View style={s.ph}>
          <Text style={s.dateText}>After set {activeEx?.sets.length}</Text>
          <Text style={s.bigTitle}>Rest.</Text>
          <BreathingRestTimer seconds={workoutEx?.restSeconds ?? 90} onSkip={handleRestDone} />
          <View style={s.card}>
            <Text style={s.label}>NEXT</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm }}>
              <Text style={s.body}>{workout.exercises[activeExerciseIndex]?.name}</Text>
              <Text style={[s.body, { color: colors.titanium, fontWeight: '500' }]}>{curWeight}kg × {curReps}</Text>
            </View>
          </View>
        </View>
      </View>
    )
  }

  // ── Tracking ──
  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.ph}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: spacing.sm, paddingBottom: spacing.sm }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 13, color: colors.titaniumMid }}>← Back</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 13, color: colors.textMuted, fontVariant: ['tabular-nums'] }}>{elapsedStr}</Text>
        </View>
        <Text style={s.dateText}>{workout.name} · Day {day}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Text style={s.bigTitle}>{workoutEx?.name ?? 'Exercise'}</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>{activeExerciseIndex + 1} / {exercises.length}</Text>
        </View>

        {/* Progress dots */}
        <View style={{ flexDirection: 'row', gap: 4, marginTop: spacing.sm, marginBottom: spacing.md }}>
          {exercises.map((_, i) => (
            <View key={i} style={[s.progDot, i <= activeExerciseIndex && s.progDotOn]} />
          ))}
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {(['sets', 'history', 'info'] as Tab[]).map(t => (
          <TouchableOpacity key={t} style={[s.tabItem, tab === t && s.tabItemOn]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextOn]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.ph}>

          {/* SETS TAB */}
          {tab === 'sets' && (
            <>
              {/* Weight / Reps adjusters */}
              <View style={s.adjRow}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={s.label}>Weight</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <TouchableOpacity style={s.adjBtn} onPress={() => setCurWeight(w => Math.max(2.5, w - 2.5))}>
                      <Text style={s.adjBtnText}>−</Text>
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center', width: 64 }}>
                      <Text style={s.adjVal}>{curWeight}</Text>
                      <Text style={s.adjUnit}>kg</Text>
                    </View>
                    <TouchableOpacity style={s.adjBtn} onPress={() => setCurWeight(w => w + 2.5)}>
                      <Text style={s.adjBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={s.adjDivider} />
                <View style={{ alignItems: 'center' }}>
                  <Text style={s.label}>Reps</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <TouchableOpacity style={s.adjBtn} onPress={() => setCurReps(r => Math.max(1, r - 1))}>
                      <Text style={s.adjBtnText}>−</Text>
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center', width: 64 }}>
                      <Text style={s.adjVal}>{curReps}</Text>
                      <Text style={s.adjUnit}>reps</Text>
                    </View>
                    <TouchableOpacity style={s.adjBtn} onPress={() => setCurReps(r => r + 1)}>
                      <Text style={s.adjBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Smart suggestion */}
              <View style={suggestion?.type === 'deload' ? s.purpleCard : s.insightCard}>
                <Text style={[s.label, { color: suggestion?.type === 'deload' ? colors.purpleText : colors.green, marginBottom: 4 }]}>SMART PROGRESSION</Text>
                <Text style={{ fontSize: 13, color: suggestion?.type === 'deload' ? colors.purpleText : colors.greenText }}>
                  {suggestion?.message ?? 'Log your first set to get a recommendation.'}
                </Text>
              </View>

              {/* Set log */}
              <View style={s.card}>
                <View style={{ flexDirection: 'row', paddingBottom: spacing.sm, borderBottomWidth: 0.5, borderBottomColor: '#1a1e28' }}>
                  <Text style={[s.label, { width: 28 }]}>#</Text>
                  <Text style={[s.label, { flex: 1, textAlign: 'center' }]}>KG</Text>
                  <Text style={[s.label, { flex: 1, textAlign: 'center' }]}>REPS</Text>
                  <Text style={[s.label, { flex: 1, textAlign: 'center' }]}>VOL</Text>
                  <View style={{ width: 32 }} />
                </View>
                {(activeEx?.sets ?? []).map((set, i) => (
                  <SetRow
                    key={i}
                    index={i}
                    weight={set.weight}
                    reps={set.reps}
                    done={set.done}
                    onToggle={() => handleToggleSet(i)}
                  />
                ))}
                <TouchableOpacity style={s.addSetRow} onPress={handleLogSet}>
                  <Text style={{ fontSize: 16, color: colors.titaniumFaint, marginRight: 6 }}>+</Text>
                  <Text style={{ fontSize: 13, color: colors.titaniumFaint }}>Log set</Text>
                </TouchableOpacity>
              </View>

              {/* Estimated 1RM */}
              {activeEx?.sets && activeEx.sets.length > 0 && (
                <View style={[s.card, { flexDirection: 'row', justifyContent: 'space-between' }]}>
                  <Text style={s.body}>Estimated 1RM</Text>
                  <Text style={[s.body, { color: colors.amber, fontWeight: '500' }]}>
                    {estimateOneRepMax(curWeight, curReps)}kg
                  </Text>
                </View>
              )}

              {/* Actions */}
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                <TouchableOpacity
                  style={[s.secBtn, { flex: 1 }]}
                  onPress={() => setPhase('resting')}
                >
                  <Text style={s.secBtnText}>Rest timer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.primBtn, { flex: 1, marginBottom: 0 }]}
                  onPress={handleNextExercise}
                >
                  <Text style={s.primBtnText}>
                    {activeExerciseIndex >= exercises.length - 1 ? 'Finish' : 'Next exercise'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* HISTORY TAB */}
          {tab === 'history' && (() => {
            const exName = activeEx?.name ?? ''
            const relevantSessions = sessions
              .filter(sess => sess.exercises.some(e => e.name === exName))
              .slice(0, 4)

            const historyItems = relevantSessions.map(sess => {
              const exData = sess.exercises.find(e => e.name === exName)
              const completedSets = exData?.sets.filter(st => st.done) ?? []
              const topWeight = completedSets.length > 0 ? Math.max(...completedSets.map(st => st.weight)) : 0
              const avgReps = completedSets.length > 0 ? Math.round(completedSets.reduce((a, st) => a + st.reps, 0) / completedSets.length) : 0
              const vol = completedSets.reduce((a, st) => a + st.weight * st.reps, 0)
              const dateStr = sess.loggedAt && typeof sess.loggedAt.toDate === 'function'
                ? sess.loggedAt.toDate().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
                : sess.dayName
              return { date: dateStr, weight: topWeight, reps: avgReps, sets: completedSets.length, vol }
            })

            // Compute volume trend
            let trendMsg = ''
            if (historyItems.length >= 2) {
              const latestVol = historyItems[0].vol
              const oldestVol = historyItems[historyItems.length - 1].vol
              if (oldestVol > 0) {
                const pctChange = Math.round(((latestVol - oldestVol) / oldestVol) * 100)
                if (pctChange > 0) trendMsg = `+${pctChange}% volume over ${historyItems.length} sessions. Strong upward trend.`
                else if (pctChange < 0) trendMsg = `${pctChange}% volume over ${historyItems.length} sessions. Consider adjusting load.`
                else trendMsg = `Volume steady over ${historyItems.length} sessions.`
              }
            }

            return (
              <View style={s.card}>
                <Text style={[s.label, { marginBottom: spacing.md }]}>LAST {historyItems.length} SESSIONS</Text>
                {historyItems.length === 0 && (
                  <Text style={[s.small, { textAlign: 'center', padding: spacing.lg }]}>No history yet for {exName}.</Text>
                )}
                {historyItems.map((h, i) => (
                  <View key={i} style={[s.breakRow, { paddingVertical: spacing.sm }]}>
                    <View>
                      <Text style={s.body}>{h.date}</Text>
                      <Text style={s.small}>{h.sets} sets · {h.vol} vol</Text>
                    </View>
                    <Text style={[s.body, { color: colors.titanium }]}>{h.weight}kg × {h.reps}</Text>
                  </View>
                ))}
                {trendMsg !== '' && (
                  <View style={[s.insightCard, { marginTop: spacing.sm }]}>
                    <Text style={{ fontSize: 13, color: colors.greenText }}>{trendMsg}</Text>
                  </View>
                )}
              </View>
            )
          })()}

          {/* INFO TAB */}
          {tab === 'info' && workoutEx && (
            <>
              <View style={s.card}>
                <Text style={[s.label, { marginBottom: spacing.sm }]}>MUSCLES WORKED</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {workoutEx.primaryMuscles.map((m, i) => (
                    <View key={i} style={s.musclePill}>
                      <Text style={s.musclePillText}>{m}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={s.card}>
                <Text style={[s.label, { marginBottom: spacing.sm }]}>FORM CUES</Text>
                {workoutEx.formCues.map((cue, i) => (
                  <Text key={i} style={[s.body, { paddingVertical: 6, borderBottomWidth: i < workoutEx.formCues.length - 1 ? 0.5 : 0, borderBottomColor: '#1a1e28' }]}>
                    {cue}
                  </Text>
                ))}
              </View>
              <View style={s.card}>
                <Text style={[s.label, { marginBottom: spacing.sm }]}>TARGET</Text>
                <View style={s.breakRow}><Text style={s.body}>Sets</Text><Text style={[s.body, { color: colors.titanium }]}>{workoutEx.targetSets}</Text></View>
                <View style={s.breakRow}><Text style={s.body}>Reps</Text><Text style={[s.body, { color: colors.titanium }]}>{workoutEx.targetReps}</Text></View>
                <View style={s.breakRow}><Text style={s.body}>Rest</Text><Text style={[s.body, { color: colors.titanium }]}>{workoutEx.restSeconds}s</Text></View>
              </View>
            </>
          )}

        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  ph: { paddingHorizontal: spacing.lg },
  dateText: { ...typography.small, marginBottom: 2 },
  bigTitle: { fontSize: 22, fontWeight: '500', color: colors.textPrimary },
  bigNum: { fontSize: 36, fontWeight: '500', color: colors.titanium },
  body: { fontSize: 14, color: colors.textPrimary },
  small: { ...typography.small },
  label: { fontSize: 11, color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' as const },
  card: { backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: colors.bgDeep, borderRadius: radius.md, padding: spacing.md },
  statVal: { fontSize: 22, fontWeight: '500', color: colors.titanium },
  statLab: { ...typography.small, marginTop: 2 },
  breakRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 0.5, borderBottomColor: '#1a1e28' },
  breakName: { fontSize: 13, color: colors.textPrimary, flex: 1 },
  breakVal: { fontSize: 13, color: colors.titaniumMid },

  progDot: { height: 3, flex: 1, borderRadius: 2, backgroundColor: colors.bgInset },
  progDotOn: { backgroundColor: colors.titaniumMid },

  tabRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: colors.border, marginBottom: spacing.md },
  tabItem: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemOn: { borderBottomColor: colors.titaniumMid },
  tabText: { fontSize: 13, color: colors.textMuted },
  tabTextOn: { color: colors.titanium },

  adjRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm },
  adjBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.bgDeep, borderWidth: 0.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  adjBtnText: { fontSize: 22, color: colors.titaniumMid, lineHeight: 26 },
  adjVal: { fontSize: 30, fontWeight: '500', color: colors.titanium },
  adjUnit: { fontSize: 12, color: colors.textMuted },
  adjDivider: { width: 0.5, backgroundColor: colors.border, marginHorizontal: spacing.sm },

  insightCard: { backgroundColor: colors.greenBg, borderWidth: 0.5, borderColor: colors.greenBorder, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  purpleCard: { backgroundColor: colors.purpleBg, borderWidth: 0.5, borderColor: colors.purpleBorder, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },

  addSetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, marginTop: 4 },

  musclePill: { backgroundColor: colors.bgInset, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  musclePillText: { fontSize: 12, color: colors.titaniumMid },

  primBtn: { backgroundColor: colors.titanium, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginBottom: spacing.sm },
  primBtnText: { fontSize: 14, fontWeight: '500', color: colors.bg },
  secBtn: { backgroundColor: colors.greenBg, borderWidth: 0.5, borderColor: colors.greenBorder, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  secBtnText: { fontSize: 14, color: colors.green },
})
