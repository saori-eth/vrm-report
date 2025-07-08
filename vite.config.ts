import { defineConfig } from 'vite';
import basicSSL from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [basicSSL()],
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    https: true,
  },
});