import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Chemin relatif à la racine du package ; valable depuis src/ comme depuis le bundle dist/. */
const fromRoot = (relative: string) => fileURLToPath(new URL(`../${relative}`, import.meta.url));

// Variables locales (AUTH_SECRET…) : fichier .env facultatif, jamais versionné.
const envFile = fromRoot('.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

const isProduction = process.env.NODE_ENV === 'production';
const toFileUrl = (file: string) => `file:${file.replaceAll('\\', '/')}`;

function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (isProduction) throw new Error('AUTH_SECRET (32 caractères minimum) est obligatoire en production.');
  console.warn('AUTH_SECRET absent : secret éphémère, les sessions ne survivront pas au redémarrage.');
  return randomBytes(48).toString('base64url');
}

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
  /** Signature des jetons de session. */
  authSecret: authSecret(),
  /** Adresse publique de l'interface, pour les liens envoyés par courriel. */
  appUrl: (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
  smtpUrl: process.env.SMTP_URL ?? null,
  mailFrom: process.env.MAIL_FROM ?? 'RECTO <ne-pas-repondre@recto.local>',
  /** Sans SMTP, les courriels sont écrits ici (développement). */
  mailDir: fromRoot('storage/mail'),
  /** Les parties laissées inachevées au-delà de ce délai sont classées abandonnées. */
  gameRetentionMs: 6 * 60 * 60 * 1000,
};
