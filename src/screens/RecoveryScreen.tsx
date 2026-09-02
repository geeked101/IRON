import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, spacing, radius, typography } from '../theme'
import { STRETCH_ROUTINE } from '../data/workoutSplit'
import { useNutritionStore, useAuthStore } from '../store/index'
import { useQueueStore } from '../store/queueStore'
import { saveWorkoutSession } from '../services/firebase'
import MuscleHeatmap from '../components/MuscleHeatmap'

type Soreness = 'fresh' | 'moderate' | 'sore'
const sorenessColor: Record<Soreness, string> = {
  fresh: colors.green,
  moderate: colors.amber,
  sore: colors.red,
}

const muscleGroups: { name: string; default: Soreness }[] = [
  { name: 'Chest', default: 'moderate' },
  { name: 'Back', default: 'fresh' },
  { name: 'Legs', default: 'sore' },
  { name: 'Shoulders', default: 'moderate' },
  { name: 'Biceps', default: 'fresh' },
  { name: 'Triceps', default: 'moderate' },
]

const sorenessOrder: Soreness[] = ['fresh', 'moderate', 'sore']

export default function RecoveryScreen({ navigation }: any) {
  const insets = useSafeAreaInsets()
  const { uid } = useAuthStore()
  const { cycleCount, markSessionCompleted, advanceDay } = useQueueStore()
  const [soreness, setSoreness] = useState<Record<string, Soreness>>(
    Object.fromEntries(muscleGroups.map(m => [m.name, m.default]))
  )
  const [completedStretches, setCompletedStretches] = useState<Set<number>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { waterLitres, addWater, load: loadNutrition } = useNutritionStore()

  React.useEffect(() => {
    loadNutrition()
  }, [])

  const sleep = 7.2

  function cycleSoreness(muscle: string) {
    setSoreness(s => {
      const cur = s[muscle]
      const nextIdx = (sorenessOrder.indexOf(cur) + 1) % sorenessOrder.length
      return { ...s, [muscle]: sorenessOrder[nextIdx] }
    })
  }

  function toggleStretch(i: number) {
    setCompletedStretches(s => {
      const next = new Set(s)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const allDone = completedStretches.size === STRETCH_ROUTINE.length

  const heatmapData = muscleGroups.map((mg) => {
    const state = soreness[mg.name] || 'fresh'
    const statusMap = {
      fresh: { status: 'fresh' as const, pct: 15, label: '3 days ago' },
      moderate: { status: 'moderate' as const, pct: 55, label: 'Yesterday' },
      sore: { status: 'fatigued' as const, pct: 85, label: 'Today' },
    }
    const info = statusMap[state]
    return {
      name: mg.name,
      status: info.status,
      fatiguePct: info.pct,
      lastTrained: info.label,
    }
  })

  async function handleCompleteRecovery() {
    setIsSubmitting(true)
    try {
      const effectiveUid = uid || 'local_user'
      await saveWorkoutSession({
        uid: effectiveUid,
        day: 7,
        dayName: 'Recovery & Rest',
        durationMinutes: 20,
        totalVolume: 0,
        prs: [],
        notes: `Soreness: ${Object.entries(soreness).map(([k, v]) => `${k}:${v}`).join(', ')}. Completed ${completedStretches.size}/${STRETCH_ROUTINE.length} stretches.`,
        exercises: [],
        loggedAt: null,
      })

      await markSessionCompleted(effectiveUid)
      await advanceDay(1, effectiveUid)

      Alert.alert(
        `Cycle ${cycleCount + 1} Unlocked!`,
        `Rest day completed. You are now on Day 1 (Push) of Cycle ${cycleCount + 1}.`,
        [
          {
            text: "Let's Train",
            onPress: () => {
              if (navigation?.canGoBack?.()) {
                navigation.goBack()
              } else {
                navigation?.navigate?.('MainTabs', { screen: 'Home' })
              }
            },
          },
        ]
      )
    } catch (err) {
      console.error('[Recovery] Error completing recovery:', err)
      Alert.alert('Error', 'Failed to save rest day status.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSkipToDay1() {
    const effectiveUid = uid || 'local_user'
    await advanceDay(1, effectiveUid)
    if (navigation?.canGoBack?.()) {
      navigation.goBack()
    } else {
      navigation?.navigate?.('MainTabs', { screen: 'Home' })
    }
  }

  return (
    <ScrollView style={[s.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={s.ph}>
        {navigation?.canGoBack?.() && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: spacing.md }}>
            <Text style={{ fontSize: 13, color: colors.titaniumMid }}>← Back</Text>
          </TouchableOpacity>
        )}

        <View style={s.headerCenter}>
          <Text style={s.dayLabel}>DAY 7 · RECOVERY · CYCLE {cycleCount}</Text>
          <Text style={s.quote}>"Growth happens{'\n'}after the battle."</Text>
        </View>

        {/* Sleep + Hydration */}
        <View style={s.grid2}>
          <View style={s.metricCard}>
            <Text style={s.metricVal}>{sleep}<Text style={s.metricUnit}>h</Text></Text>
            <Text style={s.metricLab}>sleep last night</Text>
            <View style={s.progressBg}>
              <View style={[s.progressFg, { width: `${(sleep / 9) * 100}%` as any, backgroundColor: sleep >= 7 ? colors.green : colors.amber }]} />
            </View>
          </View>
          <View style={s.metricCard}>
            <Text style={s.metricVal}>{waterLitres.toFixed(1)}<Text style={s.metricUnit}>L</Text></Text>
            <Text style={s.metricLab}>hydration today</Text>
            <View style={s.progressBg}>
              <View style={[s.progressFg, { width: `${(waterLitres / 4) * 100}%` as any, backgroundColor: colors.blue }]} />
            </View>
            <TouchableOpacity style={s.addWaterBtn} onPress={() => addWater(0.25)}>
              <Text style={s.addWaterText}>+250ml</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Muscle Recovery Heatmap */}
        <MuscleHeatmap muscles={heatmapData} />

        {/* Soreness map */}
        <View style={s.card}>
          <Text style={[s.label, { marginBottom: spacing.sm }]}>SORENESS CHECK</Text>
          <Text style={[s.muted, { marginBottom: spacing.md }]}>Tap to cycle: fresh → moderate → sore</Text>
          <View style={s.sorenessGrid}>
            {muscleGroups.map((mg) => {
              const state = soreness[mg.name]
              return (
                <TouchableOpacity
                  key={mg.name}
                  style={[s.sorenessCard, { borderColor: sorenessColor[state] + '44' }]}
                  onPress={() => cycleSoreness(mg.name)}
                >
                  <Text style={s.sorenessMuscle}>{mg.name}</Text>
                  <Text style={[s.sorenessState, { color: sorenessColor[state] }]}>
                    {state.charAt(0).toUpperCase() + state.slice(1)}
                  </Text>
                  <View style={[s.sorenessDot, { backgroundColor: sorenessColor[state] }]} />
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Recovery recommendation */}
          {Object.values(soreness).includes('sore') ? (
            <View style={[s.insightCard, { backgroundColor: colors.purpleBg, borderColor: colors.purpleBorder }]}>
              <Text style={{ fontSize: 13, color: colors.purpleText }}>
                Some muscle groups still sore. Prioritise sleep and hit protein target before next session.
              </Text>
            </View>
          ) : (
            <View style={[s.insightCard, { backgroundColor: colors.greenBg, borderColor: colors.greenBorder }]}>
              <Text style={{ fontSize: 13, color: colors.greenText }}>
                Recovery looking good. Ready for Day 1 tomorrow.
              </Text>
            </View>
          )}
        </View>

        {/* Stretch routine */}
        <View style={s.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
            <Text style={s.label}>STRETCH ROUTINE</Text>
            <Text style={s.muted}>{completedStretches.size}/{STRETCH_ROUTINE.length}</Text>
          </View>
          {STRETCH_ROUTINE.map((stretch, i) => {
            const done = completedStretches.has(i)
            return (
              <TouchableOpacity key={i} style={s.stretchRow} onPress={() => toggleStretch(i)}>
                <View style={[s.stretchCheck, done && s.stretchCheckDone]}>
                  {done && <Text style={{ fontSize: 12, color: colors.green }}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.stretchName, done && { color: colors.textMuted, textDecorationLine: 'line-through' }]}>
                    {stretch.name}
                  </Text>
                  <Text style={s.muted}>{stretch.duration}</Text>
                </View>
              </TouchableOpacity>
            )
          })}
          {allDone && (
            <View style={[s.insightCard, { backgroundColor: colors.greenBg, borderColor: colors.greenBorder, marginTop: spacing.sm }]}>
              <Text style={{ fontSize: 13, color: colors.greenText }}>Stretch routine complete. 🦾</Text>
            </View>
          )}
        </View>

        {/* Recovery tips */}
        <View style={s.card}>
          <Text style={[s.label, { marginBottom: spacing.sm }]}>TODAY'S PRIORITIES</Text>
          {[
            { icon: '💤', text: 'Aim for 8h sleep tonight' },
            { icon: '💧', text: `Hit ${4 - waterLitres > 0 ? (4 - waterLitres).toFixed(1) : 0}L more water` },
            { icon: '🥩', text: 'Keep protein at 110g even on rest days' },
            { icon: '🧘', text: 'Complete the stretch routine above' },
          ].map((tip, i) => (
            <View key={i} style={s.tipRow}>
              <Text style={{ fontSize: 18, marginRight: spacing.sm }}>{tip.icon}</Text>
              <Text style={s.body}>{tip.text}</Text>
            </View>
          ))}
        </View>

        {/* CYCLE PROGRESSION & ACTION */}
        <View style={[s.card, { borderColor: colors.titaniumMid, backgroundColor: '#161922', padding: spacing.lg, marginTop: spacing.md }]}>
          <Text style={[s.label, { color: colors.titanium, marginBottom: 4 }]}>CYCLE PROGRESSION</Text>
          <Text style={{ fontSize: 20, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 }}>
            Cycle {cycleCount} → Cycle {cycleCount + 1}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 20, marginBottom: spacing.lg }}>
            Completing your rest day logs your recovery stats and rolls your schedule over into Day 1 (Push Day) of Cycle {cycleCount + 1}.
          </Text>

          <TouchableOpacity
            style={[
              s.actionBtn,
              { backgroundColor: colors.titanium },
              isSubmitting && { opacity: 0.7 }
            ]}
            onPress={handleCompleteRecovery}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            <Text style={s.actionBtnText}>
              {isSubmitting ? 'Saving Rest Day...' : `Complete Rest Day & Start Cycle ${cycleCount + 1} →`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ marginTop: spacing.md, paddingVertical: spacing.sm, alignItems: 'center' }}
            onPress={handleSkipToDay1}
          >
            <Text style={{ fontSize: 13, color: colors.textMuted }}>Skip to Day 1 (Push)</Text>
          </TouchableOpacity>
        </View>

      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  ph: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  label: { fontSize: 11, color: colors.textMuted, letterSpacing: 1 },
  muted: { ...typography.small },
  body: { fontSize: 14, color: colors.textPrimary },
  card: { backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },

  headerCenter: { alignItems: 'center', paddingVertical: spacing.xl },
  dayLabel: { fontSize: 11, color: colors.textMuted, letterSpacing: 2, marginBottom: spacing.lg },
  quote: { fontSize: 22, fontWeight: '500', color: colors.textPrimary, textAlign: 'center', lineHeight: 32 },

  grid2: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  metricCard: { flex: 1, backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  metricVal: { fontSize: 28, fontWeight: '500', color: colors.titanium },
  metricUnit: { fontSize: 14, color: colors.textMuted },
  metricLab: { ...typography.small, marginTop: 2, marginBottom: 6 },
  progressBg: { height: 4, backgroundColor: colors.bgDeep, borderRadius: 2, marginBottom: spacing.sm },
  progressFg: { height: 4, borderRadius: 2 },
  addWaterBtn: { backgroundColor: colors.bgInset, borderRadius: 6, paddingVertical: 5, alignItems: 'center' },
  addWaterText: { fontSize: 12, color: colors.blue },

  sorenessGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  sorenessCard: { width: '30%', backgroundColor: colors.bgDeep, borderWidth: 0.5, borderRadius: radius.sm, padding: spacing.sm, alignItems: 'center' },
  sorenessMuscle: { fontSize: 12, color: colors.textPrimary, marginBottom: 3 },
  sorenessState: { fontSize: 11, marginBottom: 4 },
  sorenessDot: { width: 6, height: 6, borderRadius: 3 },
  insightCard: { borderWidth: 0.5, borderRadius: radius.sm, padding: spacing.sm },

  stretchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 0.5, borderBottomColor: '#1a1e28' },
  stretchCheck: { width: 28, height: 28, borderRadius: 7, borderWidth: 0.5, borderColor: colors.border, backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center' },
  stretchCheckDone: { backgroundColor: colors.greenBg, borderColor: colors.greenBorder },
  stretchName: { fontSize: 13, color: colors.textPrimary, fontWeight: '500' },

  tipRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#1a1e28' },
  actionBtn: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.bg,
  },
})
