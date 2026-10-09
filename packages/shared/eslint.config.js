// @ts-check
import eslint from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

/**
 * Shared code runs in Node (API) and React Native (mobile): it must stay
 * platform-neutral and must never pull in server-only or mobile-only code.
 */
export default tseslint.config(
  { ignores: ['dist/*', 'coverage/*'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': 'error',
      'no-restricted-globals': [
        'error',
        { name: 'process', message: 'Shared code must not read the environment.' },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['node:*'], message: 'Shared code must be platform-neutral (no Node APIs).' },
            {
              group: [
                'react',
                'react-native',
                'expo*',
                '@supabase/*',
                'express',
                '@google/*',
                'pino*',
              ],
              message: 'Shared code must not depend on app, server or provider libraries.',
            },
            {
              group: ['**/apps/*', '@ai-mentor/api', '@ai-mentor/mobile'],
              message: 'Shared code must not import app code.',
            },
          ],
        },
      ],
    },
  },
);
