module.exports = {
  root: true,
  extends: ['eslint:recommended'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/apps/ui/**'],
            message: 'Core/packages cannot import from apps/ui',
          },
          {
            group: ['**/apps/electron/**'],
            message: 'Core/packages cannot import from apps/electron',
          },
          {
            group: ['electron', 'vue', 'fastify', 'drizzle-orm'],
            message: 'Core cannot import framework dependencies',
          },
        ],
      },
    ],
  },
  overrides: [
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
  ],
};
