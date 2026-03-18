import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/games/tictactoe/',
  build: {
    outDir: '../../dist/games/tictactoe',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
});
