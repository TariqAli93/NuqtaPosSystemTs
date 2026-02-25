import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

const sharedNoRestrictedImports = [
  'error',
  {
    patterns: [
      {
        group: ['@nuqtaplus/*/src/*', 'packages/*/src/*'],
        message: 'Deep imports are forbidden. Import from the package root instead.',
      },
    ],
  },
];

export default [
  {
    ignores: [
      '**/dist/**',
      '**/out/**',
      '**/coverage/**',
      '**/*.d.ts',
      '**/*.tsbuildinfo',
      'e2e/**/*.js',
    ],
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  prettier,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'warn',
      'no-restricted-imports': sharedNoRestrictedImports,
    },
  },
  {
    files: ['apps/ui/**/*.{ts,tsx,vue}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/apps/electron/**',
                '@nuqtaplus/data',
                'better-sqlite3',
                'drizzle-orm',
                'electron',
              ],
              message: 'UI cannot import electron, data layer, or database dependencies',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'electron',
                'vue',
                'fastify',
                'drizzle-orm',
                'better-sqlite3',
                '@nuqtaplus/data',
              ],
              message: 'Core cannot import framework or infrastructure dependencies',
            },
          ],
        },
      ],
    },
  },
];
