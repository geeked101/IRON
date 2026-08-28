/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app.json')

const FIREBASE_ENV_KEYS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
]

const missing = FIREBASE_ENV_KEYS.filter((key) => !process.env[key])

if (missing.length > 0 && process.env.EAS_BUILD === 'true') {
  throw new Error(
    `EAS build is missing Firebase env vars: ${missing.join(', ')}.\n` +
    'Run: eas env:push --environment preview --path .env\n' +
    'Then rebuild: eas build --platform android --profile preview'
  )
}

module.exports = {
  expo: {
    ...appJson.expo,
  },
}
