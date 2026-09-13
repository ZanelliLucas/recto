import { defineConfig } from 'tsup';

export default defineConfig({
  // Serveur, et commandes d'exploitation utilisables sur l'image de production sans outillage de développement.
  // Toutes à la racine de dist/ : leurs chemins sont calculés relativement à la racine du package.
  entry: {
    index: 'src/index.ts',
    'seed-drapeaux': 'scripts/seed-drapeaux.ts',
    'commons-import': 'scripts/commons/import.ts',
    'user-role': 'scripts/user-role.ts',
    backup: 'scripts/backup.ts',
  },
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // Le package partagé est publié en source TypeScript : on l'intègre au bundle.
  noExternal: ['@recto/shared'],
});
