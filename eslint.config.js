const js = require('@eslint/js');
const prettierPlugin = require('eslint-plugin-prettier');
const typescriptEslintPlugin = require('@typescript-eslint/eslint-plugin');
const vuePlugin = require('eslint-plugin-vue');
const vueAccessibilityPlugin = require('eslint-plugin-vuejs-accessibility');
const typescriptEslintParser = require('@typescript-eslint/parser');
const vueEslintParser = require('vue-eslint-parser');
const prettierConfig = require('./.prettierrc.js');

module.exports = [
  js.configs.recommended, // Use @eslint/js for recommended configs
  {
    files: ['**/*.js', '**/*.ts', '**/*.vue'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      parser: vueEslintParser, // Parser for Vue files
      parserOptions: {
        parser: typescriptEslintParser, // Parser for TypeScript files
      },
      globals: {
        browser: true,
        node: true,
        jest: true,
      },
    },
    plugins: {
      prettier: prettierPlugin,
      '@typescript-eslint': typescriptEslintPlugin,
      vue: vuePlugin,
      'vuejs-accessibility': vueAccessibilityPlugin,
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
      indent: ['error', 2, { SwitchCase: 1 }],
      'max-len': ['error', { code: 120 }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'comma-dangle': ['error', 'always-multiline'],
      'space-before-function-paren': ['warn', { anonymous: 'ignore', named: 'never', asyncArrow: 'always' }],
      'prettier/prettier': ['error', prettierConfig],
      'vue/html-indent': ['error', 2],
      'vue/multiline-html-element-content-newline': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/max-attributes-per-line': 0,
      'vue/require-default-prop': 0,
      'vue/no-multiple-template-root': 0,
      'vue/max-len': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { varsIgnorePattern: '^_$', argsIgnorePattern: '^_$' }],
    },
    settings: {
      'import/resolver': {
        typescript: { alwaysTryTypes: true, project: './tsconfig.json' },
      },
    },
    ignores: ['*.test.ts'],
  },
  {
    files: ['tests/**/*'],
    languageOptions: {
      globals: { jest: true },
    },
  },
  {
    files: ['**/*.vue'],
    rules: {
      'max-len': 'off',
    },
  },
];
