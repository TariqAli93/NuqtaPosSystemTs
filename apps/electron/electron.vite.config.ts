import { defineConfig } from 'electron-vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';
import vueDevTools from 'vite-plugin-vue-devtools';
import tailwindcss from '@tailwindcss/vite';
import vuetify from 'vite-plugin-vuetify';

const uiRoot = path.resolve(__dirname, '../ui'); // <-- apps/ui
const uiIndex = path.resolve(uiRoot, 'index.html');

export default defineConfig({
  main: {
    plugins: [],
    build: {
      rollupOptions: { external: ['better-sqlite3'] },
      outDir: 'out/main',
    },
  },

  preload: {
    plugins: [],
    build: {
      rollupOptions: {
        output: { format: 'cjs', entryFileNames: '[name].cjs' },
      },
      outDir: 'out/preload',
    },
  },

  renderer: {
    root: uiRoot,
    plugins: [
      vue(),
      vueDevTools({
        // launchEditor: path.resolve(__dirname, '../tools/antigravity-editor.cmd'),
      }),
      tailwindcss(),
      vuetify({
        autoImport: true,
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(uiRoot, 'src'),
      },
    },
    build: {
      rollupOptions: {
        input: uiIndex, // ✅ هذا اللي يطلبه electron-vite
      },
      outDir: 'out/renderer',
    },

    server: {
      port: 5173,
      strictPort: true,
    },
  },
});
