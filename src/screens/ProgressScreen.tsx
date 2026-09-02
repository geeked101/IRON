import React, { useState, useEffect, useMemo } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LineChart, BarChart } from 'react-native-chart-kit'
import { colors, spacing, radius, typography } from '../theme'
import { useAuthStore, useProfileStore } from '../store/index'
import { useQueueStore } from '../store/queueStore'
import {
  fetchWeightHistory,
  fetchRecentSessions,
  fetchAllPRs,
  fetchRecentNutritionLogs,
  WeightLog,
  WorkoutSession,
  PR,
  NutritionLog
} from '../services/firebase'
import { generateBulkInsight, estimateOneRepMax } from '../utils/progressiveOverload'
import { format, subDays, differenceInWeeks, startOfWeek, isSameWeek } from 'date-fns'

const SCREEN_W = Dimensions.get('window').width
const CHART_W = SCREEN_W - 36

const chartConfig = {
  backgroundGradientFrom: colors.bgCard,
  backgroundGradientTo: colors.bgCard,
  color: (opacity = 1) => `rgba(192, 196, 204, ${opacity})`,
  labelColor: () => colors.textMuted,
  strokeWidth: 2,
  propsForDots: { r: '3', strokeWidth: '1', stroke: colors.titanium },
  propsForBackgroundLines: { strokeWidth: 0.5, stroke: colors.bgInset },
  decimalPlaces: 1,
}

type MetricTab = 'weight' | 'strength' | 'volume' | 'calories'
type RangeKey = '4w' | '8w' | '3m' | 'all'
type LiftKey = 'bench' | 'squat' | 'deadlift' | 'ohp'

function StatCard({ val, label, color }: { val: string; label: string; color?: string }) {
  return (
    <View style={s.statCard}>
      <Text style={[s.statVal, color ? { color } : {}]}>{val}</Text>
      <Text style={s.statLab}>{label}</Text>
    </View>
  )
}

