import js from '@eslint/js';
import ts from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import a11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';
import jsdoc from 'eslint-plugin-jsdoc';

export default ts.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.vite/**',
      '**/out/**',
      '**/.cache/**',
      '**/.gallery/**',
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
        project: [
          './apps/desktop/tsconfig.json',
          './packages/contracts/tsconfig.json',
          './packages/engine/tsconfig.json',
          './packages/ui/tsconfig.json',
          './packages/e2e/tsconfig.json',
        ],
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
