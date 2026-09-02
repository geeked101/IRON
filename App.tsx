import React, { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationContainer } from '@react-navigation/native'
import { useAuthStore } from './src/store'
import { useQueueStore } from './src/store/queueStore'
import { FontSizeProvider } from './src/context/FontSizeContext'
import RootNavigator from './src/navigation/RootNavigator'
import { initFirebase } from './src/services/firebase'
import { initLocalDatabase } from './src/services/localDb'

/**
 * Root application component.
 * Initialises local SQLite database, authentication, and hydrates the workout
 * queue from AsyncStorage on mount. FontSizeProvider makes the user's text-scale
 * preference available to every screen in the tree.
 */
export default function App() {
  const { initialize } = useAuthStore()
  const loadQueue = useQueueStore((s) => s.load)

  useEffect(() => {
    initLocalDatabase()
    initFirebase()
    loadQueue(null)
    initialize()
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <FontSizeProvider>
          <NavigationContainer>
          <StatusBar style="light" backgroundColor="#0B0D12" translucent />
            <RootNavigator />
          </NavigationContainer>
        </FontSizeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
