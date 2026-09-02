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

import React, { useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, spacing, radius, typography } from '../theme'
import { useQueueStore } from '../store/queueStore'
import { useAuthStore } from '../store/index'
import { useSplitStore } from '../store/splitStore'
import { useScaledFont } from '../hooks/useScaledFont'

/** Main workout-day selection screen. */
export default function WorkoutScreen({ navigation }: any) {
  const insets = useSafeAreaInsets()
  const f = useScaledFont()
  const { uid } = useAuthStore()
  const { currentDay, previousDay, skipToDay, undoSkip } = useQueueStore()
  const { split, loadSplit } = useSplitStore()

  useEffect(() => {
    loadSplit()
  }, [])

  /**
   * Handle a tap on any day card.
   * - Current day → navigate immediately.
   * - Another day → show clear confirmation Alert with undo capability.
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

    // For any other day, provide bright confirmation with zero data loss guarantee
    Alert.alert(
      `Jump to Day ${day}?`,
      `Your active queue position will move from Day ${currentDay} to Day ${day}.\n\nAll existing workout logs remain safely preserved in your history. You can revert this jump at any time.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Jump to Day ${day}`,
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
        <View style={s.headerRow}>
          <View>
            <Text style={[s.muted, { fontSize: f.label }]}>CUSTOMIZABLE SPLIT</Text>
            <Text style={[s.title, { fontSize: f.h2 }]}>Workout</Text>
          </View>
          <TouchableOpacity style={s.custBtn} onPress={() => navigation.navigate('EditSplit')}>
            <Text style={s.custBtnText}>⚙ Customize</Text>
          </TouchableOpacity>
        </View>

        {/* Undo queue jump banner */}
        {previousDay !== null && previousDay !== currentDay && (
          <TouchableOpacity
            style={s.undoBanner}
            onPress={async () => {
              const fromDay = previousDay
              await undoSkip(uid)
              Alert.alert('Queue Restored', `Restored active position back to Day ${fromDay}.`)
            }}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.undoTitle}>↺ Jumped from Day {previousDay}</Text>
              <Text style={s.undoSub}>Tap to revert active queue back to Day {previousDay}</Text>
            </View>
            <Text style={s.undoBtnText}>Undo →</Text>
          </TouchableOpacity>
        )}

        {/* Current-day progress dots */}
        <View style={s.thisWeekCard}>
          <Text style={[s.label, { fontSize: f.label }]}>CURRENT CYCLE</Text>
          <View style={s.dotRow}>
            {split.slice(0, 6).map((d) => (
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

        {split.map((day) => {
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  custBtn: { backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  custBtnText: { fontSize: 12, color: colors.titanium, fontWeight: '600' },
  muted: { ...typography.small, marginBottom: 2 },
  title: { fontWeight: '500', color: colors.textPrimary, marginBottom: spacing.md },
  label: { color: colors.textMuted, letterSpacing: 1 },

  thisWeekCard: { backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg },
  undoBanner: {
    backgroundColor: '#1a1e28',
    borderWidth: 0.5,
    borderColor: colors.titaniumMid,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  undoTitle: { fontSize: 13, fontWeight: '600', color: colors.titanium },
  undoSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  undoBtnText: { fontSize: 13, fontWeight: '600', color: colors.titaniumMid, marginLeft: spacing.sm },
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
