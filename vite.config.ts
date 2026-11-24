import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Cấu hình base: './' giúp web chạy mượt trên mọi đường dẫn GitHub Pages
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'charts';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'icons';
          }
          if (id.includes('node_modules/react')) {
            return 'react-vendor';
          }
        },
      },
    },
  },
});
