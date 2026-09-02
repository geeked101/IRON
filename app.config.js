/** @type {import('expo/config').ExpoConfig} */
const FIREBASE_ENV_KEYS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
]

const missing = FIREBASE_ENV_KEYS.filter((key) => !process.env[key])

if (missing.length > 0) {
  console.warn(
    `[IRON Config Warning] Firebase env vars missing: ${missing.join(', ')}.\n` +
    'The app will operate in local offline mode.'
  )
}

if (!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
  console.warn(
    '[IRON Config Warning] Google Auth Web Client ID missing (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).\n' +
    'Users can still enter their Client ID directly in the Google Sign-In prompt.'
  )
}

module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins || []),
    'expo-web-browser',
  ],
})
