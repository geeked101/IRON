import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'

const isExpoGo = Constants.appOwnership === 'expo'

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })
} catch (e) {
  // Graceful fallback in Expo Go or web
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync()
    if (existing === 'granted') return true
    const { status } = await Notifications.requestPermissionsAsync()
    return status === 'granted'
  } catch (err) {
    console.warn('[Notifications] Permission request skipped (Expo Go or unsupported):', err)
    return false
  }
}

export async function scheduleWorkoutReminder(workoutName?: string, hourOfDay = 7) {
  try {
    const name = workoutName || 'Your workout'
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'IRON',
        body: `${name} is waiting. Time to hit the iron.`,
      },
      trigger: {
        hour: hourOfDay,
        minute: 0,
        repeats: true,
      } as any,
    })
  } catch (e) {
    // Ignored in sandbox
  }
}

export async function scheduleProteinReminder() {
  try {
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
  } catch (e) {
    // Ignored in sandbox
  }
}

export async function scheduleHydrationReminder() {
  try {
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
  } catch (e) {
    // Ignored in sandbox
  }
}

export async function scheduleLegDayReminder(dayIndex: number) {
  try {
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
  } catch (e) {
    // Ignored in sandbox
  }
}

export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync()
  } catch (e) {
    // Ignored in sandbox
  }
}

export async function setupAllNotifications(prefs: {
  workoutReminders: boolean
  proteinCheck: boolean
  hydrationNudge: boolean
  legDayReminder: boolean
}) {
  try {
    await cancelAllNotifications()
    if (prefs.workoutReminders) await scheduleWorkoutReminder()
    if (prefs.proteinCheck) await scheduleProteinReminder()
    if (prefs.hydrationNudge) await scheduleHydrationReminder()
    if (prefs.legDayReminder) await scheduleLegDayReminder(3)
  } catch (e) {
    // Ignored in sandbox
  }
}
