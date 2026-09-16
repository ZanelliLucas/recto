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
const DAY_MS = 24 * 60 * 60 * 1000;

/** § 7.5 — environnements distincts : la recette tourne en mode production mais n'est jamais indexée. */
export type AppEnv = 'developpement' | 'recette' | 'production';

function appEnv(): AppEnv {
  const value = process.env.APP_ENV;
  if (value === 'developpement' || value === 'recette' || value === 'production') return value;
  return isProduction ? 'production' : 'developpement';
}

function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (isProduction) throw new Error('AUTH_SECRET (32 caractères minimum) est obligatoire en production.');
  console.warn('AUTH_SECRET absent : secret éphémère, les sessions ne survivront pas au redémarrage.');
  return randomBytes(48).toString('base64url');
}

/** Nombre de mandataires inverses de confiance devant le serveur (adresse du client, protocole). */
function trustProxy(): number | false {
  const raw = process.env.TRUST_PROXY;
  if (raw === undefined) return isProduction ? 1 : false;
  const hops = Number(raw);
  return Number.isInteger(hops) && hops > 0 ? hops : false;
}

const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : fromRoot('data');

export const config = {
  /**
   * En production, un seul processus sert l'interface et l'API sur PORT. En
   * développement, PORT appartient au serveur Vite : l'API écoute sur API_PORT.
   */
  port: Number(process.env.API_PORT ?? (isProduction ? process.env.PORT : undefined) ?? 4747),
  isProduction,
  appEnv: appEnv(),
  /** Version déployée, reprise par /api/health. */
  version: process.env.RECTO_VERSION ?? 'dev',
  trustProxy: trustProxy(),
  databaseUrl: process.env.DATABASE_URL ?? toFileUrl(path.join(dataDir, 'recto.db')),
  /** Jeton d'une base libSQL distante ; inutile pour un fichier local. */
  databaseAuthToken: process.env.DATABASE_AUTH_TOKEN,
  migrationsDir: fromRoot('drizzle'),
  /** Stockage local des images, sur le même volume persistant que la base en production. */
  mediaDir: process.env.MEDIA_DIR ? path.resolve(process.env.MEDIA_DIR) : fromRoot('storage/media'),
  /** Sources du contenu versionnées (drapeaux générés, listes Commons verrouillées). */
  contentDir: fromRoot('content'),
  webDistDir: fileURLToPath(new URL('../../web/dist/', import.meta.url)),
  /** Signature des jetons de session. */
  authSecret: authSecret(),
  /** Adresse publique de l'interface : liens des courriels, adresses canoniques, plan du site. */
  appUrl: (process.env.APP_URL ?? `http://localhost:${process.env.PORT ?? 5173}`).replace(/\/$/, ''),
  smtpUrl: process.env.SMTP_URL ?? null,
  mailFrom: process.env.MAIL_FROM ?? 'RECTO <ne-pas-repondre@recto.local>',
  /** Sans SMTP, les courriels sont écrits ici (développement). */
  mailDir: process.env.MAIL_DIR ? path.resolve(process.env.MAIL_DIR) : fromRoot('storage/mail'),
  /** § 7.5 — sauvegarde quotidienne de la base, conservée trente jours ; active par défaut en production. */
  backup: {
    enabled: (process.env.BACKUPS ?? (isProduction ? 'on' : 'off')) === 'on',
    dir: process.env.BACKUP_DIR ? path.resolve(process.env.BACKUP_DIR) : path.join(dataDir, 'backups'),
    retentionDays: 30,
  },
  /** Les parties laissées inachevées au-delà de ce délai sont classées abandonnées. */
  gameRetentionMs: 6 * 60 * 60 * 1000,
  /** Durées annoncées par la politique de confidentialité : à modifier de concert. */
  retention: {
    guestGamesMs: 365 * DAY_MS,
    audienceMs: 760 * DAY_MS,
  },
};
