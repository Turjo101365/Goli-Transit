import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:8080',
      '/admin': 'http://127.0.0.1:8080',
      '/health': 'http://127.0.0.1:8080',
      '/auth': 'http://127.0.0.1:8080',
      '/profile': 'http://127.0.0.1:8080',
      '/route': 'http://127.0.0.1:8080',
      '/anomaly': 'http://127.0.0.1:8080',
      '/graph': 'http://127.0.0.1:8080'
    }
  },
  preview: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true
  }
});
