/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { copyFileSync, readFileSync } from 'node:fs';
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

/**
 * NT16 / CLS: preload the Be Vietnam Pro faces that render the first screen (400 body + 700 headings, latin and
 * vietnamese subsets), using the hashed URLs Vite emitted for design/fonts.css. Build only; dev serves fonts directly.
 */
const PRELOAD_FONTS = /be-vietnam-pro-(latin|vietnamese)-(400|700)-normal-[\w-]+\.woff2$/;
function preloadFonts(base: string): Plugin {
  return {
    name: 'lh-preload-fonts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!ctx.bundle) return [];
        return Object.keys(ctx.bundle)
          .filter((file) => PRELOAD_FONTS.test(file))
          .sort()
          .map((file) => ({
            tag: 'link',
            attrs: { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '', href: base + file },
            injectTo: 'head' as const,
          }));
      },
    },
  };
}

/** Warm the TCP/TLS connection to Supabase (used right after first paint). Skipped without a real URL (e2e/dev). */
function preconnectSupabase(url: string | undefined): Plugin {
  let origin: string | null = null;
  try {
    const u = new URL(url ?? '');
    if (u.protocol === 'https:' && !u.hostname.endsWith('.invalid')) origin = u.origin;
  } catch {
    /* no valid URL */
  }
  return {
    name: 'lh-preconnect-supabase',
    apply: 'build',
    transformIndexHtml() {
      if (!origin) return [];
      return [{ tag: 'link', attrs: { rel: 'preconnect', href: origin, crossorigin: '' }, injectTo: 'head' as const }];
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

/** Version stamped on usage events (lib/events.ts): VITE_APP_VERSION, else package version + short CI commit. */
function appVersion(env: Record<string, string>): string {
  if (env.VITE_APP_VERSION) return env.VITE_APP_VERSION.slice(0, 40);
  const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version?: string };
  const sha = process.env.GITHUB_SHA?.slice(0, 7);
  return [pkg.version ?? '0.0.0', sha].filter(Boolean).join('+');
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, 'VITE_');
  return {
    define: { __LH_VERSION__: JSON.stringify(appVersion(env)) },
    base: normalizeBase(env.VITE_BASE_PATH),
    envDir: rootDir,
    plugins: [react(), tailwindcss(), spaFallback(), preloadFonts(normalizeBase(env.VITE_BASE_PATH)), preconnectSupabase(env.VITE_SUPABASE_URL)],
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
