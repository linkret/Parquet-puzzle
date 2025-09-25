import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [vue()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'parquet-puzzle': resolve(__dirname, 'games/parquet-puzzle/parquet-puzzle.html'),
      }
    }
  }
});