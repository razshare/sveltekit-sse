import prettier from 'eslint-config-prettier'
import js from '@eslint/js'
import { includeIgnoreFile } from '@eslint/compat'
import svelte from 'eslint-plugin-svelte'
import globals from 'globals'
import { fileURLToPath } from 'node:url'
import svelteConfig from './svelte.config.js'
const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url))

/** @type {import('eslint').Linter.Config[]} */
export default [
  includeIgnoreFile(gitignorePath),
  js.configs.recommended,
  ...svelte.configs.recommended,
  prettier,
  ...svelte.configs.prettier,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        Bun: 'readonly',
      },
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
    ignores: [
      '.DS_Store',
      '/build',
      '/.svelte-kit',
      '/package',
      '/src/app.html',
      '/pnpm-lock.yaml',
      '/package-lock.json',
      '/yarn.lock',
      '.env',
      '.env.*',
      '!.env.example',
      '/node_modules',
    ],
  },
  {
    files: ['**/*.svelte', '**/*.svelte.js'],

    languageOptions: {
      parserOptions: {
        svelteConfig,
      },
    },
  },
]
