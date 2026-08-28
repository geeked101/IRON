/**
 * WorkoutScreen.tsx
 *
 * Lists all 7 workout days. Tapping a day that is not the currentDay shows an
 * Alert asking the user to confirm the skip. Confirmed skips permanently remove
 * the intervening days from this cycle — they are not re-queued.
 *
 * The "This week" dot-row now reflects the queue's currentDay rather than
 * the calendar day-of-week.
 */

import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, spacing, radius, typography } from '../theme'
import { WORKOUT_SPLIT } from '../data/workoutSplit'
import { useQueueStore } from '../store/queueStore'
import { useAuthStore } from '../store/index'
import { useScaledFont } from '../hooks/useScaledFont'

/** Main workout-day selection screen. */
export default function WorkoutScreen({ navigation }: any) {
  const insets = useSafeAreaInsets()
  const f = useScaledFont()
  const { uid } = useAuthStore()
  const { currentDay, skipToDay } = useQueueStore()

  /**
   * Handle a tap on any day card.
   * - Current day → navigate immediately.
   * - Another day → show confirmation Alert explaining the permanent skip.
   * @param day - the tapped WorkoutDay number (1–7)
   */
  function handleDayPress(day: number) {
    const isRest = day === 7
    const isCurrent = day === currentDay

    // Navigate directly when tapping the current day
    if (isCurrent) {
      if (isRest) {
        navigation.navigate('Recovery')
      } else {
        navigation.navigate('DayExerciseList', { day })
      }
      return
    }

    // For any other day, warn about the permanent skip
    Alert.alert(
      `Skip to Day ${day}?`,
      `This skips Day ${currentDay}. It will be removed permanently from this cycle. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: async () => {
            await skipToDay(day, uid)
            if (isRest) {
              navigation.navigate('Recovery')
            } else {
              navigation.navigate('DayExerciseList', { day })
            }
          },
        },
      ],
    )
  }

  return (
    <ScrollView style={[s.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      <View style={s.ph}>
        <Text style={[s.muted, { fontSize: f.label }]}>PPL × 2 split</Text>
        <Text style={[s.title, { fontSize: f.h2 }]}>Workout</Text>

        {/* Current-day progress dots */}
        <View style={s.thisWeekCard}>
          <Text style={[s.label, { fontSize: f.label }]}>CURRENT CYCLE</Text>
          <View style={s.dotRow}>
            {WORKOUT_SPLIT.slice(0, 6).map((d) => (
              <View key={d.day} style={[
                s.weekDot,
                d.day < currentDay && s.weekDotDone,
                d.day === currentDay && s.weekDotToday,
              ]}>
                <Text style={[s.weekDotText, d.day === currentDay && { color: colors.bg }]}>
                  {d.shortName.slice(0, 2)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={[s.label, { marginBottom: spacing.sm, marginTop: spacing.lg, fontSize: f.label }]}>
          SELECT DAY
        </Text>

        {WORKOUT_SPLIT.map((day) => {
          const isCurrent = day.day === currentDay
          const isRest = day.day === 7
          const isPast = day.day < currentDay

          return (
            <TouchableOpacity
              key={day.day}
              style={[s.dayCard, isCurrent && s.dayCardToday]}
              onPress={() => handleDayPress(day.day)}
              activeOpacity={0.7}
            >
              <View style={[s.dayNumBox, {
                backgroundColor: isCurrent
                  ? colors.titanium
                  : isPast
                    ? colors.bgInset
                    : colors.bgDeep,
              }]}>
                <Text style={[s.dayNumText, isCurrent && { color: colors.bg }]}>D{day.day}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[s.dayName, { fontSize: f.dayName }]}>{day.name}</Text>
                <Text style={[s.dayFocus, { fontSize: f.small }]}>{day.focus}</Text>
                {!isRest && (
                  <View style={s.tagRow}>
                    {day.focusTags.slice(0, 2).map((t, i) => (
                      <View key={i} style={s.tag}>
                        <Text style={[s.tagText, { fontSize: f.label }]}>{t}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                {isCurrent && (
                  <View style={s.todayBadge}>
                    <Text style={[s.todayBadgeText, { fontSize: f.label }]}>Today</Text>
                  </View>
                )}
                {!isRest && (
                  <Text style={[s.exCount, { fontSize: f.label }]}>{day.exercises.length} ex</Text>
                )}
              </View>
            </TouchableOpacity>
          )
        })}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  ph: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  muted: { ...typography.small, marginBottom: 2 },
  title: { fontWeight: '500', color: colors.textPrimary, marginBottom: spacing.md },
  label: { color: colors.textMuted, letterSpacing: 1 },

  thisWeekCard: { backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg },
  dotRow: { flexDirection: 'row', gap: 6, marginTop: spacing.sm },
  weekDot: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.bgDeep, alignItems: 'center', borderWidth: 0.5, borderColor: colors.border },
  weekDotDone: { backgroundColor: colors.bgInset },
  weekDotToday: { backgroundColor: colors.titanium },
  weekDotText: { fontSize: 10, color: colors.textMuted },

  dayCard: { backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: 8 },
  dayCardToday: { borderColor: colors.titaniumMid },
  dayNumBox: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  dayNumText: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
  dayName: { fontWeight: '500', color: colors.textPrimary },
  dayFocus: { color: colors.textSecondary, marginTop: 2 },
  tagRow: { flexDirection: 'row', gap: 4, marginTop: 6 },
  tag: { backgroundColor: colors.bgDeep, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { color: colors.titaniumFaint },
  todayBadge: { backgroundColor: colors.titanium, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4 },
  todayBadgeText: { fontWeight: '500', color: colors.bg },
  exCount: { color: colors.textMuted },
})
