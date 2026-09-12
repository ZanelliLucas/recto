import { createApp } from './app';
import { config } from './config';
import { FileCategoryRepository } from './content/fileCategoryRepository';
import { GameService } from './games/gameService';
import { InMemoryGameStore } from './games/gameStore';

const categories = await FileCategoryRepository.load(config.contentDir);
const store = new InMemoryGameStore();

const app = createApp({
  categories,
  games: new GameService(categories, store),
  contentDir: config.contentDir,
  webDistDir: config.webDistDir,
  secureCookies: config.isProduction,
});

setInterval(() => store.purgeCreatedBefore(Date.now() - config.gameRetentionMs), 10 * 60 * 1000).unref();

app.listen(config.port, () => {
  console.log(`RECTO — serveur à l'écoute sur http://localhost:${config.port}`);
});