function InsightCard({ text, type = 'purple' }: { text: string; type?: 'purple' | 'green' | 'amber' }) {
  const bg = type === 'green' ? colors.greenBg : type === 'amber' ? colors.amberBg : colors.purpleBg
  const border = type === 'green' ? colors.greenBorder : type === 'amber' ? colors.amberBorder : colors.purpleBorder
  const textColor = type === 'green' ? colors.greenText : type === 'amber' ? '#c9a040' : colors.purpleText
  const labelColor = type === 'green' ? colors.green : type === 'amber' ? colors.amber : colors.purple
  return (
    <View style={[s.insightCard, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[s.label, { color: labelColor, marginBottom: 4 }]}>SMART INSIGHT</Text>
      <Text style={{ fontSize: 13, color: textColor, lineHeight: 20 }}>{text}</Text>
    </View>
  )
}

export default function ProgressScreen({ navigation }: any) {
  const insets = useSafeAreaInsets()
  const { uid } = useAuthStore()
  const { profile } = useProfileStore()
  const { cycleCount } = useQueueStore()
  
  const [tab, setTab] = useState<MetricTab>('weight')
  const [range, setRange] = useState<RangeKey>('4w')
  const [lift, setLift] = useState<LiftKey>('bench')
  
  const [prs, setPrs] = useState<PR[]>([])
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [nutritionLogs, setNutritionLogs] = useState<NutritionLog[]>([])

  useEffect(() => {
    if (!uid) return
    fetchAllPRs(uid).then(setPrs)
    fetchRecentSessions(uid, 50).then(setSessions)
    fetchWeightHistory(uid).then(setWeightLogs)
    fetchRecentNutritionLogs(uid, 7).then(setNutritionLogs)
  }, [uid])

  // ── Header Data ──
  const weekNum = profile?.createdAt && profile.createdAt.toDate
    ? Math.max(1, differenceInWeeks(new Date(), profile.createdAt.toDate()) + 1)
    : 1
  const goalName = (profile?.goal?.replace('-', ' ') ?? 'lean bulk')
  const formattedGoal = goalName.charAt(0).toUpperCase() + goalName.slice(1)

  // ── WEIGHT TAB ──
  const rangePoints: Record<RangeKey, number> = { '4w': 28, '8w': 56, '3m': 90, 'all': Math.max(weightLogs.length, 7) }
  const recentWeights = useMemo(() => {
    const arr = weightLogs.slice(-Math.min(rangePoints[range], Math.max(weightLogs.length, 1)))
    if (arr.length === 0) return [profile?.weight ?? 54]
    return arr.map(w => w.weight)
  }, [weightLogs, range, profile])

  const weightLabels = useMemo(() => {
    if (weightLogs.length === 0) return ['Today']
    const slice = weightLogs.slice(-Math.min(rangePoints[range], weightLogs.length))
    return slice.map((w, i) => {
      if (i === 0 || i === Math.floor(slice.length / 2) || i === slice.length - 1) {
        return w.loggedAt ? format(w.loggedAt.toDate(), 'MMM d') : ''
      }
      return ''
    })
  }, [weightLogs, range])

  const currentWeight = recentWeights[recentWeights.length - 1]
  const bwChange = (currentWeight - recentWeights[0]).toFixed(1)
  const weightInsight = generateBulkInsight(recentWeights, profile?.targetCalories ?? 2700, profile?.targetCalories ?? 2700, profile?.goal ?? 'lean-bulk')

  const last4WeightLogs = [...weightLogs].reverse().slice(0, 4)

  // ── STRENGTH TAB ──
  const liftData = useMemo(() => {
    // Map lift keys to possible exercise names
    const nameMap: Record<LiftKey, string[]> = {
      bench: ['Bench Press', 'Barbell Bench Press', 'Dumbbell Bench Press'],
      squat: ['Squat', 'Barbell Squat', 'Hack Squat'],
      deadlift: ['Deadlift', 'Romanian Deadlift'],
      ohp: ['Overhead Press', 'Dumbbell Shoulder Press', 'OHP']
    }
    const targetNames = nameMap[lift]
    
    // Find PR
    const prMatch = prs.find(p => targetNames.includes(p.exerciseName))
    const prWeight = prMatch ? prMatch.weight : 0

    // Gather 1RM history from sessions (oldest to newest)
    const history1RM: number[] = []
    const reversedSessions = [...sessions].reverse()
    reversedSessions.forEach(s => {
      const ex = s.exercises.find(e => targetNames.includes(e.name))
      if (ex) {
        const completedSets = ex.sets.filter(set => set.done)
        if (completedSets.length > 0) {
          const bestSet = completedSets.sort((a, b) => b.weight - a.weight)[0]
          history1RM.push(estimateOneRepMax(bestSet.weight, bestSet.reps))
        }
      }
    })

    if (history1RM.length === 0) history1RM.push(0)
    const current1RM = history1RM[history1RM.length - 1]
    
    return {
      history: history1RM.slice(-8), // last 8 points
      pr: prWeight,
      current: current1RM
    }
  }, [lift, sessions, prs])

  const strengthLabels = liftData.history.map((_, i) => `S${i + 1}`)

  // ── VOLUME TAB ──
  const volumeData = useMemo(() => {
    const weeklyVolumes: Record<string, number> = {}
    let totalChest = 0, totalBack = 0, totalLegs = 0, totalShoulders = 0, totalArms = 0

    sessions.forEach(s => {
      const d = s.loggedAt ? s.loggedAt.toDate() : new Date()
      const weekStart = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      weeklyVolumes[weekStart] = (weeklyVolumes[weekStart] || 0) + s.totalVolume

      // Rough muscle group bucketing based on Day name for now
      const dn = s.dayName.toLowerCase()
      const vol = s.totalVolume
      if (dn.includes('push')) { totalChest += vol * 0.6; totalShoulders += vol * 0.3; totalArms += vol * 0.1 }
      else if (dn.includes('pull')) { totalBack += vol * 0.8; totalArms += vol * 0.2 }
      else if (dn.includes('leg')) { totalLegs += vol }
    })

    const sortedWeeks = Object.keys(weeklyVolumes).sort()
    const last8Weeks = sortedWeeks.slice(-8)
    const vols = last8Weeks.map(w => weeklyVolumes[w] / 1000) // convert to tonnes
    if (vols.length === 0) vols.push(0)

    const thisWeekVol = vols[vols.length - 1]
    const lastWeekVol = vols.length > 1 ? vols[vols.length - 2] : 0
    const change = lastWeekVol > 0 ? ((thisWeekVol - lastWeekVol) / lastWeekVol) * 100 : 0

    const totalAll = totalChest + totalBack + totalLegs + totalShoulders + totalArms
    const p = (v: number) => totalAll > 0 ? Math.round((v / totalAll) * 100) : 0

    return {
      vols,
      labels: last8Weeks.map((_, i) => `W${i + 1}`),
      thisWeek: thisWeekVol,
      change,
      muscleGroups: [
        { name: 'Chest', pct: p(totalChest) },
        { name: 'Back', pct: p(totalBack) },
        { name: 'Legs', pct: p(totalLegs) },
        { name: 'Shoulders', pct: p(totalShoulders) },
        { name: 'Arms', pct: p(totalArms) },
      ].sort((a, b) => b.pct - a.pct)
    }
  }, [sessions])

  // ── CALORIES TAB ──
  const calData = useMemo(() => {
    // Fill last 7 days
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = subDays(new Date(), 6 - i)
      const dStr = format(d, 'yyyy-MM-dd')
      const log = nutritionLogs.find(l => l.date === dStr)
      return {
        label: format(d, 'EEE'), // Mon, Tue...
        cals: log ? log.totalCalories : 0,
        protein: log ? log.totalProtein : 0
      }
    })

    const activeDays = days.filter(d => d.cals > 0)
    const avgCals = activeDays.length > 0 ? Math.round(activeDays.reduce((a, b) => a + b.cals, 0) / activeDays.length) : 0
    const avgPro = activeDays.length > 0 ? Math.round(activeDays.reduce((a, b) => a + b.protein, 0) / activeDays.length) : 0
    const target = profile?.targetCalories ?? 2700
    const diff = avgCals - target

    return { days, avgCals, avgPro, diff, target }
  }, [nutritionLogs, profile])

  return (
    <ScrollView style={[s.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      <View style={s.ph}>
        <Text style={s.muted}>Week {weekNum} · {formattedGoal}</Text>
        <Text style={s.title}>Progress</Text>
        <TouchableOpacity
        style={{
          position: 'absolute',
          right: 20,
          top: 16,
          backgroundColor: colors.bgCard,
          borderWidth: 0.5,
          borderColor: colors.border,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 8,
          minHeight: 40,
          justifyContent: 'center',
        }}
        onPress={() => navigation.navigate('PhotoProgress')}
        >
          <Text style={{ fontSize: 13, color: colors.titaniumMid }}>📸 Photos</Text>
        </TouchableOpacity>

        {/* Metric tabs */}
        <View style={s.tabRow}>
          {(['weight', 'strength', 'volume', 'calories'] as MetricTab[]).map(t => (
            <TouchableOpacity key={t} style={[s.tabItem, tab === t && s.tabItemOn]} onPress={() => setTab(t)}>
              <Text style={[s.tabText, tab === t && s.tabTextOn]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Range pills (weight + strength) */}
        {(tab === 'weight' || tab === 'strength') && (
          <View style={s.rangeRow}>
            {(['4w', '8w', '3m', 'all'] as RangeKey[]).map(r => (
              <TouchableOpacity key={r} style={[s.rangePill, range === r && s.rangePillOn]} onPress={() => setRange(r)}>
                <Text style={[s.rangeText, range === r && s.rangeTextOn]}>{r.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── WEIGHT TAB ── */}
        {tab === 'weight' && (
          <>
            <View style={s.grid2}>
              <StatCard val={`${currentWeight.toFixed(1)}kg`} label="current" />
              <StatCard val={`${parseFloat(bwChange) >= 0 ? '+' : ''}${bwChange}kg`} label={`change · ${range}`} color={parseFloat(bwChange) >= 0 ? colors.green : colors.red} />
              <StatCard
                val={String(Math.max(0, cycleCount - 1))}
                label="cycles completed"
                color={cycleCount > 1 ? colors.amber : undefined}
              />
            </View>
            <View style={s.chartCard}>
              <Text style={s.label}>BODY WEIGHT (KG)</Text>
              <LineChart
                data={{ labels: weightLabels.length > 0 ? weightLabels : [''], datasets: [{ data: recentWeights }] }}
                width={CHART_W - 32}
                height={160}
                chartConfig={chartConfig}
                bezier
                style={{ marginTop: spacing.sm, marginLeft: -12 }}
                withInnerLines
                withOuterLines={false}
              />
            </View>
            {profile?.smartBulkInsights !== false && <InsightCard text={weightInsight.message} />}
            
            {last4WeightLogs.length > 0 && (
              <View style={s.card}>
                <Text style={[s.label, { marginBottom: spacing.sm }]}>RECENT LOGS</Text>
                {last4WeightLogs.map((row, i) => {
                  const dStr = row.loggedAt ? format(row.loggedAt.toDate(), 'MMM d, yyyy') : 'Unknown'
                  return (
                    <View key={i} style={s.logRow}>
                      <Text style={s.body}>{dStr}</Text>
                      <View style={{ flexDirection: 'row', gap: spacing.lg }}>
                        <Text style={[s.body, { color: colors.titanium }]}>{row.weight}kg</Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            )}
          </>
        )}

        {/* ── STRENGTH TAB ── */}
        {tab === 'strength' && (
          <>
            {/* Lift selector */}
            <View style={s.rangeRow}>
              {(['bench', 'squat', 'deadlift', 'ohp'] as LiftKey[]).map(l => (
                <TouchableOpacity key={l} style={[s.rangePill, lift === l && s.rangePillOn]} onPress={() => setLift(l)}>
                  <Text style={[s.rangeText, lift === l && s.rangeTextOn]}>
                    {l.charAt(0).toUpperCase() + l.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.grid2}>
              <StatCard val={`${liftData.current}kg`} label="current 1RM est." />
              <StatCard val={`${liftData.pr}kg`} label="personal record" color={colors.amber} />
            </View>

            <View style={s.chartCard}>
              <Text style={s.label}>1RM ESTIMATE RECENT TREND</Text>
              <LineChart
                data={{ labels: strengthLabels.length > 0 ? strengthLabels : [''], datasets: [{ data: liftData.history, color: () => colors.amber }] }}
                width={CHART_W - 32}
                height={160}
                chartConfig={{ ...chartConfig, color: (opacity = 1) => `rgba(201, 160, 64, ${opacity})` }}
                bezier
                style={{ marginTop: spacing.sm, marginLeft: -12 }}
                withInnerLines
                withOuterLines={false}
              />
            </View>

            {/* PR board */}
            <View style={s.card}>
              <Text style={[s.label, { marginBottom: spacing.sm }]}>PERSONAL RECORDS</Text>
              {prs.length === 0 ? (
                <Text style={s.muted}>No PRs recorded yet. Finish a workout!</Text>
              ) : (
                prs.sort((a, b) => b.weight - a.weight).map((pr, i) => (
                  <View key={i} style={s.prRow}>
                    <Text style={s.body}>{pr.exerciseName}</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[s.body, { color: colors.titanium, fontWeight: '500' }]}>{pr.weight}kg</Text>
                      <Text style={s.muted}>× {pr.reps} reps</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {/* ── VOLUME TAB ── */}
        {tab === 'volume' && (
          <>
            <View style={s.grid2}>
              <StatCard val={`${volumeData.thisWeek.toFixed(1)}t`} label="this week" />
              <StatCard val={`${volumeData.change >= 0 ? '+' : ''}${volumeData.change.toFixed(1)}%`} label="vs last week" color={volumeData.change >= 0 ? colors.green : colors.red} />
            </View>

            <View style={s.chartCard}>
              <Text style={s.label}>WEEKLY VOLUME (TONNES)</Text>
              <BarChart
                data={{ labels: volumeData.labels.length > 0 ? volumeData.labels : [''], datasets: [{ data: volumeData.vols }] }}
                width={CHART_W - 32}
                height={160}
                chartConfig={{ ...chartConfig, color: (opacity = 1) => `rgba(74, 154, 68, ${opacity})` }}
                style={{ marginTop: spacing.sm, marginLeft: -12 }}
                withInnerLines
                showValuesOnTopOfBars={false}
                yAxisLabel=""
                yAxisSuffix="t"
              />
            </View>

            <View style={s.card}>
              <Text style={[s.label, { marginBottom: spacing.sm }]}>BY MUSCLE GROUP</Text>
              {volumeData.muscleGroups.map((mg, i) => (
                <View key={i} style={{ marginBottom: spacing.sm }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={s.body}>{mg.name}</Text>
                    <Text style={s.muted}>{mg.pct}%</Text>
                  </View>
                  <View style={{ height: 4, backgroundColor: colors.bgDeep, borderRadius: 2 }}>
                    <View style={{ height: 4, backgroundColor: colors.titaniumMid, borderRadius: 2, width: `${mg.pct}%` as any }} />
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── CALORIES TAB ── */}
        {tab === 'calories' && (
          <>
            <View style={s.grid2}>
              <StatCard val={`${calData.target}kcal`} label="daily target" />
              <StatCard val={`${calData.avgCals}kcal`} label="7-day avg" />
            </View>

            <View style={s.chartCard}>
              <Text style={s.label}>DAILY INTAKE — LAST 7 DAYS</Text>
              <BarChart
                data={{ labels: calData.days.map(d => d.label), datasets: [{ data: calData.days.map(d => Math.max(0, d.cals)) }] }}
                width={CHART_W - 32}
                height={160}
                chartConfig={chartConfig}
                style={{ marginTop: spacing.sm, marginLeft: -12 }}
                withInnerLines
                showValuesOnTopOfBars={false}
                yAxisLabel=""
                yAxisSuffix=""
              />
            </View>

            <View style={s.grid2}>
              <View style={s.statCard}>
                <Text style={s.statVal}>{calData.avgPro}<Text style={{ fontSize: 13, color: colors.textMuted }}>g</Text></Text>
                <Text style={s.statLab}>avg protein</Text>
              </View>
              <View style={s.statCard}>
                <Text style={[s.statVal, { color: calData.diff >= 0 ? colors.green : colors.amber }]}>
                  {calData.diff > 0 ? '+' : ''}{calData.diff}<Text style={{ fontSize: 13, color: colors.textMuted }}>kcal</Text>
                </Text>
                <Text style={s.statLab}>avg vs target</Text>
              </View>
            </View>

            {profile?.smartBulkInsights !== false && (
              <InsightCard 
                type={calData.diff < -200 ? 'amber' : 'green'}
                text={
                  calData.diff < -200 
                    ? `Averaging ${Math.abs(calData.diff)} kcal below target. Add a larger dinner or a mass shake to hit your goals.`
                    : `Averaging close to your target calories. Excellent consistency.`
                } 
              />
            )}
          </>
        )}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  ph: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  muted: { ...typography.small },
  title: { fontSize: 22, fontWeight: '500', color: colors.textPrimary, marginBottom: spacing.md },
  label: { fontSize: 11, color: colors.textMuted, letterSpacing: 1 },
  body: { fontSize: 14, color: colors.textPrimary },
  card: { backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
  chartCard: { backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },

  tabRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: colors.border, marginBottom: spacing.md },
  tabItem: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemOn: { borderBottomColor: colors.titaniumMid },
  tabText: { fontSize: 12, color: colors.textMuted },
  tabTextOn: { color: colors.titanium },

  rangeRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.md, flexWrap: 'wrap' },
  rangePill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.sm, backgroundColor: colors.bgDeep, borderWidth: 0.5, borderColor: colors.border },
  rangePillOn: { backgroundColor: colors.bgInset, borderColor: colors.borderMid },
  rangeText: { fontSize: 11, color: colors.textMuted },
  rangeTextOn: { color: colors.titanium },

  grid2: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  statCard: { flex: 1, backgroundColor: colors.bgDeep, borderRadius: radius.md, padding: spacing.md },
  statVal: { fontSize: 22, fontWeight: '500', color: colors.titanium },
  statLab: { ...typography.small, marginTop: 2 },

  insightCard: { borderWidth: 0.5, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#1a1e28' },
  prRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#1a1e28' },
})
