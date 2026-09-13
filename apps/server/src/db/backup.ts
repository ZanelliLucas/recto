import { mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { isFileDatabase, type Database } from './client';

const BACKUP_FILE = /^recto-(\d{4}-\d{2}-\d{2})T[\d-]+Z\.db$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * § 7.5 — copie cohérente de la base, prise à chaud (VACUUM INTO), puis suppression des copies de
 * plus de `retentionDays` jours. Une base libSQL distante est sauvegardée par son fournisseur : null.
 */
export async function backupDatabase(
  db: Database,
  databaseUrl: string,
  dir: string,
  retentionDays: number,
  now = Date.now(),
): Promise<string | null> {
  if (!isFileDatabase(databaseUrl)) return null;
  await mkdir(dir, { recursive: true });
  const stamp = new Date(now).toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `recto-${stamp.slice(0, 19)}Z.db`);
  await db.run(sql`VACUUM INTO ${file}`);
  await pruneBackups(dir, retentionDays, now);
  return file;
}

export async function pruneBackups(dir: string, retentionDays: number, now = Date.now()): Promise<string[]> {
  const limit = now - retentionDays * DAY_MS;
  const removed: string[] = [];
  for (const name of await readdir(dir)) {
    const match = BACKUP_FILE.exec(name);
    if (match && Date.parse(`${match[1]}T00:00:00Z`) < limit) {
      await rm(path.join(dir, name), { force: true });
      removed.push(name);
    }
  }
  return removed;
}

/** Jour UTC de la sauvegarde la plus récente, ou null. */
export async function lastBackupDay(dir: string): Promise<string | null> {
  const names = await readdir(dir).catch(() => [] as string[]);
  const days = names.map((name) => BACKUP_FILE.exec(name)?.[1]).filter((day): day is string => Boolean(day));
  return days.sort().at(-1) ?? null;
}
