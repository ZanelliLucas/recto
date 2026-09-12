import { AdminAuth } from './admin/adminAuth';
import { AdminService } from './admin/adminService';
import { createApp } from './app';
import { config } from './config';
import { SqlContentRepository } from './content/contentRepository';
import { openDatabase } from './db/client';
import { GameService } from './games/gameService';
import { SqlGameStore } from './games/gameStore';
import { LocalMediaStorage } from './media/storage';

const db = await openDatabase(config.databaseUrl, config.migrationsDir);
const content = new SqlContentRepository(db);
const games = new SqlGameStore(db);
const media = new LocalMediaStorage(config.mediaDir);

const app = createApp({
  categories: content,
  games: new GameService(content, games, media),
  admin: new AdminService(content, media),
  adminAuth: new AdminAuth(config.adminSecret, config.isProduction),
  media,
  mediaDir: config.mediaDir,
  webDistDir: config.webDistDir,
  secureCookies: config.isProduction,
});

setInterval(() => void games.expireUnfinished(Date.now() - config.gameRetentionMs), 10 * 60 * 1000).unref();

app.listen(config.port, () => {
  console.log(`RECTO — serveur à l'écoute sur http://localhost:${config.port}`);
  if (!config.adminSecret) console.log('Back-office désactivé : définissez ADMIN_SECRET (16 caractères minimum) dans apps/server/.env');
});
