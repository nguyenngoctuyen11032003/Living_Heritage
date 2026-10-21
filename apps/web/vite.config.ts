/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const rootDir = fileURLToPath(new URL('../..', import.meta.url));

/** GitHub Pages serves 404.html for unknown paths; make it the SPA shell so deep links work. */
function spaFallback(): Plugin {
  return {
    name: 'lh-spa-fallback',
    apply: 'build',
    writeBundle(options) {
      const outDir = resolve(options.dir ?? 'dist');
      copyFileSync(resolve(outDir, 'index.html'), resolve(outDir, '404.html'));
    },
  };
}

function normalizeBase(value: string | undefined): string {
  if (!value) return '/';
  let base = value.trim().replace(/\/{2,}/g, '/');
  if (!base.startsWith('/')) base = `/${base}`;
  if (!base.endsWith('/')) base = `${base}/`;
  return base;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, 'VITE_');
  return {
    base: normalizeBase(env.VITE_BASE_PATH),
    envDir: rootDir,
    plugins: [react(), tailwindcss(), spaFallback()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { port: 5173, strictPort: true },
    preview: { port: 4173, strictPort: true },
    build: {
      target: 'es2020',
      sourcemap: false,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              { name: 'v-react', test: /node_modules[\\/](\.pnpm[\\/][^\\/]*[\\/]node_modules[\\/])?(react|react-dom|scheduler)[\\/]/, priority: 10 },
              { name: 'v-router', test: /node_modules[\\/].*react-router/, priority: 9 },
              { name: 'v-supabase', test: /node_modules[\\/].*@supabase/, priority: 9 },
              { name: 'v-motion', test: /node_modules[\\/].*[\\/](motion|framer-motion|motion-dom|motion-utils)[\\/]/, priority: 9 },
              { name: 'v-zod', test: /node_modules[\\/].*[\\/]zod[\\/]/, priority: 9 },
            ],
          },
        },
      },
    },
    test: {
      environment: 'happy-dom',
      globals: true,
      setupFiles: ['./tests/unit/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
      passWithNoTests: true,
    },
  };
});
