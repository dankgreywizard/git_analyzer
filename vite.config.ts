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
});
