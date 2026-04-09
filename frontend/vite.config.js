import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/health': 'http://localhost:3001',
      '/route': 'http://localhost:3001',
      '/anomaly': 'http://localhost:3001',
      '/graph': 'http://localhost:3001'
    }
  }
});