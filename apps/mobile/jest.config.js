/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Reset call counts of every mock between tests.
  clearMocks: true,
  // Load the JS (non-native) build of react-native-worklets under Jest.
  resolver: 'react-native-worklets/jest/resolver',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Jest cannot run lucide's ESM (.mjs) build; use its CommonJS build in tests.
    '^lucide-react-native$':
      '<rootDir>/../../node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/.expo/',
    '<rootDir>/__tests__/test-utils.tsx',
    '<rootDir>/__tests__/fixtures.ts',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|expo-router|standard-navigation|react-navigation|@react-navigation/.*|react-native-svg|lucide-react-native|react-native-reanimated|react-native-worklets|zustand))',
  ],
};
