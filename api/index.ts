/**
 * Point d'entrée sans serveur (Vercel) : la même application Express, construite une fois par
 * démarrage à froid. La base est un libSQL distant (DATABASE_URL) et les images vivent dans un
 * magasin objet, puisque le disque n'est ni partagé ni conservé d'une requête à l'autre.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { sql } from 'drizzle-orm';
import { AdminService } from '../apps/server/src/admin/adminService';
import { createApp } from '../apps/server/src/app';
import { AudienceService } from '../apps/server/src/audience/audienceService';
import { AuthService } from '../apps/server/src/auth/authService';
import { SessionManager } from '../apps/server/src/auth/sessions';
import { config } from '../apps/server/src/config';
import { SqlContentRepository } from '../apps/server/src/content/contentRepository';
import { openDatabase } from '../apps/server/src/db/client';
import { DailyService } from '../apps/server/src/games/dailyService';
import { GameService } from '../apps/server/src/games/gameService';
import { SqlGameStore } from '../apps/server/src/games/gameStore';
import { FileMailer, SmtpMailer } from '../apps/server/src/mail/mailer';
import { maintenanceJobs } from '../apps/server/src/maintenance';
import { BlobMediaStorage } from '../apps/server/src/media/blobStorage';
import { LocalMediaStorage } from '../apps/server/src/media/storage';
import { RecordService } from '../apps/server/src/records/recordService';
import { SqlUserRepository } from '../apps/server/src/auth/userRepository';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

async function build(): Promise<Handler> {
  const db = await openDatabase(config.databaseUrl, config.migrationsDir, config.databaseAuthToken);
  const content = new SqlContentRepository(db);
  const games = new SqlGameStore(db);
  const media = process.env.BLOB_READ_WRITE_TOKEN ? await BlobMediaStorage.open() : new LocalMediaStorage(config.mediaDir);
  const users = new SqlUserRepository(db);
  const records = new RecordService(db, content);
  const audience = new AudienceService(db, content);
  const mailer = config.smtpUrl ? new SmtpMailer(config.smtpUrl, config.mailFrom) : new FileMailer(config.mailDir);
  const jobs = maintenanceJobs({ db, games, audience, config });
  const secret = process.env.CRON_SECRET;

  const daily = new DailyService(content, media, games, users);

  return createApp({
    categories: content,
    games: new GameService(content, games, media, records),
    admin: new AdminService(content, media),
    auth: new AuthService(users, mailer, { appUrl: config.appUrl }),
    records,
    users,
    sessions: new SessionManager(config.authSecret, config.isProduction),
    media,
    audience,
  daily,
    mediaDir: config.mediaDir,
    appUrl: config.appUrl,
    webDistDir: config.webDistDir,
    secureCookies: config.isProduction,
    // L'hébergeur termine TLS et place l'adresse du client dans X-Forwarded-For.
    trustProxy: config.trustProxy,
    forceHttps: false,
    indexable: config.appEnv === 'production',
    version: config.version,
    checkHealth: async () => {
      await db.run(sql`select 1`);
    },
    maintenance: secret
      ? {
          secret,
          run: async () => {
            await jobs.expire();
            await jobs.hourly();
          },
        }
      : undefined,
  }) as unknown as Handler;
}

let ready: Promise<Handler> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  ready ??= build();
  (await ready)(req, res);
}
