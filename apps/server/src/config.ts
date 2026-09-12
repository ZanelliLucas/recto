import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Chemin relatif à la racine du package ; valable depuis src/ comme depuis le bundle dist/. */
const fromRoot = (relative: string) => fileURLToPath(new URL(`../${relative}`, import.meta.url));

// Variables locales (ADMIN_SECRET…) : fichier .env facultatif, jamais versionné.
const envFile = fromRoot('.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

const isProduction = process.env.NODE_ENV === 'production';
const toFileUrl = (file: string) => `file:${file.replaceAll('\\', '/')}`;

export const config = {
  /**
   * En production, un seul processus sert l'interface et l'API sur PORT. En
   * développement, PORT appartient au serveur Vite : l'API écoute sur API_PORT.
   */
  port: Number(process.env.API_PORT ?? (isProduction ? process.env.PORT : undefined) ?? 4747),
  isProduction,
  databaseUrl: process.env.DATABASE_URL ?? toFileUrl(path.join(fromRoot('data'), 'recto.db')),
  migrationsDir: fromRoot('drizzle'),
  /** Stockage local des images ; remplacé par un stockage objet et un CDN à la mise en ligne. */
  mediaDir: process.env.MEDIA_DIR ?? fromRoot('storage/media'),
  /** Sources du contenu versionnées (drapeaux générés, listes Commons verrouillées). */
  contentDir: fromRoot('content'),
  webDistDir: fileURLToPath(new URL('../../web/dist/', import.meta.url)),
  /** Secret d'accès au back-office en attendant le rôle administrateur du lot 3 ; absent : back-office fermé. */
  adminSecret: process.env.ADMIN_SECRET && process.env.ADMIN_SECRET.length >= 16 ? process.env.ADMIN_SECRET : null,
  /** Les parties laissées inachevées au-delà de ce délai sont classées abandonnées. */
  gameRetentionMs: 6 * 60 * 60 * 1000,
};
