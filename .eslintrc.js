/* eslint-env node */

const { defineConfig } = require('eslint-define-config');
const prettierConfig = require('./.prettierrc.js');

module.exports = defineConfig({
  root: true,
  env: {
    browser: true,
    es6: true,
    node: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/electron',
    'plugin:import/typescript',
    'prettier',
    '@vue/eslint-config-typescript',
    'plugin:vue/vue3-essential',
    'plugin:vuejs-accessibility/recommended',
  ],
  plugins: ['prettier', 'vuejs-accessibility', '@typescript-eslint'],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    indent: [
      'error',
      2,
      {
        SwitchCase: 1,
      },
    ],
    'max-len': [
      'error',
      {
        code: 120,
      },
    ],
    'no-console': [
      'error',
      {
        allow: ['warn', 'error'],
      },
    ],
    'comma-dangle': ['error', 'always-multiline'],
    'space-before-function-paren': [
      'warn',
      {
        anonymous: 'ignore',
        named: 'never',
        asyncArrow: 'always',
      },
    ],
    'prettier/prettier': [
      'error',
      {
        ...prettierConfig,
      },
    ],
    'vue/html-indent': ['error', 2],
    'vue/multiline-html-element-content-newline': 'off',
    'vue/multi-word-component-names': 'off',
    'vue/max-attributes-per-line': 0,
    'vue/require-default-prop': 0,
    'vue/no-multiple-template-root': 0,
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        varsIgnorePattern: '^_$',
        argsIgnorePattern: '^_$',
      },
    ],
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
    },
  },
  ignorePatterns: ['*.test.ts'],
  overrides: [
    {
      files: ['tests/**/*'],
      env: {
        jest: true,
      },
    },
    {
      files: ['*.vue'],
      rules: {
        'max-len': 'off',
      },
    },
  ],
});
