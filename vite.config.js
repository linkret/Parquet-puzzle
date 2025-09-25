import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  root: '.', // Project root
  publicDir: 'public', // All static assets in public/
  plugins: [vue()],
  build: {
    outDir: 'dist', // Output to project-level dist
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'parquet-puzzle': 'games/parquet-puzzle/parquet-puzzle.html',
        // Add more games here as needed
      }
    }
  }
});