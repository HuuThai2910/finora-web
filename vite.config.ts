import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api/v1/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/v1/admin/users': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/v1/users': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/v1/loan': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/api/v1/admin': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/api/v1/ai': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/v1/market': {
        target: 'http://localhost:8084',
        changeOrigin: true,
      },
      '/api/v1/investments': {
        target: 'http://localhost:8084',
        changeOrigin: true,
      },
    },
  },
});
