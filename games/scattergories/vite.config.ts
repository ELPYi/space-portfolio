import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backendTarget = process.env.VITE_SERVER_URL || 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  base: '/games/scattergories/',
  build: {
    outDir: '../../dist/games/scattergories',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/socket.io': {
        target: backendTarget,
        ws: true,
      },
    },
  },
});
