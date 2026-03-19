// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable package.json "exports" field resolution.
// Required for packages like lucide-react-native that use modern exports maps.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
