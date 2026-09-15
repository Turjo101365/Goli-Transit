import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5176,
    strictPort: false,
    watch: {
      ignored: ['**/android/**', '**/ios/**', '**/dist/**']
    },
    proxy: {
      '/api': 'http://127.0.0.1:8085',
      '/admin': 'http://127.0.0.1:8085',
      '/health': 'http://127.0.0.1:8085',
      '/auth': 'http://127.0.0.1:8085',
      '/profile': 'http://127.0.0.1:8085',
      '/route': 'http://127.0.0.1:8085',
      '/anomaly': 'http://127.0.0.1:8085',
      '/graph': 'http://127.0.0.1:8085'
    }
  },
  preview: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true
  }
});
