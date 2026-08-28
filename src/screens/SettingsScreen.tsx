import React, { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  Switch, StyleSheet, Alert
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, spacing, radius, typography } from '../theme'
import { useProfileStore, useAuthStore } from '../store/index'
import { calculateCaloricTarget } from '../utils/progressiveOverload'
import { setupAllNotifications, cancelAllNotifications } from '../services/notifications'
import { useFontSize, type FontSizeKey } from '../context/FontSizeContext'

function Row({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} disabled={!onPress}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowVal}>{value ?? '—'}</Text>
    </TouchableOpacity>
  )
}

function ToggleRow({ label, sub, value, onChange }: {
  label: string; sub?: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <View style={s.row}>
      <View style={{ flex: 1 }}>
        <Text style={s.rowLabel}>{label}</Text>
        {sub && <Text style={s.rowSub}>{sub}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.bgInset, true: colors.greenBg }}
        thumbColor={value ? colors.green : colors.titaniumFaint}
        ios_backgroundColor={colors.bgInset}
      />
    </View>
  )
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={s.sectionHeader}>{title}</Text>
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const { profile, setProfile, saveProfile } = useProfileStore()
  const { uid } = useAuthStore()
  const { size: fontSize, setSize: setFontSize } = useFontSize()

  const [notifWorkout, setNotifWorkout] = useState(true)
  const [notifProtein, setNotifProtein] = useState(true)
  const [notifWater, setNotifWater] = useState(false)
  const [notifLeg, setNotifLeg] = useState(true)
  const [autoOverload, setAutoOverload] = useState(true)
  const [smartInsights, setSmartInsights] = useState(true)

  const goals: Record<string, string> = {
    'lean-bulk': 'Lean bulk',
    'cut': 'Cut',
    'maintain': 'Maintain',
    'aggressive-bulk': 'Aggressive bulk',
  }

  const levels: Record<string, string> = {
    'beginner': 'Beginner',
    'intermediate': 'Intermediate',
    'advanced': 'Advanced',
  }

  async function handleNotifChange(key: string, val: boolean) {
    const prefs = {
      workoutReminders: key === 'workout' ? val : notifWorkout,
      proteinCheck: key === 'protein' ? val : notifProtein,
      hydrationNudge: key === 'water' ? val : notifWater,
      legDayReminder: key === 'leg' ? val : notifLeg,
    }
    if (Object.values(prefs).some(Boolean)) {
      await setupAllNotifications(prefs)
    } else {
      await cancelAllNotifications()
    }
  }

  async function handleWeightChange(delta: number) {
    const current = profile?.weight ?? 54
    const next = Math.max(30, Math.min(200, parseFloat((current + delta).toFixed(1))))
    setProfile({ weight: next })
    // Recalculate targets
    const targets = calculateCaloricTarget(next, profile?.height ?? 172, profile?.age ?? 22, profile?.goal ?? 'lean-bulk')
    setProfile({ targetCalories: targets.calories, targetProtein: targets.protein })
    await saveProfile()
  }

  return (
    <ScrollView style={[s.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      <View style={s.ph}>
        <Text style={s.title}>Settings</Text>

        {/* Profile card */}
        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{uid?.slice(0, 2).toUpperCase() ?? 'U'}</Text>
          </View>
          <View>
            <Text style={s.profileName}>Your profile</Text>
            <Text style={s.profileSub}>{profile?.weight ?? 54}kg · {levels[profile?.level ?? 'intermediate']}</Text>
          </View>
        </View>

        {/* GOAL + LEVEL */}
        <SectionHeader title="TRAINING" />
        <View style={s.card}>
          <Row label="Goal" value={goals[profile?.goal ?? 'lean-bulk']} />
          <Row label="Training level" value={levels[profile?.level ?? 'intermediate']} />
          <Row label="Split" value="PPL × 2" />
        </View>

        {/* BODY STATS */}
        <SectionHeader title="BODY STATS" />
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.rowLabel}>Body weight</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <TouchableOpacity style={s.stepBtn} onPress={() => handleWeightChange(-0.5)}>
                <Text style={s.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={s.rowVal}>{profile?.weight ?? 54} kg</Text>
              <TouchableOpacity style={s.stepBtn} onPress={() => handleWeightChange(0.5)}>
                <Text style={s.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Row label="Height" value={`${profile?.height ?? 172} cm`} />
          <Row label="Age" value={`${profile?.age ?? 22}`} />
          <Row label="Units" value={profile?.units === 'lb' ? 'LBS' : 'KG'} />
        </View>

        {/* TARGETS */}
        <SectionHeader title="DAILY TARGETS" />
        <View style={s.card}>
          <Row label="Calories" value={`${profile?.targetCalories ?? 2700} kcal`} />
          <Row label="Protein" value={`${profile?.targetProtein ?? 110}g`} />
          <Row label="Water" value="4.0 L" />
          <TouchableOpacity
            style={[s.recalcBtn]}
            onPress={() => {
              const t = calculateCaloricTarget(profile?.weight ?? 54, profile?.height ?? 172, profile?.age ?? 22, profile?.goal ?? 'lean-bulk')
              setProfile({ targetCalories: t.calories, targetProtein: t.protein })
              saveProfile()
              Alert.alert('Targets updated', `Calories: ${t.calories} kcal\nProtein: ${t.protein}g`)
            }}
          >
            <Text style={s.recalcText}>Recalculate targets</Text>
          </TouchableOpacity>
        </View>

        {/* SYSTEM */}
        <SectionHeader title="SYSTEM" />
        <View style={s.card}>
          <ToggleRow
            label="Auto progressive overload"
            sub="Suggests weight increases automatically"
            value={autoOverload}
            onChange={setAutoOverload}
          />
          <ToggleRow
            label="Smart bulk insights"
            sub="Weight trend analysis and calorie tips"
            value={smartInsights}
            onChange={setSmartInsights}
          />
        </View>

        {/* NOTIFICATIONS */}
        <SectionHeader title="NOTIFICATIONS" />
        <View style={s.card}>
          <ToggleRow
            label="Workout reminders"
            sub='"Push day waiting."'
            value={notifWorkout}
            onChange={async (v) => { setNotifWorkout(v); await handleNotifChange('workout', v) }}
          />
          <ToggleRow
            label="Protein check"
            sub='"Protein target incomplete."'
            value={notifProtein}
            onChange={async (v) => { setNotifProtein(v); await handleNotifChange('protein', v) }}
          />
          <ToggleRow
            label="Hydration nudge"
            sub='"Hydrate."'
            value={notifWater}
            onChange={async (v) => { setNotifWater(v); await handleNotifChange('water', v) }}
          />
          <ToggleRow
            label="Leg day reminder"
            sub='"Leg day remembers."'
            value={notifLeg}
            onChange={async (v) => { setNotifLeg(v); await handleNotifChange('leg', v) }}
          />
        </View>

        {/* APPEARANCE */}
        <SectionHeader title="APPEARANCE" />
        <View style={s.card}>
          <Row label="Theme" value="Titanium" />
          <View style={s.themeRow}>
            {[colors.bg, colors.bgCard, colors.titaniumMid, colors.titanium, colors.textPrimary].map((c, i) => (
              <View key={i} style={[s.swatch, { backgroundColor: c }]} />
            ))}
            <Text style={s.themeLabel}>Titanium</Text>
          </View>

          {/* Text size segmented control */}
          <View style={s.row}>
            <Text style={s.rowLabel}>Text size</Text>
            <View style={s.segControl}>
              {(['small', 'medium', 'large', 'extraLarge'] as FontSizeKey[]).map((key) => {
                const labels: Record<FontSizeKey, string> = {
                  small: 'S', medium: 'M', large: 'L', extraLarge: 'XL',
                }
                const isActive = fontSize === key
                return (
                  <TouchableOpacity
                    key={key}
                    style={[s.segBtn, isActive && s.segBtnActive]}
                    onPress={() => setFontSize(key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.segBtnText, isActive && s.segBtnTextActive]}>
                      {labels[key]}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        </View>

        {/* DANGER ZONE */}
        <SectionHeader title="DATA" />
        <View style={s.card}>
          <TouchableOpacity style={s.row} onPress={() =>
            Alert.alert('Export data', 'Export all session and nutrition data as JSON?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Export', onPress: () => {
                Alert.alert('Exporting', 'Data export to JSON is not implemented yet.')
              } },
            ])
          }>
            <Text style={s.rowLabel}>Export data</Text>
            <Text style={[s.rowVal, { color: colors.titaniumMid }]}>JSON →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.row} onPress={() =>
            Alert.alert('Reset app', 'This will clear all local data. Firebase data stays intact.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Reset', style: 'destructive', onPress: () => {
                Alert.alert('Reset', 'Local app data reset is not implemented yet.')
              } },
            ])
          }>
            <Text style={[s.rowLabel, { color: colors.red }]}>Reset app data</Text>
            <Text style={[s.rowVal, { color: colors.red }]}>⚠</Text>
          </TouchableOpacity>
        </View>

        <Text style={[s.muted, { textAlign: 'center', paddingVertical: spacing.xl }]}>
          IRON v1.0.0 · Built for progression.
        </Text>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  ph: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  title: { fontSize: 22, fontWeight: '500', color: colors.textPrimary, marginBottom: spacing.lg },
  muted: { ...typography.small },

  profileCard: { backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.bgInset, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '500', color: colors.titanium },
  profileName: { fontSize: 15, fontWeight: '500', color: colors.textPrimary },
  profileSub: { ...typography.small, marginTop: 2 },

  sectionHeader: { fontSize: 11, color: colors.textMuted, letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.md },
  card: { backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 0.5, borderBottomColor: colors.bgInset },
  rowLabel: { fontSize: 14, color: colors.textPrimary, flex: 1 },
  rowSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  rowVal: { fontSize: 14, color: colors.titaniumMid },

  stepBtn: { width: 28, height: 28, borderRadius: 7, backgroundColor: colors.bgDeep, borderWidth: 0.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 18, color: colors.titaniumMid, lineHeight: 22 },

  recalcBtn: { padding: spacing.md, alignItems: 'center' },
  recalcText: { fontSize: 13, color: colors.titaniumMid },

  themeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: spacing.md },
  swatch: { width: 20, height: 20, borderRadius: 10, borderWidth: 0.5, borderColor: colors.border },
  themeLabel: { fontSize: 12, color: colors.textMuted, marginLeft: 4 },

  /** Segmented control container for text-size picker */
  segControl: { flexDirection: 'row', gap: 4 },
  /** Individual segment button */
  segBtn: {
    width: 34,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.bgDeep,
    borderWidth: 0.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segBtnActive: { backgroundColor: colors.titanium, borderColor: colors.titanium },
  segBtnText: { fontSize: 11, fontWeight: '500', color: colors.textMuted },
  segBtnTextActive: { color: colors.bg },
})
