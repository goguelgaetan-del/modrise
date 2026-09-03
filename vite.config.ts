/// <reference types="vitest/config" />
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';

// L'analyseur de bundle (`pnpm analyze`) n'est chargé que sur demande
// (ANALYZE=1) : il ne doit jamais faire partie d'un build de production
// normal, ni de son propre poids ni de la page HTML qu'il génère.
const analyze = process.env.ANALYZE === '1';

// Chemin public sous lequel l'application sera servie. Il vaut `/` en
// développement, en `pnpm preview` et pour les tests Playwright ; un
// hébergement en sous-répertoire — GitHub Pages sert le dépôt sous
// `/modrise/` — le surcharge via `BASE_PATH`. Vite réécrit alors les URL des
// scripts, des feuilles de style et des fichiers de `public/`.
// Voir docs/deployment.md.
//
// La normalisation est faite ici et pas dans le workflow : `configure-pages`
// renvoie `/modrise` pour un site de projet mais `/` pour un domaine dédié,
// et concaténer une barre oblique à l'aveugle produirait `//`.
function resolveBase(value: string | undefined): string {
  const trimmed = (value ?? '').trim().replace(/^\/*/, '').replace(/\/*$/, '');
  return trimmed === '' ? '/' : `/${trimmed}/`;
}

const base = resolveBase(process.env.BASE_PATH);

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    ...(analyze
      ? [visualizer({ filename: 'dist/bundle-analysis.html', gzipSize: true, brotliSize: true })]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
