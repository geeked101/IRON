/**
 * SingleExerciseScreen.tsx
 *
 * Set-by-set tracker for one exercise within a session.
 * Receives exercise details and any previously logged sets via route params.
 *
 * When user taps "Done with exercise", navigates back to DayExerciseListScreen
 * passing all logged sets so the list can update its state.
 *
 * Tabs: Sets / History / Info
 */

import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Vibration, Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { colors, spacing, radius } from '../theme'
import { useAuthStore } from '../store/index'
import { fetchRecentSessions, SetLog } from '../services/firebase'
import { WORKOUT_SPLIT } from '../data/workoutSplit'
import { suggestProgression, estimateOneRepMax } from '../utils/progressiveOverload'
import { useScaledFont } from '../hooks/useScaledFont'

type TabKey = 'sets' | 'history' | 'info'

// ─── Rest Timer ────────────────────────────────────────────────────────────────

/**
 * Countdown rest timer with colour feedback.
 * Green > 50%, Amber 25–50%, Red < 25%.
 */
function RestTimer({ seconds, onSkip }: { seconds: number; onSkip: () => void }) {
  const [remaining, setRemaining] = useState(seconds)
  const max = useRef(seconds)
  const iv = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    iv.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(iv.current!)
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          if (Platform.OS === 'android') Vibration.vibrate(200)
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(iv.current!)
  }, [])

  const pct = remaining / max.current
  const ringColor = pct > 0.5 ? colors.titaniumMid : pct > 0.25 ? colors.amber : colors.red

  return (
    <View style={rt.wrap}>
      <View style={[rt.ring, { borderColor: ringColor }]}>
        <Text style={[rt.time, { color: ringColor }]}>{remaining}</Text>
        <Text style={rt.sec}>sec</Text>
      </View>
      <View style={rt.adjustRow}>
        <TouchableOpacity style={rt.adjBtn} onPress={() => setRemaining(r => Math.max(0, r - 15))}>
          <Text style={rt.adjText}>−15s</Text>
        </TouchableOpacity>
        <TouchableOpacity style={rt.adjBtn} onPress={() => setRemaining(r => r + 15)}>
          <Text style={rt.adjText}>+15s</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={rt.skipBtn} onPress={onSkip}>
        <Text style={rt.skipText}>Skip rest</Text>
      </TouchableOpacity>
    </View>
  )
}

const rt = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.xl },
  ring: { width: 130, height: 130, borderRadius: 65, borderWidth: 6, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  time: { fontSize: 44, fontWeight: '500' },
  sec: { fontSize: 12, color: colors.textMuted },
  adjustRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  adjBtn: { backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  adjText: { fontSize: 13, color: colors.textMuted },
  skipBtn: { backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  skipText: { fontSize: 14, color: colors.titaniumMid },
})

// ─── Set Row ───────────────────────────────────────────────────────────────────

/** Individual logged set row in the sets table. */
function SetRow({ index, weight, reps, done, onToggle }: {
  index: number; weight: number; reps: number; done: boolean; onToggle: () => void
}) {
  return (
    <View style={sr.row}>
      <Text style={sr.num}>{index + 1}</Text>
      <Text style={sr.cell}>{weight}kg</Text>
      <Text style={sr.cell}>{reps}</Text>
      <Text style={sr.cell}>{weight * reps}</Text>
      <TouchableOpacity
        style={[sr.check, done && sr.checkDone]}
        onPress={onToggle}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {done && <Text style={sr.checkMark}>✓</Text>}
      </TouchableOpacity>
    </View>
  )
}

const sr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#1a1e28' },
  num: { width: 28, fontSize: 12, color: colors.textMuted },
  cell: { flex: 1, textAlign: 'center', fontSize: 15, color: colors.titanium },
  check: { width: 36, height: 36, borderRadius: 9, borderWidth: 0.5, borderColor: colors.border, backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: colors.greenBg, borderColor: colors.greenBorder },
  checkMark: { fontSize: 15, color: colors.green },
})

// ─── Main Screen ───────────────────────────────────────────────────────────────

