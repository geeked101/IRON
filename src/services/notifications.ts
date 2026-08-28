import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

export async function scheduleWorkoutReminder(hourOfDay = 7) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'IRON',
      body: 'Push day waiting.',
    },
    trigger: {
      hour: hourOfDay,
      minute: 0,
      repeats: true,
    } as any,
  })
}

export async function scheduleProteinReminder() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'IRON',
      body: 'Protein target incomplete.',
    },
    trigger: {
      hour: 20,
      minute: 0,
      repeats: true,
    } as any,
  })
}

export async function scheduleHydrationReminder() {
  // Every 3 hours between 8am and 8pm
  const hours = [8, 11, 14, 17, 20]
  for (const hour of hours) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'IRON',
        body: 'Hydrate.',
      },
      trigger: {
        hour,
        minute: 0,
        repeats: true,
      } as any,
    })
  }
}

export async function scheduleLegDayReminder(dayIndex: number) {
  // dayIndex: 0=Sun, 1=Mon, ..., 6=Sat
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'IRON',
      body: 'Leg day remembers.',
    },
    trigger: {
      weekday: dayIndex + 1,
      hour: 7,
      minute: 30,
      repeats: true,
    } as any,
  })
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync()
}

export async function setupAllNotifications(prefs: {
  workoutReminders: boolean
  proteinCheck: boolean
  hydrationNudge: boolean
  legDayReminder: boolean
}) {
  await cancelAllNotifications()
  if (prefs.workoutReminders) await scheduleWorkoutReminder()
  if (prefs.proteinCheck) await scheduleProteinReminder()
  if (prefs.hydrationNudge) await scheduleHydrationReminder()
  if (prefs.legDayReminder) await scheduleLegDayReminder(3) // Wednesday leg day
}
