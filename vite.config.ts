import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'url';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          // FIX: `__dirname` is not available in an ESM context. Replaced with `import.meta.url` for robust path resolution.
          '@': fileURLToPath(new URL('.', import.meta.url)),
        }
      },
      build: {
        outDir: 'dist',
      }
    };
});