/** SingleExerciseScreen — logs sets for one exercise then returns to list. */
export default function SingleExerciseScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets()
  const f = useScaledFont()
  const { uid } = useAuthStore()

  const {
    day = 1,
    exerciseName = '',
    targetSets = 4,
    targetReps = '8–10',
    restSeconds = 90,
    primaryMuscles = [] as string[],
    formCues = [] as string[],
    initialSets = [] as SetLog[],
  } = route.params ?? {}

  const [tab, setTab] = useState<TabKey>('sets')
  const [showRest, setShowRest] = useState(false)
  const [curWeight, setCurWeight] = useState(60)
  const [curReps, setCurReps] = useState(10)
  const [sets, setSets] = useState<SetLog[]>(initialSets)
  const [recentSessions, setRecentSessions] = useState<any[]>([])

  const elapsed = useRef(0)
  useEffect(() => {
    const id = setInterval(() => { elapsed.current += 1 }, 1000)
    return () => clearInterval(id)
  }, [])

  // Fetch history for this exercise
  useEffect(() => {
    if (uid) fetchRecentSessions(uid, 5).then(setRecentSessions)
  }, [uid])

  // Pre-fill weight from last session
  useEffect(() => {
    for (const session of recentSessions) {
      const ex = session.exercises?.find((e: any) => e.name === exerciseName)
      if (ex?.sets?.length > 0) {
        const last = ex.sets[ex.sets.length - 1]
        setCurWeight(last.weight || 60)
        break
      }
    }
  }, [recentSessions])

  /** Log a new set with current weight and reps. */
  function handleLogSet() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setSets(prev => [...prev, { weight: curWeight, reps: curReps, done: false }])
  }

  /** Toggle a set's done state. */
  function handleToggle(i: number) {
    setSets(prev => prev.map((s, idx) => idx === i ? { ...s, done: !s.done } : s))
  }

  /**
   * Marks exercise as done. Passes all logged sets back to DayExerciseListScreen
   * via navigation params so the list can update its state.
   */
  function handleDone() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    navigation.navigate('DayExerciseList', {
      updatedExercise: { name: exerciseName, sets },
    })
  }

  // History data for this exercise from recent sessions
  const history = recentSessions
    .map(s => {
      const ex = s.exercises?.find((e: any) => e.name === exerciseName)
      if (!ex || ex.sets.length === 0) return null
      const best = ex.sets.reduce((a: SetLog, b: SetLog) => b.weight > a.weight ? b : a, ex.sets[0])
      return { date: s.loggedAt?.toDate?.()?.toLocaleDateString?.() ?? 'Unknown', weight: best.weight, reps: best.reps, setCount: ex.sets.length }
    })
    .filter(Boolean)
    .slice(0, 4)

  const oneRM = sets.length > 0 ? estimateOneRepMax(curWeight, curReps) : null
  const targetRepsNum = parseInt(targetReps.split('–').pop() ?? '10', 10)
  const suggestion = suggestProgression(exerciseName, recentSessions, targetRepsNum)

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>← List</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.exName, { fontSize: f.h2 }]} numberOfLines={1}>{exerciseName}</Text>
          <Text style={[s.daySub, { fontSize: f.small }]}>Day {day} · {targetSets} sets × {targetReps}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {(['sets', 'history', 'info'] as TabKey[]).map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabOn]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextOn]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={s.ph}>

          {/* ── SETS TAB ── */}
          {tab === 'sets' && !showRest && (
            <>
              {/* Weight + Reps adjusters */}
              <View style={s.adjRow}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[s.adjLabel, { fontSize: f.label }]}>Weight</Text>
                  <View style={s.adjControls}>
                    <TouchableOpacity style={s.adjBtn} onPress={() => setCurWeight(w => Math.max(0, parseFloat((w - 2.5).toFixed(1))))}>
                      <Text style={s.adjBtnText}>−</Text>
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center', minWidth: 72 }}>
                      <Text style={[s.adjVal, { fontSize: f.bigNum }]}>{curWeight}</Text>
                      <Text style={[s.adjUnit, { fontSize: f.small }]}>kg</Text>
                    </View>
                    <TouchableOpacity style={s.adjBtn} onPress={() => setCurWeight(w => parseFloat((w + 2.5).toFixed(1)))}>
                      <Text style={s.adjBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={s.adjDivider} />
                <View style={{ alignItems: 'center' }}>
                  <Text style={[s.adjLabel, { fontSize: f.label }]}>Reps</Text>
                  <View style={s.adjControls}>
                    <TouchableOpacity style={s.adjBtn} onPress={() => setCurReps(r => Math.max(1, r - 1))}>
                      <Text style={s.adjBtnText}>−</Text>
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center', minWidth: 72 }}>
                      <Text style={[s.adjVal, { fontSize: f.bigNum }]}>{curReps}</Text>
                      <Text style={[s.adjUnit, { fontSize: f.small }]}>reps</Text>
                    </View>
                    <TouchableOpacity style={s.adjBtn} onPress={() => setCurReps(r => r + 1)}>
                      <Text style={s.adjBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Smart progression */}
              {suggestion && (
                <View style={[s.insightCard, suggestion.type === 'increase' ? s.insightGreen : suggestion.type === 'deload' ? s.insightAmber : s.insightPurple]}>
                  <Text style={[s.insightText, { fontSize: f.small }]}>{suggestion.message}</Text>
                </View>
              )}

              {/* Set table */}
              <View style={s.card}>
                <View style={s.tableHeader}>
                  <Text style={[s.tableHead, { width: 28 }]}>#</Text>
                  <Text style={[s.tableHead, { flex: 1, textAlign: 'center' }]}>KG</Text>
                  <Text style={[s.tableHead, { flex: 1, textAlign: 'center' }]}>REPS</Text>
                  <Text style={[s.tableHead, { flex: 1, textAlign: 'center' }]}>VOL</Text>
                  <View style={{ width: 36 }} />
                </View>
                {sets.map((set, i) => (
                  <SetRow key={i} index={i} weight={set.weight} reps={set.reps} done={set.done} onToggle={() => handleToggle(i)} />
                ))}
                <TouchableOpacity style={s.logSetRow} onPress={handleLogSet}>
                  <Text style={s.logSetPlus}>+</Text>
                  <Text style={[s.logSetText, { fontSize: f.body }]}>Log set</Text>
                </TouchableOpacity>
              </View>

              {/* 1RM */}
              {oneRM && (
                <View style={s.orm}>
                  <Text style={[s.ormLabel, { fontSize: f.small }]}>Estimated 1RM</Text>
                  <Text style={[s.ormVal, { fontSize: f.body }]}>{oneRM}kg</Text>
                </View>
              )}

              {/* Rest timer button */}
              <TouchableOpacity style={s.restBtn} onPress={() => setShowRest(true)}>
                <Text style={[s.restBtnText, { fontSize: f.body }]}>Start rest timer</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Rest timer view */}
          {tab === 'sets' && showRest && (
            <RestTimer seconds={restSeconds} onSkip={() => setShowRest(false)} />
          )}

          {/* ── HISTORY TAB ── */}
          {tab === 'history' && (
            <View style={s.card}>
              <Text style={[s.cardLabel, { fontSize: f.label }]}>LAST 4 SESSIONS</Text>
              {history.length === 0 && (
                <Text style={[s.emptyText, { fontSize: f.small }]}>No history yet for this exercise.</Text>
              )}
              {history.map((h: any, i: number) => (
                <View key={i} style={s.histRow}>
                  <View>
                    <Text style={[s.histDate, { fontSize: f.body }]}>{h.date}</Text>
                    <Text style={[s.histSub, { fontSize: f.small }]}>{h.setCount} sets</Text>
                  </View>
                  <Text style={[s.histWeight, { fontSize: f.body }]}>{h.weight}kg × {h.reps}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── INFO TAB ── */}
          {tab === 'info' && (
            <>
              <View style={s.card}>
                <Text style={[s.cardLabel, { fontSize: f.label }]}>MUSCLES WORKED</Text>
                <View style={s.chipRow}>
                  {primaryMuscles.length > 0
                    ? primaryMuscles.map((m: string, i: number) => (
                        <View key={i} style={s.chip}><Text style={[s.chipText, { fontSize: f.small }]}>{m}</Text></View>
                      ))
                    : <Text style={[s.emptyText, { fontSize: f.small }]}>—</Text>
                  }
                </View>
              </View>
              <View style={s.card}>
                <Text style={[s.cardLabel, { fontSize: f.label }]}>FORM CUES</Text>
                {formCues.length > 0
                  ? formCues.map((cue: string, i: number) => (
                      <Text key={i} style={[s.cueLine, { fontSize: f.body }]}>{cue}</Text>
                    ))
                  : <Text style={[s.emptyText, { fontSize: f.small }]}>No cues for this exercise.</Text>
                }
              </View>
              <View style={s.card}>
                <View style={s.histRow}><Text style={[s.body, { fontSize: f.body }]}>Target sets</Text><Text style={[s.titaniumText, { fontSize: f.body }]}>{targetSets}</Text></View>
                <View style={s.histRow}><Text style={[s.body, { fontSize: f.body }]}>Target reps</Text><Text style={[s.titaniumText, { fontSize: f.body }]}>{targetReps}</Text></View>
                <View style={[s.histRow, { borderBottomWidth: 0 }]}><Text style={[s.body, { fontSize: f.body }]}>Rest</Text><Text style={[s.titaniumText, { fontSize: f.body }]}>{restSeconds}s</Text></View>
              </View>
            </>
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Done button */}
      <View style={[s.stickyDone, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TouchableOpacity style={s.doneBtn} onPress={handleDone} activeOpacity={0.85}>
          <Text style={[s.doneBtnText, { fontSize: f.body + 2 }]}>
            Done with exercise {sets.length > 0 ? `· ${sets.length} set${sets.length !== 1 ? 's' : ''} logged` : ''}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm, gap: spacing.md },
  backBtn: { paddingVertical: spacing.sm, paddingRight: spacing.sm },
  backText: { fontSize: 14, color: colors.titaniumMid },
  exName: { fontWeight: '600', color: colors.textPrimary },
  daySub: { color: colors.textMuted, marginTop: 2 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: colors.titaniumMid },
  tabText: { fontSize: 13, color: colors.textMuted },
  tabTextOn: { color: colors.titanium },
  ph: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  adjRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm },
  adjLabel: { color: colors.textMuted, letterSpacing: 1, marginBottom: spacing.sm },
  adjControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  adjBtn: { width: 52, height: 52, borderRadius: radius.sm, backgroundColor: colors.bgDeep, borderWidth: 0.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  adjBtnText: { fontSize: 26, color: colors.titaniumMid, lineHeight: 30 },
  adjVal: { fontWeight: '500', color: colors.titanium },
  adjUnit: { color: colors.textMuted },
  adjDivider: { width: 0.5, backgroundColor: colors.border },
  insightCard: { borderWidth: 0.5, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  insightGreen: { backgroundColor: colors.greenBg, borderColor: colors.greenBorder },
  insightAmber: { backgroundColor: colors.amberBg, borderColor: colors.amberBorder },
  insightPurple: { backgroundColor: colors.purpleBg, borderColor: colors.purpleBorder },
  insightText: { color: colors.textPrimary },
  card: { backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
  cardLabel: { color: colors.textMuted, letterSpacing: 1, marginBottom: spacing.sm },
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: spacing.sm, borderBottomWidth: 0.5, borderBottomColor: '#1a1e28' },
  tableHead: { fontSize: 10, color: colors.textMuted, letterSpacing: 1 },
  logSetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.sm },
  logSetPlus: { fontSize: 18, color: colors.titaniumFaint },
  logSetText: { color: colors.textMuted },
  orm: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  ormLabel: { color: colors.textMuted },
  ormVal: { color: colors.amber, fontWeight: '500' },
  restBtn: { backgroundColor: colors.bgDeep, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.md, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  restBtnText: { color: colors.titaniumMid },
  histRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 0.5, borderBottomColor: '#1a1e28' },
  histDate: { color: colors.textPrimary },
  histSub: { color: colors.textMuted, marginTop: 2 },
  histWeight: { color: colors.titanium, fontWeight: '500' },
  emptyText: { color: colors.textMuted, paddingVertical: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.xs },
  chip: { backgroundColor: colors.bgInset, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { color: colors.titaniumMid },
  cueLine: { color: colors.textSecondary, paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: '#1a1e28' },
  body: { color: colors.textPrimary },
  titaniumText: { color: colors.titanium, fontWeight: '500' },
  stickyDone: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.bg, borderTopWidth: 0.5, borderTopColor: colors.border },
  doneBtn: { backgroundColor: colors.greenBg, borderWidth: 0.5, borderColor: colors.greenBorder, borderRadius: radius.lg, height: 64, alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { color: '#6abf65', fontWeight: '700', letterSpacing: 0.2 },
})
