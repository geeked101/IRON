import React, { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, Modal, Alert, ActivityIndicator
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, spacing, radius, typography } from '../../theme'
import { useProfileStore, useAuthStore } from '../../store/index'
import { calculateCaloricTarget } from '../../utils/progressiveOverload'
import GoogleSignInButton from '../../components/GoogleSignInButton'
import { dbGetAnyUserProfile } from '../../services/localDb'

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

function Stepper({ label, value, unit, onDec, onInc, onChange }: {
  label: string
  value: string | number
  unit: string
  onDec: () => void
  onInc: () => void
  onChange?: (val: number) => void
}) {
  const [text, setText] = useState(String(value))

  useEffect(() => {
    setText(String(value))
  }, [value])

  const handleBlur = () => {
    const parsed = parseFloat(text)
    if (!isNaN(parsed) && parsed > 0 && onChange) {
      onChange(parsed)
    } else {
      setText(String(value))
    }
  }

  return (
    <View style={ob.stepperRow}>
      <Text style={ob.stepperLabel}>{label}</Text>
      <View style={ob.stepperRight}>
        <TouchableOpacity style={ob.stepBtn} onPress={onDec} activeOpacity={0.7}>
          <Text style={ob.stepBtnText}>−</Text>
        </TouchableOpacity>
        <View style={ob.stepInputContainer}>
          <TextInput
            style={ob.stepInput}
            value={text}
            onChangeText={(t) => {
              setText(t)
              const num = parseFloat(t)
              if (!isNaN(num) && onChange) {
                onChange(num)
              }
            }}
            onBlur={handleBlur}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
          <Text style={ob.stepUnit}>{unit}</Text>
        </View>
        <TouchableOpacity style={ob.stepBtn} onPress={onInc} activeOpacity={0.7}>
          <Text style={ob.stepBtnText}>+</Text>
        </TouchableOpacity>
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
  stepperRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepBtn: { width: 36, height: 36, borderRadius: 9, backgroundColor: colors.bgDeep, borderWidth: 0.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 20, color: colors.titaniumMid, lineHeight: 24 },
  stepInputContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minWidth: 80, backgroundColor: colors.bgDeep, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, height: 36 },
  stepInput: { fontSize: 16, fontWeight: '500', color: colors.titanium, textAlign: 'center', minWidth: 40, padding: 0 },
  stepUnit: { fontSize: 12, color: colors.textMuted, marginLeft: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.bgInset },
})

// ─── Splash ───────────────────────────────────────────────────────────────────

