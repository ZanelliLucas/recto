import path from 'node:path';
import { lt } from 'drizzle-orm';
import { isoDay, type AudienceService } from './audience/audienceService';
import type { config as appConfig } from './config';
import { backupDatabase, lastBackupDay } from './db/backup';
import type { Database } from './db/client';
import { lastDraws } from './db/schema';
import type { SqlGameStore } from './games/gameStore';
import { logger } from './logger';

interface MaintenanceDependencies {
  db: Database;
  games: SqlGameStore;
  audience: AudienceService;
  config: Pick<typeof appConfig, 'databaseUrl' | 'backup' | 'retention' | 'gameRetentionMs'>;
}

const MINUTE_MS = 60 * 1000;

/**
 * Tâches périodiques d'une instance unique : clôture des parties laissées en plan, purges aux durées
 * annoncées par la politique de confidentialité, sauvegarde quotidienne (§ 7.5). Renvoie l'arrêt.
 */
export function startMaintenance({ db, games, audience, config }: MaintenanceDependencies): () => void {
  const expire = async () => {
    try {
      await games.expireUnfinished(Date.now() - config.gameRetentionMs);
    } catch (error) {
      logger.error('Clôture des parties inachevées en échec', error);
    }
  };

  const hourly = async () => {
    const now = Date.now();
    try {
      const purged = await games.purgeGuestGames(now - config.retention.guestGamesMs);
      await db.delete(lastDraws).where(lt(lastDraws.updatedAt, now - config.retention.guestGamesMs));
      await audience.purge(now - config.retention.audienceMs);
      if (purged > 0) logger.info('Parties invitées expirées supprimées', { count: purged });
    } catch (error) {
      logger.error('Purge des données expirées en échec', error);
    }
    // Une sauvegarde par jour : rattrapée à l'heure suivante si le serveur était arrêté.
    if (config.backup.enabled && (await lastBackupDay(config.backup.dir)) !== isoDay(now)) {
      try {
        const file = await backupDatabase(db, config.databaseUrl, config.backup.dir, config.backup.retentionDays, now);
        if (file) logger.info('Sauvegarde de la base effectuée', { file: path.basename(file) });
      } catch (error) {
        logger.error('Sauvegarde de la base en échec', error);
      }
    }
  };

  const timers = [
    setInterval(() => void expire(), 10 * MINUTE_MS),
    setInterval(() => void hourly(), 60 * MINUTE_MS),
    // Premier passage peu après le démarrage, une fois le serveur à l'écoute.
    setTimeout(() => void hourly(), 30 * 1000),
  ];
  for (const timer of timers) timer.unref();
  return () => timers.forEach((timer) => clearTimeout(timer));
}
