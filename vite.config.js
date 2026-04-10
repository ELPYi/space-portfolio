import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        'how-old': 'games/how-old/index.html',
      },
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
});
