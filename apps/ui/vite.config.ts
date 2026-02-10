import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import vuetify from 'vite-plugin-vuetify';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    vuetify({
      autoImport: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: { protocol: 'ws', host: 'localhost', port: 5173 },
  },
  build: {
    outDir: 'dist',
  },
});
