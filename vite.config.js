import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
const file = fileURLToPath(import.meta.url)
const dir = path.dirname(file).replace(/\\+/, '/')

export default defineConfig({
  plugins: [sveltekit()],
  resolve: {
    alias: {
      $lib: `${path.resolve(dir, './src')}`,
    },
  },
})
