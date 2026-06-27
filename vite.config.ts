import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const key = env.GEMINI_API_KEY || env.API_KEY || '';
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: `http://localhost:${env.PORT || 8787}`,
          changeOrigin: true,
        },
      },
    },
    define: {
      // Google AI Studio injects the key; we expose it under both names for safety.
      'process.env.API_KEY': JSON.stringify(key),
      'process.env.GEMINI_API_KEY': JSON.stringify(key),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
