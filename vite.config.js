import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    // Relative asset paths so `dist/index.html` also opens straight from disk.
    base: './',
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        // Proxies Gemma LLM requests: the browser talks to Vite,
        // Vite forwards to local Ollama or a remote OpenAI-compatible API host.
        '/api/gemma': {
          target: env.VITE_GEMMA_HOST || 'https://ai.spuric.com',
          changeOrigin: true,
          rewrite: () => '/v1/chat/completions',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const key = env.SPUR_API_KEY || 'sk-spur-8ijRJhfByC2eZyKZR6ibNZHcNmaSFCj';
              if (key) {
                proxyReq.setHeader('Authorization', `Bearer ${key}`);
              }
            });
          },
        },
        '/gemma': {
          target: env.VITE_GEMMA_HOST || 'http://localhost:11434',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/gemma/, ''),
        },
      },
    },
  };
});
