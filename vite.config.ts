/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5101,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/read': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  publicDir: 'static',
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: ['**/node_modules/**', '**/dist/**', '**/repos/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 75,
        statements: 75,
      },
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/repos/**',
        '**/*.test.tsx',
        '**/*.test.ts',
        'src/test/setup.ts',
        'src/types/**',
        'vite.config.ts',
        'postcss.config.js',
        'tailwind.config.js',
        'src/server/index.ts',
        'src/client/index.tsx',
      ],
    },
  },
});
