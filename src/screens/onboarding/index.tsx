import React, { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, spacing, radius, typography } from '../../theme'
import { useProfileStore } from '../../store/index'
import { calculateCaloricTarget } from '../../utils/progressiveOverload'

// ─── Shared Components ────────────────────────────────────────────────────────

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={ob.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[ob.dot, i === current && ob.dotOn, i < current && ob.dotDone]} />
      ))}
    </View>
  )
}

function OptionCard({ icon, title, sub, selected, onPress }: {
  icon: string; title: string; sub: string; selected: boolean; onPress: () => void
}) {
  return (
    <TouchableOpacity style={[ob.option, selected && ob.optionSel]} onPress={onPress} activeOpacity={0.7}>
      <View style={[ob.optionIcon, selected && ob.optionIconSel]}>
        <Text style={{ fontSize: 20 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={ob.optionTitle}>{title}</Text>
        <Text style={ob.optionSub}>{sub}</Text>
      </View>
      {selected && <View style={ob.checkDot} />}
    </TouchableOpacity>
  )
}

function PrimBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={ob.primBtn} onPress={onPress} activeOpacity={0.85}>
      <Text style={ob.primBtnText}>{label}</Text>
    </TouchableOpacity>
  )
}

function Stepper({ label, value, unit, onDec, onInc }: {
  label: string; value: string | number; unit: string; onDec: () => void; onInc: () => void
}) {
  return (
    <View style={ob.stepperRow}>
      <Text style={ob.stepperLabel}>{label}</Text>
      <View style={ob.stepperRight}>
        <TouchableOpacity style={ob.stepBtn} onPress={onDec}><Text style={ob.stepBtnText}>−</Text></TouchableOpacity>
        <Text style={ob.stepVal}>{value}<Text style={ob.stepUnit}> {unit}</Text></Text>
        <TouchableOpacity style={ob.stepBtn} onPress={onInc}><Text style={ob.stepBtnText}>+</Text></TouchableOpacity>
      </View>
    </View>
  )
}

const ob = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  ph: { flex: 1, paddingHorizontal: spacing.lg },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', paddingVertical: spacing.lg },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.bgInset },
  dotOn: { width: 18, borderRadius: 3, backgroundColor: colors.titaniumMid },
  dotDone: { backgroundColor: colors.bgInset },
  label: { fontSize: 11, color: colors.textMuted, letterSpacing: 1, marginBottom: 4 },
  step: { fontSize: 13, color: colors.textMuted, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '500', color: colors.textPrimary, lineHeight: 36, marginBottom: 6 },
  sub: { fontSize: 14, color: colors.textMuted, lineHeight: 22, marginBottom: spacing.xl },
  option: { backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  optionSel: { borderColor: colors.titaniumMid, backgroundColor: '#1a1e28' },
  optionIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center' },
  optionIconSel: { backgroundColor: colors.bgInset },
  optionTitle: { fontSize: 14, fontWeight: '500', color: colors.textPrimary },
  optionSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  checkDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.titanium },
  primBtn: { backgroundColor: colors.titanium, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.sm },
  primBtnText: { fontSize: 15, fontWeight: '500', color: colors.bg },
  card: { backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 0.5, borderBottomColor: colors.bgInset },
  stepperLabel: { fontSize: 14, color: colors.textPrimary },
  stepperRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepBtn: { width: 34, height: 34, borderRadius: 9, backgroundColor: colors.bgDeep, borderWidth: 0.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 20, color: colors.titaniumMid, lineHeight: 24 },
  stepVal: { fontSize: 20, fontWeight: '500', color: colors.titanium, minWidth: 70, textAlign: 'center' },
  stepUnit: { fontSize: 13, color: colors.textMuted },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.bgInset },
})

// ─── Splash ───────────────────────────────────────────────────────────────────

export function SplashScreen({ navigation }: any) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[ob.container, { paddingTop: insets.top }]}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl }}>
        <Text style={{ fontSize: 52, fontWeight: '500', color: colors.titanium, letterSpacing: 10, marginBottom: 8 }}>IRON</Text>
        <View style={{ width: 40, height: 1, backgroundColor: colors.bgInset, marginBottom: spacing.xl }} />
        <Text style={{ fontSize: 11, color: colors.textMuted, letterSpacing: 3, marginBottom: spacing.xl }}>FORGE YOUR STRUCTURE</Text>
        <Text style={{ fontSize: 13, color: colors.titaniumFaint, textAlign: 'center', lineHeight: 22, maxWidth: 260 }}>
          A lifting journal with titanium bones. Built for progression, not aesthetics.
        </Text>
      </View>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.lg }}>
        <PrimBtn label="Get started" onPress={() => navigation.navigate('Goal')} />
        <TouchableOpacity style={{ padding: spacing.md, alignItems: 'center' }} onPress={() => {
          // Placeholder for sign in flow
        }}>
          <Text style={{ fontSize: 14, color: colors.textMuted }}>I already have an account</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─── Goal ─────────────────────────────────────────────────────────────────────

