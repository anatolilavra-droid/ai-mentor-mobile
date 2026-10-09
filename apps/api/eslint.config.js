// @ts-check
import eslint from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/*', 'coverage/*'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      // Express recognises error handlers by their four parameters.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'error',
      // User code is data, never executed (CLAUDE.md security rules).
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            'child_process',
            'node:child_process',
            'vm',
            'node:vm',
            'worker_threads',
            'node:worker_threads',
          ].map((name) => ({ name, message: 'The API never executes user code.' })),
        },
      ],
    },
  },
);
