import type { CreateGameResponse, DailyChallenge, FinishGameResponse } from '@recto/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { perfectMoves, register, setup, type Context } from './helpers';

let ctx: Context;

beforeEach(async () => {
  // Deux catégories jouables en « normal » : la rotation du défi a de quoi choisir.
  ctx = await setup([
    { slug: 'test', count: 60 },
    { slug: 'autre', count: 60 },
  ]);
});

/** Joue le défi du jour de bout en bout et renvoie le résultat. */
async function playDaily(agent: ReturnType<Context['newAgent']>, elapsedMs: number): Promise<FinishGameResponse> {
  const { body: challenge } = await agent.get('/api/defi').expect(200);
  const { category, difficulty } = challenge as DailyChallenge;
  const game = (await agent.post('/api/games').send({ category, difficulty, daily: true }).expect(201))
    .body as CreateGameResponse;
  await agent.post(`/api/games/${game.gameId}/start`).send({ token: game.token }).expect(200);
  ctx.advance(3_000 + elapsedMs);
  const finish = await agent
    .post(`/api/games/${game.gameId}/finish`)
    .send({ token: game.token, moves: perfectMoves(game.deck) })
    .expect(200);
  return finish.body as FinishGameResponse;
}

describe('défi du jour', () => {
  it('propose une catégorie et une difficulté au jour le jour', async () => {
    const { body } = await ctx.agent.get('/api/defi').expect(200);
    const challenge = body as DailyChallenge;
    expect(challenge.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(challenge.difficulty).toBe('normal');
    expect(['test', 'autre']).toContain(challenge.category);
    expect(challenge.leaderboard).toEqual([]);
    expect(challenge.mine).toBeNull();
    expect(challenge.players).toBe(0);
  });

  it('donne exactement la même grille à deux joueurs', async () => {
    const { body: challenge } = await ctx.agent.get('/api/defi').expect(200);
    const { category, difficulty } = challenge as DailyChallenge;
    const create = async () =>
      (await ctx.newAgent().post('/api/games').send({ category, difficulty, daily: true }).expect(201))
        .body as CreateGameResponse;

    const [first, second] = [await create(), await create()];
    expect(second.deck).toEqual(first.deck);
    expect(second.images.map((image) => image.id)).toEqual(first.images.map((image) => image.id));
  });

  it('refuse une partie du défi sur une autre catégorie ou une autre difficulté', async () => {
    const { body: challenge } = await ctx.agent.get('/api/defi').expect(200);
    const { category } = challenge as DailyChallenge;
    const other = category === 'test' ? 'autre' : 'test';
    await ctx.agent.post('/api/games').send({ category: other, difficulty: 'normal', daily: true }).expect(409);
    await ctx.agent.post('/api/games').send({ category, difficulty: 'facile', daily: true }).expect(409);
  });

  it('classe les comptes, du plus rapide au plus lent, et laisse les invités hors du tableau', async () => {
    const rapide = ctx.newAgent();
    const lent = ctx.newAgent();
    await register(rapide, { email: 'rapide@recto.test', pseudo: 'Rapide' });
    await register(lent, { email: 'lent@recto.test', pseudo: 'Lent' });

    await playDaily(lent, 90_000);
    await playDaily(rapide, 40_000);
    await playDaily(ctx.newAgent(), 20_000); // invité : joue, mais n'est pas classé

    const { body } = await rapide.get('/api/defi').expect(200);
    const challenge = body as DailyChallenge;
    expect(challenge.players).toBe(2);
    expect(challenge.leaderboard.map((entry) => entry.pseudo)).toEqual(['Rapide', 'Lent']);
    expect(challenge.leaderboard.map((entry) => entry.rank)).toEqual([1, 2]);
    expect(challenge.leaderboard[0]!.mine).toBe(true);
    expect(challenge.mine).toMatchObject({ rank: 1, pseudo: 'Rapide' });
  });

  it('ne retient que la première partie du jour : rejouer n’améliore pas son rang', async () => {
    const joueur = ctx.newAgent();
    await register(joueur, { email: 'joueur@recto.test', pseudo: 'Joueur' });

    const premier = await playDaily(joueur, 90_000);
    await playDaily(joueur, 45_000);

    const { body } = await joueur.get('/api/defi').expect(200);
    expect((body as DailyChallenge).mine?.durationMs).toBe(premier.durationMs);
    expect((body as DailyChallenge).players).toBe(1);
  });
});
