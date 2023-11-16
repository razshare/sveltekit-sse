/**
 * @type {import("eslint").Linter.Config}
 */
module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:svelte/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2024,
    extraFileExtensions: ['.svelte'],
  },
  env: {
    browser: true,
    es2017: true,
    node: true,
  },
  globals: {
    Bun: 'readonly',
  },
  rules: {
    '@typescript-eslint/ban-ts-comment': 'off',
    'func-names': ['error', 'always'],
    /**
     * Remember to set "eslint.validate": ["javascript", "svelte"] in settings.json.
     */
    // @see https://astexplorer.net/
    'no-restricted-syntax': [
      'error',
      {
        selector: 'ArrowFunctionExpression',
        message: 'Shorthand arrow functions are not allowed.',
      },
      {
        selector: 'ClassDeclaration',
        message: 'Classes are not allowed, use object literals instead.',
      },
    ],
  },
  overrides: [
    {
      files: ['*.svelte'],
      parser: 'svelte-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser',
      },
    },
  ],
}
