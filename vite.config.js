import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative asset paths so `dist/index.html` also opens straight from disk.
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Keeps PHI on the local network: the browser talks to Vite,
      // Vite talks to the Ollama host running Gemma.
      '/gemma': {
        target: process.env.VITE_GEMMA_HOST || 'http://localhost:11434',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/gemma/, ''),
      },
    },
  },
});
