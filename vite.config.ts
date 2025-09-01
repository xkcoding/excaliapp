import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Build configuration
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          // Preserve font file names for Excalidraw fonts
          if (assetInfo.name && assetInfo.name.endsWith('.woff2')) {
            return 'assets/fonts/[name][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    },
    // Copy font files to output
    copyPublicDir: true
  },

  // Explicitly include Excalidraw fonts
  assetsInclude: [
    '**/*.woff',
    '**/*.woff2',
    '**/node_modules/@excalidraw/excalidraw/dist/prod/fonts/**/*'
  ],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  // Test configuration for Vitest
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
}));