export function GoalScreen({ navigation }: any) {
  const insets = useSafeAreaInsets()
  const { setProfile } = useProfileStore()
  const [selected, setSelected] = useState<string>('lean-bulk')
  const goals = [
    { id: 'lean-bulk', icon: '📈', title: 'Lean bulk', sub: 'Build mass, minimal fat gain' },
    { id: 'cut', icon: '🔥', title: 'Cut', sub: 'Lose fat, preserve muscle' },
    { id: 'maintain', icon: '⚖️', title: 'Maintain', sub: 'Stay here, get stronger' },
    { id: 'aggressive-bulk', icon: '⚡', title: 'Aggressive bulk', sub: 'Maximum mass, fast' },
  ]
  return (
    <View style={[ob.container, { paddingTop: insets.top }]}>
      <View style={ob.ph}>
        <ProgressDots total={4} current={0} />
        <Text style={ob.step}>Step 1 of 4</Text>
        <Text style={ob.title}>What's your{'\n'}goal?</Text>
        <Text style={ob.sub}>This shapes your calorie targets and progression speed.</Text>
        {goals.map(g => (
          <OptionCard key={g.id} icon={g.icon} title={g.title} sub={g.sub} selected={selected === g.id} onPress={() => setSelected(g.id)} />
        ))}
      </View>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.lg }}>
        <PrimBtn label="Continue" onPress={() => { setProfile({ goal: selected as any }); navigation.navigate('Level') }} />
      </View>
    </View>
  )
}

// ─── Level ────────────────────────────────────────────────────────────────────

