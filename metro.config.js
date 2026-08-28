const { getDefaultConfig } = require('expo/metro-config')

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname)

// Firebase JS SDK: Metro's package exports resolve the wrong @firebase/auth build on RN.
// https://github.com/expo/expo/issues/36588
config.resolver.sourceExts.push('cjs')
config.resolver.unstable_enablePackageExports = false

module.exports = config
