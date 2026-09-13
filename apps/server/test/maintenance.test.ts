import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@libsql/client';
import { describe, expect, it } from 'vitest';
import { backupDatabase, lastBackupDay, pruneBackups } from '../src/db/backup';
import { games } from '../src/db/schema';
import { SqlGameStore } from '../src/games/gameStore';
import { playGame, register, setup, testDatabase } from './helpers';

describe('sauvegarde quotidienne (§ 7.5)', () => {
  it('copie la base à chaud et ne garde que trente jours de copies', async () => {
    const { db, dir } = await testDatabase();
    const url = `file:${path.join(dir, 'test.db').replaceAll('\\', '/')}`;
    const backups = path.join(dir, 'sauvegardes');
    const now = Date.parse('2026-09-13T03:00:00Z');

    const file = await backupDatabase(db, url, backups, 30, now);
    expect(file && existsSync(file)).toBeTruthy();
    const copy = createClient({ url: `file:${file!.replaceAll('\\', '/')}` });
    const tables = await copy.execute("select name from sqlite_master where type = 'table'");
    copy.close();
    expect(tables.rows.map((row) => row.name)).toEqual(expect.arrayContaining(['games', 'users', 'page_views']));

    writeFileSync(path.join(backups, 'recto-2026-08-01T03-00-00Z.db'), '');
    writeFileSync(path.join(backups, 'recto-2026-08-20T03-00-00Z.db'), '');
    writeFileSync(path.join(backups, 'notes.txt'), '');
    expect(await pruneBackups(backups, 30, now)).toEqual(['recto-2026-08-01T03-00-00Z.db']);
    expect(readdirSync(backups).sort()).toEqual(['notes.txt', 'recto-2026-08-20T03-00-00Z.db', path.basename(file!)].sort());
    expect(await lastBackupDay(backups)).toBe('2026-09-13');
  });

  it('laisse au fournisseur la sauvegarde d’une base distante', async () => {
    const { db, dir } = await testDatabase();
    expect(await backupDatabase(db, 'libsql://recto.exemple.io', path.join(dir, 'b'), 30)).toBeNull();
  });
});

describe('durées de conservation (politique de confidentialité)', () => {
  it('supprime les parties invitées expirées, jamais celles d’un compte', async () => {
    const ctx = await setup();
    const player = ctx.newAgent();
    await register(player);
    const before = ctx.now();
    await playGame(ctx, player);
    await playGame(ctx, ctx.newAgent());

    const store = new SqlGameStore(ctx.db);
    expect(await store.purgeGuestGames(before)).toBe(0);
    expect(await store.purgeGuestGames(ctx.now() + 1000)).toBe(1);
    const remaining = await ctx.db.select().from(games);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.userId).not.toBeNull();
  });
});