export function LevelScreen({ navigation }: any) {
  const insets = useSafeAreaInsets()
  const { setProfile } = useProfileStore()
  const [selected, setSelected] = useState<string>('intermediate')
  const levels = [
    { id: 'beginner', icon: '🌱', title: 'Beginner', sub: 'Under 1 year lifting' },
    { id: 'intermediate', icon: '🏋️', title: 'Intermediate', sub: '1–4 years, consistent training' },
    { id: 'advanced', icon: '🏆', title: 'Advanced', sub: '4+ years, track everything' },
  ]
  return (
    <View style={[ob.container, { paddingTop: insets.top }]}>
      <View style={ob.ph}>
        <ProgressDots total={4} current={1} />
        <Text style={ob.step}>Step 2 of 4</Text>
        <Text style={ob.title}>Training{'\n'}level?</Text>
        <Text style={ob.sub}>Sets how aggressively IRON pushes your progression.</Text>
        {levels.map(l => (
          <OptionCard key={l.id} icon={l.icon} title={l.title} sub={l.sub} selected={selected === l.id} onPress={() => setSelected(l.id)} />
        ))}
      </View>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.lg }}>
        <PrimBtn label="Continue" onPress={() => { setProfile({ level: selected as any }); navigation.navigate('Stats') }} />
      </View>
    </View>
  )
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function StatsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets()
  const { profile, setProfile } = useProfileStore()
  const [weight, setWeight] = useState(profile?.weight ?? 54)
  const [height, setHeight] = useState(profile?.height ?? 172)
  const [age, setAge] = useState(profile?.age ?? 22)
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg')

  return (
    <ScrollView style={[ob.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      <View style={ob.ph}>
        <ProgressDots total={4} current={2} />
        <Text style={ob.step}>Step 3 of 4</Text>
        <Text style={ob.title}>Your stats.</Text>
        <Text style={ob.sub}>Used to calculate your daily targets.</Text>
        <View style={ob.card}>
          <Stepper label="Body weight" value={weight} unit={unit} onDec={() => setWeight(w => Math.max(30, parseFloat((w - 0.5).toFixed(1))))} onInc={() => setWeight(w => parseFloat((w + 0.5).toFixed(1)))} />
          <Stepper label="Height" value={height} unit="cm" onDec={() => setHeight(h => Math.max(100, h - 1))} onInc={() => setHeight(h => h + 1)} />
          <Stepper label="Age" value={age} unit="yr" onDec={() => setAge(a => Math.max(16, a - 1))} onInc={() => setAge(a => a + 1)} />
        </View>
        <View style={ob.card}>
          <Text style={[ob.label, { marginBottom: spacing.sm }]}>UNITS</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {(['kg', 'lb'] as const).map(u => (
              <TouchableOpacity key={u} style={[{ flex: 1, padding: spacing.md, borderRadius: radius.sm, backgroundColor: unit === u ? colors.bgInset : colors.bgDeep, alignItems: 'center' }]} onPress={() => setUnit(u)}>
                <Text style={{ fontSize: 14, color: unit === u ? colors.titanium : colors.textMuted }}>{u.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.lg }}>
        <PrimBtn label="Continue" onPress={() => { setProfile({ weight, height, age, units: unit }); navigation.navigate('Targets') }} />
      </View>
    </ScrollView>
  )
}

// ─── Targets ──────────────────────────────────────────────────────────────────

export function TargetsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets()
  const { profile, setProfile } = useProfileStore()
  const calculated = calculateCaloricTarget(profile?.weight ?? 54, profile?.height ?? 172, profile?.age ?? 22, profile?.goal ?? 'lean-bulk')
  const [protein, setProtein] = useState(calculated.protein)
  const [water, setWater] = useState(4.0)

  return (
    <ScrollView style={[ob.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      <View style={ob.ph}>
        <ProgressDots total={4} current={3} />
        <Text style={ob.step}>Step 4 of 4</Text>
        <Text style={ob.title}>Your targets.</Text>
        <Text style={ob.sub}>Calculated for {profile?.goal?.replace('-', ' ') ?? 'lean bulk'} at {profile?.weight ?? 54}kg. Adjust if needed.</Text>
        <View style={[ob.card, { backgroundColor: colors.greenBg, borderColor: colors.greenBorder }]}>
          <Text style={[ob.label, { color: colors.green, marginBottom: 4 }]}>DAILY CALORIES</Text>
          <Text style={{ fontSize: 42, fontWeight: '500', color: colors.titanium }}>{calculated.calories}</Text>
          <Text style={{ fontSize: 12, color: colors.green, marginTop: 4 }}>
            {profile?.goal === 'cut' ? '–400 kcal deficit below maintenance' : 
             profile?.goal === 'maintain' ? 'Maintenance calories' : 
             profile?.goal === 'aggressive-bulk' ? '+500 kcal surplus above maintenance' :
             '+250 kcal surplus above maintenance'}
          </Text>
        </View>
        <View style={ob.card}>
          <Stepper label="Protein" value={protein} unit="g" onDec={() => setProtein(p => Math.max(50, p - 5))} onInc={() => setProtein(p => p + 5)} />
          <Stepper label="Water" value={water.toFixed(1)} unit="L" onDec={() => setWater(w => Math.max(1, parseFloat((w - 0.5).toFixed(1))))} onInc={() => setWater(w => parseFloat((w + 0.5).toFixed(1)))} />
        </View>
      </View>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.lg }}>
        <PrimBtn label="Continue" onPress={() => {
          setProfile({
            targetCalories: calculated.calories,
            targetProtein: protein,
            targetWater: water,
            notifications: false,
            autoProgressiveOverload: true,
          })
          navigation.navigate('Ready')
        }} />
      </View>
    </ScrollView>
  )
}

// ─── Ready ────────────────────────────────────────────────────────────────────

export function ReadyScreen({ navigation }: any) {
  const insets = useSafeAreaInsets()
  const { profile, setProfile, saveProfile } = useProfileStore()

  return (
    <View style={[ob.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, alignItems: 'center' }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.greenBg, borderWidth: 0.5, borderColor: colors.greenBorder, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl }}>
            <Text style={{ fontSize: 32 }}>✓</Text>
          </View>
          <Text style={[ob.title, { textAlign: 'center' }]}>You're ready.</Text>
          <Text style={[ob.sub, { textAlign: 'center' }]}>
            IRON is configured. The split is loaded.{'\n'}The only thing missing is you showing up.
          </Text>
          <View style={[ob.card, { width: '100%', alignSelf: 'stretch' }]}>
            <Text style={[ob.label, { marginBottom: spacing.sm }]}>YOUR SETUP</Text>
            {[
              { label: 'Goal', val: profile?.goal?.replace('-', ' ') ?? 'lean bulk' },
              { label: 'Level', val: profile?.level ?? 'Intermediate' },
              { label: 'Weight', val: `${profile?.weight ?? 54} kg` },
              { label: 'Calories', val: `${profile?.targetCalories ?? 2700} kcal` },
              { label: 'Protein', val: `${profile?.targetProtein ?? 110}g` },
              { label: 'Split', val: 'PPL × 2' },
            ].map((r, i) => (
              <View key={i} style={ob.summaryRow}>
                <Text style={{ fontSize: 13, color: colors.textPrimary }}>{r.label}</Text>
                <Text style={{ fontSize: 13, color: colors.titaniumMid }}>{r.val}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.lg }}>
        <PrimBtn label="Enter IRON" onPress={async () => {
          setProfile({
            gender: profile?.gender ?? 'male',
            notifications: false,
            autoProgressiveOverload: profile?.autoProgressiveOverload ?? true,
          })
          await saveProfile()
        }} />
      </View>
    </View>
  )
}

export default { SplashScreen, GoalScreen, LevelScreen, StatsScreen, TargetsScreen, ReadyScreen }
