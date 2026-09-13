import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from './schema';

export const isFileDatabase = (url: string) => url.startsWith('file:');
export const databaseFile = (url: string) => url.slice('file:'.length);

/**
 * Ouvre la base et applique les migrations versionnées manquantes. Fichier SQLite local, ou base
 * libSQL distante (`libsql://…`, avec jeton) : le code applicatif est identique.
 */
export async function openDatabase(url: string, migrationsFolder: string, authToken?: string) {
  const local = isFileDatabase(url);
  if (local) mkdirSync(path.dirname(databaseFile(url)), { recursive: true });
  const client = createClient({ url, authToken });
  await client.execute('PRAGMA foreign_keys = ON');
  if (local) {
    // Journal WAL : les lectures ne bloquent plus pendant une écriture ni pendant la sauvegarde.
    await client.execute('PRAGMA journal_mode = WAL');
    await client.execute('PRAGMA busy_timeout = 5000');
  }
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  return db;
}

export type Database = Awaited<ReturnType<typeof openDatabase>>;
