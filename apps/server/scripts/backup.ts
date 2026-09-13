/**
 * § 7.5 — sauvegarde de la base à la demande (le serveur en fait une par jour en production).
 * Restauration : arrêter le serveur, remplacer data/recto.db par la copie choisie, supprimer
 * recto.db-wal et recto.db-shm s'ils existent, redémarrer.
 */
import { config } from '../src/config';
import { backupDatabase } from '../src/db/backup';
import { openDatabase } from '../src/db/client';

const db = await openDatabase(config.databaseUrl, config.migrationsDir, config.databaseAuthToken);
const file = await backupDatabase(db, config.databaseUrl, config.backup.dir, config.backup.retentionDays);
console.log(file ? `Sauvegarde écrite : ${file}` : 'Base distante : sa sauvegarde est assurée par le fournisseur.');
