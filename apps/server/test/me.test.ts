import type { CreateGameResponse, PlayerStats } from '@recto/shared';
import { describe, expect, it } from 'vitest';
import { PASSWORD, playGame, register, setup } from './helpers';

describe('records et statistiques (EF-5)', () => {
  it('compare au record antérieur et ne le remplace qu’en cas d’amélioration (EF-5.1)', async () => {
    const ctx = await setup();
    await register(ctx.agent);

    const first = await playGame(ctx, ctx.agent, 40_000);
    expect(first.record).toEqual({ previous: null, improved: true });
    const slower = await playGame(ctx, ctx.agent, 50_000);
    expect(slower.record).toEqual({ previous: { durationMs: 40_000, moves: 8 }, improved: false });
    const faster = await playGame(ctx, ctx.agent, 30_000);
    expect(faster.record).toEqual({ previous: { durationMs: 40_000, moves: 8 }, improved: true });

    const stats = (await ctx.agent.get('/api/me/stats').expect(200)).body as PlayerStats;
    expect(stats.records).toEqual([
      expect.objectContaining({ category: 'test', difficulty: 'facile', bestMs: 30_000, gamesFinished: 3, averageMs: 40_000, bestAccuracy: 1 }),
    ]);
    expect(stats.totals).toMatchObject({ gamesPlayed: 3, gamesFinished: 3, totalPlayMs: 120_000, cardsFlipped: 48, completed: 1, completable: 3 });
    expect(stats.history).toHaveLength(3);
  });

  it('retrouve le record après reconnexion depuis un autre terminal (CA-04)', async () => {
    const ctx = await setup();
    const account = await register(ctx.agent);
    await playGame(ctx, ctx.agent, 35_000);
    await ctx.agent.post('/api/auth/logout').expect(204);

    const otherDevice = ctx.newAgent();
    await otherDevice.post('/api/auth/login').send({ email: account.email, password: PASSWORD }).expect(200);
    const stats = (await otherDevice.get('/api/me/stats').expect(200)).body as PlayerStats;
    expect(stats.records).toEqual([expect.objectContaining({ category: 'test', difficulty: 'facile', bestMs: 35_000 })]);
    // La partie suivante, jouée sur ce terminal, se compare au record établi sur l'autre.
    const next = await playGame(ctx, otherDevice, 45_000);
    expect(next.record).toEqual({ previous: { durationMs: 35_000, moves: 8 }, improved: false });
  });

  it('ne donne aucun record à un invité', async () => {
    const ctx = await setup();
    expect((await playGame(ctx, ctx.agent)).record).toBeNull();
    await ctx.agent.get('/api/me/stats').expect(401);
  });

  it('compte une partie abandonnée comme jouée, jamais comme record (EF-1.6)', async () => {
    const ctx = await setup();
    await register(ctx.agent);
    const game = (await ctx.agent.post('/api/games').send({ category: 'test', difficulty: 'facile' }).expect(201)).body as CreateGameResponse;
    await ctx.agent.post(`/api/games/${game.gameId}/abandon`).send({ token: game.token }).expect(204);
    const stats = (await ctx.agent.get('/api/me/stats').expect(200)).body as PlayerStats;
    expect(stats.totals).toMatchObject({ gamesPlayed: 1, gamesFinished: 0 });
    expect(stats.records).toEqual([]);
    expect(stats.history[0]).toMatchObject({ status: 'abandonnee' });
  });
});

describe('reprise du mode invité (EF-4.4)', () => {
  it('rattache au nouveau compte les parties validées jouées sur ce navigateur', async () => {
    const ctx = await setup();
    await playGame(ctx, ctx.agent, 35_000);
    await playGame(ctx, ctx.agent, 25_000);
    await register(ctx.agent);

    expect((await ctx.agent.get('/api/me/import-guest').expect(200)).body).toEqual({ available: 2 });
    expect((await ctx.agent.post('/api/me/import-guest').expect(200)).body).toEqual({ imported: 2 });
    const stats = (await ctx.agent.get('/api/me/stats').expect(200)).body as PlayerStats;
    expect(stats.records[0]).toMatchObject({ bestMs: 25_000, gamesFinished: 2 });

    expect((await ctx.agent.post('/api/me/import-guest').expect(200)).body).toEqual({ imported: 0 });
  });

  it('ne reprend pas les parties d’un autre navigateur', async () => {
    const ctx = await setup();
    await playGame(ctx, ctx.newAgent());
    await register(ctx.agent);
    expect((await ctx.agent.get('/api/me/import-guest').expect(200)).body).toEqual({ available: 0 });
  });
});

describe('profil et compte (EF-4.5, ENF-6)', () => {
  it('modifie pseudonyme et avatar, en refusant un pseudonyme pris', async () => {
    const ctx = await setup([]);
    const taken = await register(ctx.newAgent());
    await register(ctx.agent);
    const updated = await ctx.agent.patch('/api/me').send({ pseudo: 'Nouveau_Nom', avatar: 'prisme' }).expect(200);
    expect(updated.body).toMatchObject({ pseudo: 'Nouveau_Nom', avatar: 'prisme' });
    await ctx.agent.patch('/api/me').send({ pseudo: taken.pseudo.toLowerCase() }).expect(409);
    await ctx.agent.patch('/api/me').send({ avatar: 'inconnu' }).expect(400);
  });

  it('change le mot de passe sur confirmation et révoque les autres sessions', async () => {
    const ctx = await setup([]);
    const account = await register(ctx.agent);
    const other = ctx.newAgent();
    await other.post('/api/auth/login').send({ email: account.email, password: PASSWORD }).expect(200);

    await ctx.agent.post('/api/me/password').send({ currentPassword: 'mauvais', newPassword: 'nouveau-mot-de-passe' }).expect(403);
    await ctx.agent.post('/api/me/password').send({ currentPassword: PASSWORD, newPassword: 'nouveau-mot-de-passe' }).expect(204);
    expect((await ctx.agent.get('/api/auth/me').expect(200)).body.user).not.toBeNull();
    expect((await other.get('/api/auth/me').expect(200)).body.user).toBeNull();
  });

  it('exporte les données du compte en JSON (ENF-6.2, CA-10)', async () => {
    const ctx = await setup();
    const account = await register(ctx.agent);
    await playGame(ctx, ctx.agent);
    const response = await ctx.agent.get('/api/me/export').expect(200);
    expect(response.headers['content-disposition']).toMatch(/attachment; filename="recto-donnees-.+\.json"/);
    expect(response.body.account).toMatchObject({ email: account.email, pseudo: account.pseudo });
    expect(response.body.account).not.toHaveProperty('passwordHash');
    expect(response.body.games).toEqual([expect.objectContaining({ category: 'test', status: 'terminee', durationMs: 30_000 })]);
    expect(response.body.records).toHaveLength(1);
  });

  it('supprime définitivement le compte et ses données sur confirmation (ENF-6.3, CA-10)', async () => {
    const ctx = await setup();
    const account = await register(ctx.agent);
    await playGame(ctx, ctx.agent);

    await ctx.agent.post('/api/me/delete').send({ password: 'mauvais' }).expect(403);
    await ctx.agent.post('/api/me/delete').send({ password: PASSWORD }).expect(204);
    expect((await ctx.agent.get('/api/auth/me').expect(200)).body.user).toBeNull();
    await ctx.newAgent().post('/api/auth/login').send({ email: account.email, password: PASSWORD }).expect(401);
    expect(await ctx.users.findByEmail(account.email)).toBeUndefined();
  });
});
