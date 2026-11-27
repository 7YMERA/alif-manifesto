import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

function copyAssetsPlugin() {
  return {
    name: 'copy-static-assets',
    closeBundle() {
      const src = path.resolve(process.cwd(), 'assets');
      const dest = path.resolve(process.cwd(), 'dist', 'assets');
      if (fs.existsSync(src)) {
        fs.cpSync(src, dest, { recursive: true });
      }
    }
  };
}

export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [copyAssetsPlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          motion: ['gsap', 'lenis']
        }
      }
    }
  }
});