export function SplashScreen({ navigation }: any) {
  const insets = useSafeAreaInsets()
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [authTab, setAuthTab] = useState<'google' | 'email' | 'restore'>('google')
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)

  async function handleEmailAuth() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter both email address and password.')
      return
    }
    setEmailLoading(true)
    try {
      const { signInWithEmail, signUpWithEmail, fetchUserProfile } = await import('../../services/firebase')
      let user
      if (isSignUp) {
        user = await signUpWithEmail(email.trim(), password)
      } else {
        user = await signInWithEmail(email.trim(), password)
      }

      useAuthStore.getState().setUid(user.uid)

      const remoteProfile = await fetchUserProfile(user.uid)
      if (remoteProfile) {
        useProfileStore.getState().setProfile(remoteProfile)
      } else if (useProfileStore.getState().profile) {
        await useProfileStore.getState().saveProfile()
      }

      setShowAccountModal(false)
      useAuthStore.getState().setOnboarded(true)
      Alert.alert('Welcome!', `Signed in successfully as ${user.email}`)
    } catch (err: any) {
      console.error('[EmailAuth] Error:', err)
      Alert.alert('Authentication Failed', err.message || 'Could not sign in with email/password.')
    } finally {
      setEmailLoading(false)
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address to receive a password reset link.')
      return
    }
    try {
      const { sendPasswordReset } = await import('../../services/firebase')
      await sendPasswordReset(email.trim())
      Alert.alert('Password Reset Sent', `A password reset link has been sent to ${email.trim()}.`)
    } catch (err: any) {
      Alert.alert('Reset Failed', err.message || 'Could not send password reset email.')
    }
  }

  async function handleRestoreLocal() {
    const existing = dbGetAnyUserProfile()
    if (existing?.goal) {
      useProfileStore.getState().setProfile(existing)
      if (existing.uid) {
        useAuthStore.getState().setUid(existing.uid)
      }
      useAuthStore.getState().setOnboarded(true)
      setShowAccountModal(false)
    } else {
      Alert.alert(
        'No Existing Profile Found',
        'No saved profile was found on this device.\n\nWould you like to auto-repair with default values or start fresh?',
        [
          { text: 'Start Setup', style: 'cancel', onPress: () => setShowAccountModal(false) },
          {
            text: 'Create Local Profile',
            onPress: async () => {
              const defaultProfile = {
                uid: `local_${Date.now()}`,
                goal: 'maintain' as const,
                level: 'intermediate' as const,
                gender: 'male' as const,
                weightKg: 75,
                heightCm: 175,
                age: 25,
                caloricTarget: 2500,
                proteinTarget: 160,
                carbsTarget: 250,
                fatTarget: 70,
                units: 'kg' as const,
                notifications: true,
                notificationPrefs: { workoutReminders: true, proteinCheck: true, hydrationNudge: false, legDayReminder: false },
                autoProgressiveOverload: true,
                smartBulkInsights: true,
                fontSize: 'medium' as const,
              }
              useProfileStore.getState().setProfile(defaultProfile)
              await useProfileStore.getState().saveProfile()
              useAuthStore.getState().setUid(defaultProfile.uid)
              useAuthStore.getState().setOnboarded(true)
              setShowAccountModal(false)
            },
          },
        ]
      )
    }
  }

  return (
    <View style={[ob.container, { paddingTop: insets.top }]}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl }}>
        <Text style={{ fontSize: 52, fontWeight: '500', color: colors.titanium, letterSpacing: 10, marginBottom: 8 }}>IRON</Text>
        <View style={{ width: 40, height: 1, backgroundColor: colors.bgInset, marginBottom: spacing.xl }} />
        <Text style={{ fontSize: 11, color: colors.textMuted, letterSpacing: 3, marginBottom: spacing.xl }}>FORGE YOUR STRUCTURE</Text>
        <Text style={{ fontSize: 13, color: colors.titaniumFaint, textAlign: 'center', lineHeight: 22, maxWidth: 260 }}>
          Build your personalized lifting plan in 60 seconds.
        </Text>
      </View>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.lg }}>
        <PrimBtn label="Build My Training Plan →" onPress={() => navigation.navigate('Goal')} />
        <TouchableOpacity
          style={{ padding: spacing.md, alignItems: 'center' }}
          onPress={() => setShowAccountModal(true)}
        >
          <Text style={{ fontSize: 14, color: colors.textMuted }}>I already have an account</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showAccountModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAccountModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, borderWidth: 0.5, borderColor: colors.border }}>
            <Text style={{ fontSize: 20, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 }}>Account Recovery & Sign In</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 18, marginBottom: spacing.md }}>
              Access your cloud profile or restore local device logs.
            </Text>

            {/* Sub-tabs */}
            <View style={{ flexDirection: 'row', backgroundColor: colors.bgDeep, borderRadius: radius.md, padding: 3, marginBottom: spacing.lg }}>
              {(['google', 'email', 'restore'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    alignItems: 'center',
                    borderRadius: radius.sm,
                    backgroundColor: authTab === tab ? colors.bgCard : 'transparent',
                  }}
                  onPress={() => setAuthTab(tab)}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: authTab === tab ? colors.titanium : colors.textMuted }}>
                    {tab === 'google' ? 'Google' : tab === 'email' ? 'Email' : 'Device'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {authTab === 'google' && (
              <GoogleSignInButton
                label="Sign in with Google"
                onSuccess={() => {
                  setShowAccountModal(false)
                  useAuthStore.getState().setOnboarded(true)
                }}
              />
            )}

            {authTab === 'email' && (
              <View>
                <TextInput
                  style={{ backgroundColor: colors.bgDeep, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.textPrimary, marginBottom: spacing.sm }}
                  placeholder="Email Address"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
                <TextInput
                  style={{ backgroundColor: colors.bgDeep, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.textPrimary, marginBottom: spacing.sm }}
                  placeholder="Password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  style={{ backgroundColor: colors.titanium, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginTop: 4 }}
                  onPress={handleEmailAuth}
                  disabled={emailLoading}
                >
                  {emailLoading ? (
                    <ActivityIndicator color={colors.bg} size="small" />
                  ) : (
                    <Text style={{ fontWeight: '600', color: colors.bg }}>
                      {isSignUp ? 'Create Cloud Account' : 'Sign In with Email'}
                    </Text>
                  )}
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md }}>
                  <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
                    <Text style={{ fontSize: 12, color: colors.titaniumMid }}>
                      {isSignUp ? 'Already have account? Sign In' : 'Need account? Register'}
                    </Text>
                  </TouchableOpacity>

                  {!isSignUp && (
                    <TouchableOpacity onPress={handleForgotPassword}>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>Forgot Password?</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {authTab === 'restore' && (
              <View>
                <TouchableOpacity
                  style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.titanium, alignItems: 'center' }}
                  onPress={handleRestoreLocal}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.bg }}>Restore SQLite Device Logs</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 8 }}>
                  Scans device storage for offline profiles created without cloud sign-in.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={{ marginTop: spacing.lg, alignItems: 'center' }}
              onPress={() => setShowAccountModal(false)}
            >
              <Text style={{ fontSize: 14, color: colors.textMuted }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

// ─── Step 1: Goal ─────────────────────────────────────────────────────────────

export function GoalScreen({ navigation }: any) {
  const insets = useSafeAreaInsets()
  const { setProfile } = useProfileStore()
  const [selected, setSelected] = useState<string>('lean-bulk')

  const goals = [
    { id: 'lean-bulk', icon: '📈', title: 'Build Muscle', sub: 'Gain lean mass with controlled surplus' },
    { id: 'aggressive-bulk', icon: '⚡', title: 'Get Stronger', sub: 'Maximize raw strength & 1RM progression' },
    { id: 'cut', icon: '🔥', title: 'Lose Fat', sub: 'Burn fat while preserving muscle mass' },
    { id: 'maintain', icon: '⚖️', title: 'Maintain', sub: 'Stay here, optimize performance' },
  ]

  function handleSelectGoal(goalId: string) {
    setSelected(goalId)
    setProfile({ goal: goalId as any })
    navigation.navigate('Level')
  }

  return (
    <View style={[ob.container, { paddingTop: insets.top }]}>
      <View style={ob.ph}>
        <ProgressDots total={3} current={0} />
        <Text style={ob.step}>Step 1 of 3</Text>
        <Text style={ob.title}>What is your{'\n'}primary goal?</Text>
        <Text style={ob.sub}>Shapes your calorie targets and progressive overload speed.</Text>
        {goals.map(g => (
          <OptionCard
            key={g.id}
            icon={g.icon}
            title={g.title}
            sub={g.sub}
            selected={selected === g.id}
            onPress={() => handleSelectGoal(g.id)}
          />
        ))}
      </View>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.lg }}>
        <PrimBtn label="Next →" onPress={() => { setProfile({ goal: selected as any }); navigation.navigate('Level') }} />
      </View>
    </View>
  )
}

