import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from './schema';

/** Ouvre la base et applique les migrations versionnées manquantes. */
export async function openDatabase(url: string, migrationsFolder: string) {
  if (url.startsWith('file:')) mkdirSync(path.dirname(url.slice('file:'.length)), { recursive: true });
  const client = createClient({ url });
  await client.execute('PRAGMA foreign_keys = ON');
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  return db;
}

export type Database = Awaited<ReturnType<typeof openDatabase>>;
