import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import {
  SplashScreen,
  GoalScreen,
  LevelScreen,
  StatsScreen,
  TargetsScreen,
  ReadyScreen,
} from '../screens/onboarding'

const Stack = createStackNavigator()

/**
 * Onboarding navigator — steps the user through goal, level, stats,
 * and targets before entering the main app.
 */
export default function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Goal" component={GoalScreen} />
      <Stack.Screen name="Level" component={LevelScreen} />
      <Stack.Screen name="Stats" component={StatsScreen} />
      <Stack.Screen name="Targets" component={TargetsScreen} />
      <Stack.Screen name="Ready" component={ReadyScreen} />
    </Stack.Navigator>
  )
}
