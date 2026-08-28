/**
 * RootNavigator.tsx
 *
 * Top-level navigator for IRON.
 *
 * Stack structure:
 *   Root (stack)
 *     └─ Onboarding (stack) — shown until isOnboarded
 *     └─ Main (bottom tabs)
 *          ├─ Home
 *          ├─ Workout (stack)
 *          │    ├─ WorkoutHome
 *          │    ├─ DayExerciseList
 *          │    ├─ SingleExercise
 *          │    ├─ SessionStats
 *          │    ├─ ActiveWorkout
 *          │    └─ Recovery
 *          ├─ Nutrition
 *          ├─ Progress (stack)
 *          │    ├─ ProgressHome   ← main progress screen
 *          │    ├─ PhotoProgress  ← photo grid
 *          │    └─ PhotoDetail    ← fullscreen single photo (next step)
 *          └─ Settings
 */

import React from 'react'
import {
  View, Text, ActivityIndicator, StyleSheet,
} from 'react-native'
import { useSafeAreaInsets }          from 'react-native-safe-area-context'
import { createStackNavigator }       from '@react-navigation/stack'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs'
import { useAuthStore }               from '../store/index'
import { colors }                     from '../theme'

// ── Screens ────────────────────────────────────────────────────────────────────
import OnboardingNavigator   from './OnboardingNavigator'
import HomeScreen            from '../screens/HomeScreen'
import WorkoutScreen         from '../screens/WorkoutScreen'
import DayExerciseListScreen from '../screens/DayExerciseListScreen'
import SingleExerciseScreen  from '../screens/SingleExerciseScreen'
import SessionStatsScreen    from '../screens/SessionStatsScreen'
import ActiveWorkoutScreen   from '../screens/ActiveWorkoutScreen'
import NutritionScreen       from '../screens/NutritionScreen'
import ProgressScreen        from '../screens/ProgressScreen'
import PhotoProgressScreen   from '../screens/PhotoProgressScreen'
import PhotoDetailScreen     from '../screens/PhotoDetailScreen'
import SettingsScreen        from '../screens/SettingsScreen'
import RecoveryScreen        from '../screens/RecoveryScreen'

const Root          = createStackNavigator()
const Tab           = createBottomTabNavigator()
const WorkoutStack  = createNativeStackNavigator()
const ProgressStack = createNativeStackNavigator()

// ── Tab icons ──────────────────────────────────────────────────────────────────

const TAB_ICONS: Record<string, string> = {
  Home: '⌂', Workout: '⊞', Nutrition: '◈', Progress: '◉', Settings: '⊙',
}

/**
 * Tab icon with a titanium indicator line above it when focused.
 */
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center' }}>
      {focused && (
        <View style={{
          position:        'absolute',
          top:             -10,
          left:            -16,
          right:           -16,
          height:          2.5,
          backgroundColor: colors.titanium,
          borderRadius:    1,
        }} />
      )}
      <Text style={{
        fontSize: 28,
        color: focused ? colors.titanium : colors.titaniumFaint,
      }}>
        {TAB_ICONS[name] ?? '·'}
      </Text>
    </View>
  )
}

// ── Workout stack ──────────────────────────────────────────────────────────────

/**
 * Native stack for the full workout flow.
 */
function WorkoutStackNavigator() {
  return (
    <WorkoutStack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <WorkoutStack.Screen name="WorkoutHome"     component={WorkoutScreen} />
      <WorkoutStack.Screen name="DayExerciseList" component={DayExerciseListScreen} />
      <WorkoutStack.Screen name="SingleExercise"  component={SingleExerciseScreen} />
      <WorkoutStack.Screen name="SessionStats"    component={SessionStatsScreen} />
      <WorkoutStack.Screen name="ActiveWorkout"   component={ActiveWorkoutScreen} />
      <WorkoutStack.Screen name="Recovery"        component={RecoveryScreen} />
    </WorkoutStack.Navigator>
  )
}

// ── Progress stack ─────────────────────────────────────────────────────────────

/**
 * Native stack for the Progress tab.
 * ProgressScreen can navigate into PhotoProgressScreen
 * and PhotoDetailScreen (added in next step).
 */
function ProgressStackNavigator() {
  return (
    <ProgressStack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <ProgressStack.Screen name="ProgressHome"  component={ProgressScreen} />
      <ProgressStack.Screen name="PhotoProgress" component={PhotoProgressScreen} />
      <ProgressStack.Screen name="PhotoDetail"   component={PhotoDetailScreen} />
    </ProgressStack.Navigator>
  )
}

// ── Main tabs ──────────────────────────────────────────────────────────────────

/**
 * Bottom tab bar — five primary sections.
 * useSafeAreaInsets ensures the tab bar never hides behind
 * the Android system navigation bar.
 */
function MainTabs() {
  const insets = useSafeAreaInsets()

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),

        tabBarLabel: ({ focused }) => (
          <Text style={{
            fontSize:     12,
            color:        focused ? colors.titanium : colors.titaniumFaint,
            marginBottom: 4,
          }}>
            {route.name}
          </Text>
        ),

        tabBarStyle: {
          backgroundColor: '#0f1117',
          borderTopColor:  colors.border,
          borderTopWidth:  0.5,
          height:          74 + insets.bottom,
          paddingTop:      10,
          paddingBottom:   insets.bottom > 0 ? insets.bottom : 8,
        },

        tabBarBackground: () => (
          <View style={{ flex: 1, backgroundColor: '#0f1117' }} />
        ),
      })}
    >
      <Tab.Screen name="Home"      component={HomeScreen} />
      <Tab.Screen name="Workout"   component={WorkoutStackNavigator} />
      <Tab.Screen name="Nutrition" component={NutritionScreen} />
      <Tab.Screen name="Progress"  component={ProgressStackNavigator} />
      <Tab.Screen name="Settings"  component={SettingsScreen} />
    </Tab.Navigator>
  )
}

// ── Loading ────────────────────────────────────────────────────────────────────

/** Shown while Firebase resolves auth state on startup. */
function LoadingScreen() {
  return (
    <View style={s.loading}>
      <Text style={s.logo}>IRON</Text>
      <ActivityIndicator color={colors.titaniumMid} style={{ marginTop: 24 }} />
    </View>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────────

/**
 * Root navigator — gates between onboarding and main app.
 * isReady=false     → loading
 * isOnboarded=false → onboarding
 * isOnboarded=true  → main tabs
 */
export default function RootNavigator() {
  const { isReady, isOnboarded } = useAuthStore()

  if (!isReady) return <LoadingScreen />

  return (
    <Root.Navigator screenOptions={{ headerShown: false }}>
      {!isOnboarded
        ? <Root.Screen name="Onboarding" component={OnboardingNavigator} />
        : <Root.Screen name="Main"       component={MainTabs} />
      }
    </Root.Navigator>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  loading: {
    flex:            1,
    backgroundColor: colors.bg,
    alignItems:      'center',
    justifyContent:  'center',
  },
  logo: {
    fontSize:      28,
    fontWeight:    '500',
    color:         colors.titaniumMid,
    letterSpacing: 8,
  },
})