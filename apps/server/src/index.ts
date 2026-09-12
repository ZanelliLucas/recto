import { AdminService } from './admin/adminService';
import { createApp } from './app';
import { AuthService } from './auth/authService';
import { SessionManager } from './auth/sessions';
import { SqlUserRepository } from './auth/userRepository';
import { config } from './config';
import { SqlContentRepository } from './content/contentRepository';
import { openDatabase } from './db/client';
import { GameService } from './games/gameService';
import { SqlGameStore } from './games/gameStore';
import { FileMailer, SmtpMailer } from './mail/mailer';
import { LocalMediaStorage } from './media/storage';
import { RecordService } from './records/recordService';

const db = await openDatabase(config.databaseUrl, config.migrationsDir);
const content = new SqlContentRepository(db);
const games = new SqlGameStore(db);
const media = new LocalMediaStorage(config.mediaDir);
const users = new SqlUserRepository(db);
const records = new RecordService(db, content);
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
  mediaDir: config.mediaDir,
  appUrl: config.appUrl,
  webDistDir: config.webDistDir,
  secureCookies: config.isProduction,
});

setInterval(() => void games.expireUnfinished(Date.now() - config.gameRetentionMs), 10 * 60 * 1000).unref();

app.listen(config.port, () => {
  console.log(`RECTO — serveur à l'écoute sur http://localhost:${config.port}`);
  if (!config.smtpUrl) console.log(`Courriels écrits dans ${config.mailDir} (SMTP_URL non défini).`);
});