// ─── Step 2: Level & Location ─────────────────────────────────────────────────

export function LevelScreen({ navigation }: any) {
  const insets = useSafeAreaInsets()
  const { setProfile } = useProfileStore()
  const [level, setLevel] = useState<string>('intermediate')
  const [location, setLocation] = useState<'gym' | 'home' | 'mixed'>('mixed')

  const levels = [
    { id: 'beginner', icon: '🌱', title: 'Beginner', sub: 'Under 1 year lifting experience' },
    { id: 'intermediate', icon: '🏋️', title: 'Intermediate', sub: '1–4 years consistent training' },
    { id: 'advanced', icon: '🏆', title: 'Advanced', sub: '4+ years structured training' },
  ]

  return (
    <ScrollView style={[ob.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      <View style={ob.ph}>
        <ProgressDots total={3} current={1} />
        <Text style={ob.step}>Step 2 of 3</Text>
        <Text style={ob.title}>Training level{'\n'}& environment.</Text>
        <Text style={ob.sub}>Sets how aggressively IRON pushes progression.</Text>

        {levels.map(l => (
          <OptionCard
            key={l.id}
            icon={l.icon}
            title={l.title}
            sub={l.sub}
            selected={level === l.id}
            onPress={() => setLevel(l.id)}
          />
        ))}

        <View style={[ob.card, { marginTop: spacing.md }]}>
          <Text style={[ob.label, { marginBottom: spacing.sm }]}>WHERE DO YOU TRAIN?</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {(['gym', 'mixed', 'home'] as const).map(loc => (
              <TouchableOpacity
                key={loc}
                style={{
                  flex: 1,
                  paddingVertical: spacing.md,
                  borderRadius: radius.sm,
                  backgroundColor: location === loc ? colors.bgInset : colors.bgDeep,
                  alignItems: 'center',
                  borderWidth: 0.5,
                  borderColor: location === loc ? colors.titaniumMid : colors.border,
                }}
                onPress={() => setLocation(loc)}
              >
                <Text style={{ fontSize: 13, color: location === loc ? colors.titanium : colors.textMuted, fontWeight: '600' }}>
                  {loc === 'gym' ? '🏋️ Gym' : loc === 'home' ? '🏠 Home' : '⚡ Mixed'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.lg, paddingTop: spacing.md }}>
        <PrimBtn label="Next →" onPress={() => { setProfile({ level: level as any }); navigation.navigate('Stats') }} />
      </View>
    </ScrollView>
  )
}

// ─── Step 3: Schedule & Baseline Stats ───────────────────────────────────────

export function StatsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets()
  const { profile, setProfile } = useProfileStore()
  const [daysAvailable, setDaysAvailable] = useState<number>(4)
  const [weight, setWeight] = useState(profile?.weight ?? 70)
  const [height, setHeight] = useState(profile?.height ?? 175)
  const [age, setAge] = useState(profile?.age ?? 22)
  const [unit, setUnit] = useState<'kg' | 'lb'>(profile?.units ?? 'kg')

  function handleFinishSetup() {
    setProfile({
      weight,
      height,
      age,
      units: unit,
    })
    navigation.navigate('Ready')
  }

  return (
    <ScrollView style={[ob.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      <View style={ob.ph}>
        <ProgressDots total={3} current={2} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={ob.step}>Step 3 of 3</Text>
          <TouchableOpacity onPress={handleFinishSetup}>
            <Text style={{ fontSize: 12, color: colors.titaniumMid, fontWeight: '600' }}>Skip & Use Defaults ›</Text>
          </TouchableOpacity>
        </View>

        <Text style={ob.title}>Schedule & Baseline.</Text>
        <Text style={ob.sub}>Calculates targets and configures your weekly split.</Text>

        <View style={[ob.card, { marginBottom: spacing.md }]}>
          <Text style={[ob.label, { marginBottom: spacing.sm }]}>TRAINING FREQUENCY</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {[3, 4, 5].map(d => (
              <TouchableOpacity
                key={d}
                style={{
                  flex: 1,
                  paddingVertical: spacing.md,
                  borderRadius: radius.sm,
                  backgroundColor: daysAvailable === d ? colors.bgInset : colors.bgDeep,
                  alignItems: 'center',
                  borderWidth: 0.5,
                  borderColor: daysAvailable === d ? colors.titaniumMid : colors.border,
                }}
                onPress={() => setDaysAvailable(d)}
              >
                <Text style={{ fontSize: 15, color: daysAvailable === d ? colors.titanium : colors.textMuted, fontWeight: '600' }}>
                  {d} Days / wk
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={ob.card}>
          <Text style={[ob.label, { marginBottom: spacing.xs }]}>OPTIONAL BODY STATS</Text>
          <Stepper label="Body weight" value={weight} unit={unit} onDec={() => setWeight(w => Math.max(30, parseFloat((w - 0.5).toFixed(1))))} onInc={() => setWeight(w => parseFloat((w + 0.5).toFixed(1)))} />
          <Stepper label="Height" value={height} unit="cm" onDec={() => setHeight(h => Math.max(100, h - 1))} onInc={() => setHeight(h => h + 1)} />
          <Stepper label="Age" value={age} unit="yr" onDec={() => setAge(a => Math.max(16, a - 1))} onInc={() => setAge(a => a + 1)} />
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.lg, paddingTop: spacing.md }}>
        <PrimBtn label="Build My Plan →" onPress={handleFinishSetup} />
      </View>
    </ScrollView>
  )
}

// ─── TargetsScreen & NotificationsScreen (Direct Alias for Navigation compatibility) ──

export function TargetsScreen({ navigation }: any) {
  return navigation.navigate('Ready')
}

export function NotificationsScreen({ navigation }: any) {
  return navigation.navigate('Ready')
}

// ─── Ready / Plan Confirmation ────────────────────────────────────────────────

export function ReadyScreen({ navigation }: any) {
  const insets = useSafeAreaInsets()
  const { profile, setProfile, saveProfile } = useProfileStore()
  const { setOnboarded, setUid } = useAuthStore()

  const calculated = calculateCaloricTarget(
    profile?.weight ?? 70,
    profile?.height ?? 175,
    profile?.age ?? 22,
    profile?.goal ?? 'lean-bulk',
    profile?.gender ?? 'male',
    profile?.units ?? 'kg'
  )

  async function handleStartTraining() {
    const finalProfile = {
      uid: useAuthStore.getState().uid || `local_${Date.now()}`,
      goal: profile?.goal ?? 'lean-bulk',
      level: profile?.level ?? 'intermediate',
      gender: profile?.gender ?? 'male',
      weight: profile?.weight ?? 70,
      height: profile?.height ?? 175,
      age: profile?.age ?? 22,
      targetCalories: calculated.calories,
      targetProtein: calculated.protein,
      targetWater: 4.0,
      units: profile?.units ?? 'kg',
      notifications: false,
      autoProgressiveOverload: true,
    }

    setProfile(finalProfile as any)
    await saveProfile()
    if (!useAuthStore.getState().uid) {
      setUid(finalProfile.uid)
    }
    setOnboarded(true)
  }

  return (
    <View style={[ob.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, alignItems: 'center' }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.greenBg, borderWidth: 0.5, borderColor: colors.greenBorder, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg }}>
            <Text style={{ fontSize: 32 }}>💪</Text>
          </View>
          <Text style={[ob.title, { textAlign: 'center', marginBottom: 4 }]}>Your Workout Begins Today.</Text>
          <Text style={[ob.sub, { textAlign: 'center', marginBottom: spacing.lg }]}>
            Your personalized training structure is locked and ready.
          </Text>

          <View style={[ob.card, { width: '100%', alignSelf: 'stretch' }]}>
            <Text style={[ob.label, { marginBottom: spacing.sm, color: colors.green }]}>YOUR PLAN STRUCTURE</Text>
            {[
              { label: 'Primary Goal', val: (profile?.goal ?? 'lean-bulk').replace('-', ' ').toUpperCase() },
              { label: 'Training Level', val: (profile?.level ?? 'Intermediate').toUpperCase() },
              { label: 'Program Split', val: 'Push / Pull / Legs (PPL)' },
              { label: 'Daily Target', val: `${calculated.calories} kcal · ${calculated.protein}g protein` },
              { label: 'Day 1 Workout', val: 'Chest, Shoulders & Triceps' },
            ].map((r, i) => (
              <View key={i} style={ob.summaryRow}>
                <Text style={{ fontSize: 13, color: colors.textPrimary }}>{r.label}</Text>
                <Text style={{ fontSize: 13, color: colors.titaniumMid, fontWeight: '600' }}>{r.val}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.lg, gap: spacing.sm }}>
        <TouchableOpacity style={ob.primBtn} onPress={handleStartTraining} activeOpacity={0.85}>
          <Text style={ob.primBtnText}>Start Day 1 Workout 🔥</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}


export default { SplashScreen, GoalScreen, LevelScreen, StatsScreen, TargetsScreen, NotificationsScreen, ReadyScreen }

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
          <Stepper
            label="Body weight"
            value={weight}
            unit={unit}
            onDec={() => setWeight(w => Math.max(30, parseFloat((w - 0.5).toFixed(1))))}
            onInc={() => setWeight(w => parseFloat((w + 0.5).toFixed(1)))}
            onChange={v => setWeight(Math.max(20, Math.min(300, v)))}
          />
          <Stepper
            label="Height"
            value={height}
            unit="cm"
            onDec={() => setHeight(h => Math.max(100, h - 1))}
            onInc={() => setHeight(h => h + 1)}
            onChange={v => setHeight(Math.max(50, Math.min(250, Math.round(v))))}
          />
          <Stepper
            label="Age"
            value={age}
            unit="yr"
            onDec={() => setAge(a => Math.max(16, a - 1))}
            onInc={() => setAge(a => a + 1)}
            onChange={v => setAge(Math.max(10, Math.min(100, Math.round(v))))}
          />
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
          <Stepper
            label="Protein"
            value={protein}
            unit="g"
            onDec={() => setProtein(p => Math.max(50, p - 5))}
            onInc={() => setProtein(p => p + 5)}
            onChange={v => setProtein(Math.max(20, Math.min(500, Math.round(v))))}
          />
          <Stepper
            label="Water"
            value={water.toFixed(1)}
            unit="L"
            onDec={() => setWater(w => Math.max(1, parseFloat((w - 0.5).toFixed(1))))}
            onInc={() => setWater(w => parseFloat((w + 0.5).toFixed(1)))}
            onChange={v => setWater(Math.max(0.5, Math.min(15, parseFloat(v.toFixed(1)))))}
          />
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

