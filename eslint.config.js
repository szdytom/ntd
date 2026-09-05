import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', '**/dist/**', '**/dist-types/**', '**/*.tsbuildinfo', 'node_modules/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['packages/web-shared/src/**/*.{ts,tsx}', 'apps/web-single/src/**/*.{ts,tsx}', 'apps/web-coop/src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': 'error',
    },
  },
  {
    files: ['apps/coop-server/src/**/*.ts', 'packages/coop/src/**/*.ts', 'packages/game-core/src/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['packages/game-core/src/signals/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{ name: 'react', message: 'Signal definitions and interpreters must remain framework-independent.' }],
        patterns: [{
          group: ['**/game/**', '**/ui/**', '**/defense-archive/**', '**/i18n/**'],
          message: 'The signals domain must not depend on game orchestration, UI, persistence, or i18n runtime code.',
        }],
      }],
    },
  },
  {
    files: ['**/*.mjs', '**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['tests/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
);
