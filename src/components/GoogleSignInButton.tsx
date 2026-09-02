/**
 * GoogleSignInButton.tsx
 *
 * Real Google Authentication component for Expo & Firebase.
 * Integrates expo-auth-session/providers/google and Firebase signInWithCredential.
 * Automatically migrates local SQLite data (workouts, PRs, nutrition) to the Google UID
 * and flushes the SyncEngine queue to Firestore.
 */

import React, { useEffect, useState } from 'react'
import {
  TouchableOpacity, Text, StyleSheet, View, ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import * as Google from 'expo-auth-session/providers/google'
import { colors, spacing, radius } from '../theme'
import { signInWithGoogleCredential, isFirebaseConfigured } from '../services/firebase'
import { useAuthStore } from '../store/index'
import { flushSyncQueue } from '../services/syncEngine'

WebBrowser.maybeCompleteAuthSession()

interface GoogleSignInButtonProps {
  onSuccess?: () => void
  onError?: (err: any) => void
  label?: string
}

export default function GoogleSignInButton({
  onSuccess,
  onError,
  label = 'Sign in with Google',
}: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [manualClientId, setManualClientId] = useState('')

  const isCloudAvailable = isFirebaseConfigured()
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || manualClientId
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: webClientId || undefined,
    iosClientId: iosClientId || undefined,
    androidClientId: androidClientId || undefined,
  })

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params
      if (id_token) {
        handleGoogleIdToken(id_token)
      } else if (response.authentication?.idToken) {
        handleGoogleIdToken(response.authentication.idToken)
      }
    } else if (response?.type === 'error') {
      setLoading(false)
      Alert.alert('Google Sign In Error', response.error?.message || 'Authentication failed.')
      onError?.(response.error)
    }
  }, [response])

  async function handleGoogleIdToken(idToken: string) {
    setLoading(true)
    try {
      const currentUid = useAuthStore.getState().uid
      console.log('[GoogleAuth] Signing in with Google ID Token...')

      const user = await signInWithGoogleCredential(idToken)
      console.log('[GoogleAuth] Successfully signed in as:', user.email, 'UID:', user.uid)

      if (currentUid && currentUid !== user.uid) {
        const { dbMigrateUserUid } = await import('../services/localDb')
        dbMigrateUserUid(currentUid, user.uid)
      }

      useAuthStore.getState().setUid(user.uid)

      // Sync profile & notification setup for signed-in user
      const { fetchUserProfile } = await import('../services/firebase')
      const { useProfileStore } = await import('../store/index')

      const remoteProfile = await fetchUserProfile(user.uid)
      if (remoteProfile) {
        useProfileStore.getState().setProfile(remoteProfile)
      } else if (useProfileStore.getState().profile) {
        await useProfileStore.getState().saveProfile()
      }

      const activeProfile = useProfileStore.getState().profile
      if (activeProfile?.notifications && activeProfile?.notificationPrefs) {
        const { setupAllNotifications } = await import('../services/notifications')
        await setupAllNotifications(activeProfile.notificationPrefs as any)
      }

      // Sync offline queue immediately
      await flushSyncQueue(user.uid)

      Alert.alert('Signed in with Google', `Welcome back, ${user.displayName || user.email}! Data synchronized.`)
      onSuccess?.()
    } catch (err: any) {
      console.error('[GoogleAuth] Firebase Credential Error:', err)
      Alert.alert('Google Auth Failed', err.message || 'Failed to authenticate with Firebase.')
      onError?.(err)
    } finally {
      setLoading(false)
    }
  }

  async function handlePress() {
    if (!isCloudAvailable) {
      Alert.alert(
        'Offline Mode Active 📱',
        'Cloud synchronization is currently inactive because Firebase environment variables are omitted in this build (.env).\n\nYour workouts, PRs, nutrition, and weight history are fully persisted offline in your device\'s local SQLite database.',
        [
          { text: 'Configure Keys', onPress: () => setShowConfigModal(true) },
          { text: 'Continue Offline', style: 'cancel' },
        ]
      )
      return
    }

    if (!webClientId && !iosClientId && !androidClientId) {
      setShowConfigModal(true)
      return
    }

    setLoading(true)
    try {
      await promptAsync()
    } catch (err) {
      setLoading(false)
      console.error('[GoogleAuth] Prompt error:', err)
    }
  }

  return (
    <View>
      <TouchableOpacity
        style={[s.btn, !isCloudAvailable && s.btnOffline]}
        onPress={handlePress}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color={colors.bg} size="small" />
        ) : (
          <View style={s.btnContent}>
            <Text style={[s.googleG, !isCloudAvailable && { color: colors.textMuted }]}>
              {isCloudAvailable ? 'G' : '⚡'}
            </Text>
            <View>
              <Text style={[s.btnText, !isCloudAvailable && { color: colors.textPrimary }]}>
                {isCloudAvailable ? label : 'Local-First Mode (Cloud Unconfigured)'}
              </Text>
              {!isCloudAvailable && (
                <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 1 }}>
                  Tap for details · SQLite offline storage active
                </Text>
              )}
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* Modal if client ID missing in env */}
      <Modal visible={showConfigModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Google OAuth Setup</Text>
            <Text style={s.modalSub}>
              Google Sign-In requires a Google Web Client ID from your Firebase / Google Cloud Console.
            </Text>
            <Text style={s.inputLabel}>ENTER GOOGLE WEB CLIENT ID (.apps.googleusercontent.com)</Text>
            <TextInput
              style={s.textInput}
              value={manualClientId}
              onChangeText={setManualClientId}
              placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
            <View style={s.modalBtnRow}>
              <TouchableOpacity style={[s.modalBtn, s.cancelBtn]} onPress={() => setShowConfigModal(false)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, s.saveBtn]}
                onPress={() => {
                  if (!manualClientId.trim()) {
                    Alert.alert('Missing Client ID', 'Please enter a valid Google Web Client ID.')
                    return
                  }
                  setShowConfigModal(false)
                  setTimeout(() => promptAsync(), 300)
                }}
              >
                <Text style={s.saveBtnText}>Save & Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  btn: {
    backgroundColor: '#ffffff',
    borderRadius: radius.md,
    height: 48,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  btnOffline: {
    backgroundColor: colors.bgDeep,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  googleG: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4285F4',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f1f1f',
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: colors.titanium, marginBottom: 4 },
  modalSub: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md, lineHeight: 18 },
  inputLabel: { fontSize: 10, color: colors.textMuted, letterSpacing: 1, marginBottom: 4, marginTop: spacing.sm },
  textInput: {
    backgroundColor: colors.bgDeep,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: 13,
  },
  modalBtnRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  modalBtn: { flex: 1, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  cancelBtn: { backgroundColor: colors.bgDeep, borderWidth: 0.5, borderColor: colors.border },
  cancelBtnText: { color: colors.textMuted, fontWeight: '600' },
  saveBtn: { backgroundColor: colors.titanium },
  saveBtnText: { color: colors.bg, fontWeight: '700' },
})
