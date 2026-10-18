import js from '@eslint/js';
import ts from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import a11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';
import jsdoc from 'eslint-plugin-jsdoc';
import { builtinModules } from 'node:module';

export default ts.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.vite/**',
      '**/out/**',
      '**/.cache/**',
      '**/.gallery/**',
      '**/.bundle/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/test-results/**',
      '**/playwright-report/**',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  { languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  {
    rules: {
      curly: ['error', 'all'],
      'one-var': ['error', 'never'],
      'lines-between-class-members': ['error', 'always'],
      'max-statements-per-line': ['error', { max: 1 }],
      'max-len': [
        'error',
        {
          code: 80,
          tabWidth: 2,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
        },
      ],
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: 'import', next: '*' },
        { blankLine: 'never', prev: 'import', next: 'import' },
        { blankLine: 'always', prev: '*', next: ['function', 'class'] },
        { blankLine: 'always', prev: 'block-like', next: '*' },
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: 'export', next: '*' },
        { blankLine: 'always', prev: '*', next: 'export' },
      ],
    },
  },
  {
    files: ['apps/desktop/src/**/*.{ts,tsx}', 'packages/*/src/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', '**/*.d.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { jsdoc },
    settings: { jsdoc: { mode: 'typescript' } },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: true,
          require: { FunctionDeclaration: true, ClassDeclaration: true },
          contexts: ['TSInterfaceDeclaration'],
          enableFixer: false,
        },
      ],
      'jsdoc/require-description': 'error',
      'jsdoc/check-tag-names': 'error',
    },
  },
  {
    files: [
      'packages/{contracts,core,converter,browser-engine,ui}/src/**/*.{ts,tsx}',
      'apps/{web,site}/src/**/*.{ts,tsx}',
      'apps/site/{app,pages}/**/*.{ts,tsx}',
      'apps/desktop/src/renderer/**/*.{ts,tsx}',
    ],
    ignores: ['**/*.{test,spec}.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: builtinModules,
          patterns: [
            {
              group: [
                'node:*',
                'electron',
                'electron/*',
                '@comet/engine',
                '@comet/engine/*',
                '@comet/e2e',
                '@comet/e2e/*',
              ],
              message: 'Use a browser-safe platform service boundary.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.{tsx,ts}'],
    plugins: { 'react-hooks': hooks, 'jsx-a11y': a11y },
    rules: {
      ...hooks.configs.recommended.rules,
      ...a11y.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      eqeqeq: ['error', 'always'],
      'no-nested-ternary': 'error',
    },
  },
);
