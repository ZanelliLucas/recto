import { sql } from 'drizzle-orm';
import { AdminService } from './admin/adminService';
import { createApp } from './app';
import { AudienceService } from './audience/audienceService';
import { AuthService } from './auth/authService';
import { SessionManager } from './auth/sessions';
import { SqlUserRepository } from './auth/userRepository';
import { config } from './config';
import { SqlContentRepository } from './content/contentRepository';
import { openDatabase } from './db/client';
import { GameService } from './games/gameService';
import { SqlGameStore } from './games/gameStore';
import { logger } from './logger';
import { FileMailer, SmtpMailer } from './mail/mailer';
import { startMaintenance } from './maintenance';
import { LocalMediaStorage } from './media/storage';
import { RecordService } from './records/recordService';

process.on('unhandledRejection', (reason) => logger.error('Promesse rejetée non traitée', reason));
process.on('uncaughtException', (error) => {
  logger.error('Exception non rattrapée : arrêt du processus', error);
  process.exit(1);
});

const db = await openDatabase(config.databaseUrl, config.migrationsDir, config.databaseAuthToken);
const content = new SqlContentRepository(db);
const games = new SqlGameStore(db);
const media = new LocalMediaStorage(config.mediaDir);
const users = new SqlUserRepository(db);
const records = new RecordService(db, content);
const audience = new AudienceService(db, content);
const mailer = config.smtpUrl ? new SmtpMailer(config.smtpUrl, config.mailFrom) : new FileMailer(config.mailDir);

const app = createApp({
  categories: content,
  games: new GameService(content, games, media, records),
  admin: new AdminService(content, media),
  auth: new AuthService(users, mailer, { appUrl: config.appUrl }),
  records,
  users,
  sessions: new SessionManager(config.authSecret, config.isProduction),
  media,
  audience,
  mediaDir: config.mediaDir,
  appUrl: config.appUrl,
  webDistDir: config.webDistDir,
  secureCookies: config.isProduction,
  trustProxy: config.trustProxy,
  forceHttps: config.isProduction && config.appUrl.startsWith('https://'),
  indexable: config.appEnv === 'production',
  version: config.version,
  checkHealth: async () => {
    await db.run(sql`select 1`);
  },
});

const stopMaintenance = startMaintenance({ db, games, audience, config });

const server = app.listen(config.port, () => {
  logger.info(`RECTO — serveur à l'écoute sur http://localhost:${config.port}`, { env: config.appEnv, version: config.version });
  if (!config.smtpUrl) logger.info(`Courriels écrits dans ${config.mailDir} (SMTP_URL non défini).`);
});

// Arrêt propre à chaque déploiement : les requêtes en cours se terminent avant la sortie.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    logger.info('Arrêt demandé', { signal });
    stopMaintenance();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 10_000).unref();
  });
}
