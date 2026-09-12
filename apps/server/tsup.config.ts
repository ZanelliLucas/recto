import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // Le package partagé est publié en source TypeScript : on l'intègre au bundle.
  noExternal: ['@recto/shared'],
});
