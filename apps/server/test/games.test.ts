import { COUNTDOWN_MS, drawSignature, type CreateGameResponse, type Difficulty, type PlayerStats } from '@recto/shared';
import { describe, expect, it } from 'vitest';
import { imageIndex, perfectMoves, register, setup } from './helpers';

type Agent = Awaited<ReturnType<typeof setup>>['agent'];

async function open(agent: Agent, difficulty: Difficulty = 'facile', category = 'test') {
  const response = await agent.post('/api/games').send({ category, difficulty }).expect(201);
  return response.body as CreateGameResponse;
}

async function openAndStart(agent: Agent, difficulty: Difficulty = 'facile') {
  const game = await open(agent, difficulty);
  await agent.post(`/api/games/${game.gameId}/start`).send({ token: game.token }).expect(200, { countdownMs: COUNTDOWN_MS });
  return game;
}

describe('GET /api/categories', () => {
  it('ne liste que les catégories publiées et assez fournies, avec leurs difficultés jouables', async () => {
    const { agent } = await setup([
      { slug: 'complete', count: 60 },
      { slug: 'plafonnee', count: 60, maxDifficulty: 'normal' },
      { slug: 'petite', count: 20 },
      { slug: 'trop-petite', count: 10 },
      { slug: 'brouillon', count: 60, published: false },
    ]);
    const response = await agent.get('/api/categories').expect(200);
    const bySlug = Object.fromEntries((response.body as { slug: string; difficulties: string[] }[]).map((c) => [c.slug, c]));
    expect(Object.keys(bySlug).sort()).toEqual(['complete', 'petite', 'plafonnee']);
    expect(bySlug.complete).toMatchObject({ imageCount: 60, difficulties: ['facile', 'normal', 'difficile'] });
    expect(bySlug.plafonnee).toMatchObject({ difficulties: ['facile', 'normal'] });
    expect(bySlug.petite).toMatchObject({ difficulties: ['facile'] });
    expect(bySlug.complete).toMatchObject({ thumbnail: { kind: 'vector', url: '/media/img/complete-0.svg' } });
  });
});

describe('GET /api/categories/:slug/cards', () => {
  it('présente les cartes d’une catégorie publiée, triées, avec leurs fiches (EF-7.3)', async () => {
    const ctx = await setup([
      { slug: 'test', count: 60 },
      { slug: 'brouillon', count: 60, published: false },
    ]);
    const { body } = await ctx.agent.get('/api/categories/test/cards').expect(200);
    const titles = (body as { title: string }[]).map((card) => card.title);
    expect(titles).toHaveLength(60);
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b, 'fr')));
    expect(body[0]).toMatchObject({ title: 'Image 0', infoUrl: 'https://fr.wikipedia.org/wiki/test', caption: null });
    await ctx.agent.get('/api/categories/brouillon/cards').expect(404);
    await ctx.agent.get('/api/categories/inconnue/cards').expect(404);
  });
});

describe('GET /api/credits', () => {
  it('restitue auteur, source et licence des images publiées (ENF-8)', async () => {
    const { agent } = await setup([
      { slug: 'publique', count: 2 },
      { slug: 'brouillon', count: 2, published: false },
    ]);
    const response = await agent.get('/api/credits').expect(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].images[0]).toMatchObject({ author: 'Test', licence: 'Domaine public' });
  });
});

describe('POST /api/games', () => {
  it('distribue chaque image exactement deux fois et pose un cookie invité', async () => {
    const { agent } = await setup();
    const response = await agent.post('/api/games').send({ category: 'test', difficulty: 'normal' }).expect(201);
    const game = response.body as CreateGameResponse;

    expect(response.headers['set-cookie']?.[0]).toMatch(/^recto_gid=.+HttpOnly/);
    expect(game.pairs).toBe(15);
    expect(game.deck).toHaveLength(30);
    expect(game.images).toHaveLength(15);
    expect(game.images[0]?.sources.kind).toBe('vector');
    for (const image of game.images) expect(game.deck.filter((id) => id === image.id)).toHaveLength(2);
  });

  it('respecte les groupes visuels (EF-3.9)', async () => {
    const { agent } = await setup([{ slug: 'test', count: 60, visualGroup: (i) => `g${i % 40}` }]);
    const game = await open(agent, 'difficile');
    const groups = game.images.map((image) => imageIndex(image.title) % 40);
    expect(new Set(groups).size).toBe(30);
  });

  it('ne présente jamais deux tirages consécutifs identiques (EF-1.8, CA-05)', async () => {
    // 16 images pour 9 groupes : le tirage retomberait souvent sur le précédent sans remplacement.
    const { agent } = await setup([{ slug: 'test', count: 16, visualGroup: (i) => `g${i % 9}` }]);
    let previous = drawSignature((await open(agent)).images.map((image) => image.id));
    for (let i = 0; i < 25; i++) {
      const current = drawSignature((await open(agent)).images.map((image) => image.id));
      expect(current).not.toBe(previous);
      previous = current;
    }
  });

  it('refuse une difficulté inconnue ou indisponible, et une catégorie absente', async () => {
    const { agent } = await setup([{ slug: 'test', count: 20 }]);
    await agent.post('/api/games').send({ category: 'test', difficulty: 'expert' }).expect(400);
    await agent.post('/api/games').send({ category: 'test', difficulty: 'difficile' }).expect(400);
    await agent.post('/api/games').send({ category: 'absente', difficulty: 'facile' }).expect(404);
  });

  it('limite le débit d’ouverture de parties (ENF-1.3)', async () => {
    const { agent } = await setup();
    for (let i = 0; i < 30; i++) await open(agent);
    await agent.post('/api/games').send({ category: 'test', difficulty: 'facile' }).expect(429);
  });
});

describe('chronométrage et clôture', () => {
  it('mesure la durée côté serveur, décompte exclu (ENF-1.1)', async () => {
    const { agent, advance } = await setup();
    const game = await openAndStart(agent);
    advance(COUNTDOWN_MS + 20_000);
    const response = await agent
      .post(`/api/games/${game.gameId}/finish`)
      .send({ token: game.token, moves: perfectMoves(game.deck) })
      .expect(200);
    expect(response.body).toEqual({ durationMs: 20_000, moves: 8, pairs: 8, accuracy: 1, record: null });
  });

  it('compte les coups en rejouant la partie, pas en croyant le client', async () => {
    const { agent, advance } = await setup();
    const game = await openAndStart(agent);
    const moves = perfectMoves(game.deck);
    const [a] = moves[0]!;
    const [, b] = moves[1]!;
    advance(COUNTDOWN_MS + 30_000);
    const response = await agent
      .post(`/api/games/${game.gameId}/finish`)
      .send({ token: game.token, moves: [[a, b], ...moves] })
      .expect(200);
    expect(response.body).toMatchObject({ moves: 9, accuracy: 8 / 9 });
  });

  it('déduit les pauses de la durée (EF-1.5)', async () => {
    const { agent, advance } = await setup();
    const game = await openAndStart(agent);
    advance(COUNTDOWN_MS + 5_000);
    await agent.post(`/api/games/${game.gameId}/pause`).send({ token: game.token }).expect(204);
    advance(60_000);
    await agent.post(`/api/games/${game.gameId}/resume`).send({ token: game.token }).expect(204);
    advance(5_000);
    const response = await agent
      .post(`/api/games/${game.gameId}/finish`)
      .send({ token: game.token, moves: perfectMoves(game.deck) })
      .expect(200);
    expect(response.body.durationMs).toBe(10_000);
  });

  it('refuse la pause pendant le décompte', async () => {
    const { agent } = await setup();
    const game = await openAndStart(agent);
    await agent.post(`/api/games/${game.gameId}/pause`).send({ token: game.token }).expect(409);
  });

  it('rejette une durée invraisemblable, puis toute nouvelle tentative (ENF-1.2, CA-06)', async () => {
    const { agent, advance } = await setup();
    const game = await openAndStart(agent);
    advance(COUNTDOWN_MS + 1_000); // plancher : 8 paires × 300 ms = 2,4 s
    const body = { token: game.token, moves: perfectMoves(game.deck) };
    const rejected = await agent.post(`/api/games/${game.gameId}/finish`).send(body).expect(422);
    expect(rejected.body.error.code).toBe('duree_invraisemblable');
    advance(60_000);
    await agent.post(`/api/games/${game.gameId}/finish`).send(body).expect(409);
  });

  it('rejette une clôture pendant le décompte', async () => {
    const { agent, advance } = await setup();
    const game = await openAndStart(agent);
    advance(1_000);
    await agent
      .post(`/api/games/${game.gameId}/finish`)
      .send({ token: game.token, moves: perfectMoves(game.deck) })
      .expect(422);
  });

  it('rejette une partie inachevée', async () => {
    const { agent, advance } = await setup();
    const game = await openAndStart(agent);
    advance(COUNTDOWN_MS + 30_000);
    const response = await agent
      .post(`/api/games/${game.gameId}/finish`)
      .send({ token: game.token, moves: perfectMoves(game.deck).slice(1) })
      .expect(422);
    expect(response.body.error.code).toBe('coups_invalides');
  });

  it('ne clôt une partie qu’une seule fois : une clôture répétée rend le même résultat', async () => {
    const { agent, advance } = await setup();
    const game = await openAndStart(agent);
    advance(COUNTDOWN_MS + 30_000);
    const body = { token: game.token, moves: perfectMoves(game.deck) };
    const first = await agent.post(`/api/games/${game.gameId}/finish`).send(body).expect(200);
    // Réponse perdue puis nouvelle tentative, plus tard : même durée, rien n'est recompté.
    advance(20_000);
    const again = await agent.post(`/api/games/${game.gameId}/finish`).send(body).expect(200);
    expect(again.body).toEqual(first.body);
    // Une autre liste de coups ne peut pas remplacer la première.
    const other = game.deck.findIndex((id) => id !== game.deck[0]);
    await agent
      .post(`/api/games/${game.gameId}/finish`)
      .send({ token: game.token, moves: [[0, other], ...perfectMoves(game.deck)] })
      .expect(409);
  });

  it('rend au compte la même comparaison au record, sans la recompter', async () => {
    const ctx = await setup();
    await register(ctx.agent);
    const game = await openAndStart(ctx.agent);
    ctx.advance(COUNTDOWN_MS + 30_000);
    const body = { token: game.token, moves: perfectMoves(game.deck) };
    const first = await ctx.agent.post(`/api/games/${game.gameId}/finish`).send(body).expect(200);
    expect(first.body.record).toEqual({ previous: null, improved: true });
    const again = await ctx.agent.post(`/api/games/${game.gameId}/finish`).send(body).expect(200);
    expect(again.body).toEqual(first.body);
    const stats = (await ctx.agent.get('/api/me/stats').expect(200)).body as PlayerStats;
    expect(stats.totals).toMatchObject({ gamesPlayed: 1, gamesFinished: 1 });
  });

  it('exige le secret de la partie', async () => {
    const { agent, advance } = await setup();
    const game = await openAndStart(agent);
    advance(COUNTDOWN_MS + 30_000);
    await agent
      .post(`/api/games/${game.gameId}/finish`)
      .send({ token: 'mauvais-secret', moves: perfectMoves(game.deck) })
      .expect(404);
    await agent.post('/api/games/pas-un-identifiant/start').send({ token: game.token }).expect(404);
  });

  it('refuse un démarrage tant que la partie a déjà commencé', async () => {
    const { agent } = await setup();
    const game = await openAndStart(agent);
    await agent.post(`/api/games/${game.gameId}/start`).send({ token: game.token }).expect(409);
  });

  it('enregistre un abandon, après quoi la partie ne peut plus être close (EF-1.6)', async () => {
    const { agent, advance } = await setup();
    const game = await openAndStart(agent);
    await agent.post(`/api/games/${game.gameId}/abandon`).send({ token: game.token }).expect(204);
    advance(COUNTDOWN_MS + 30_000);
    await agent
      .post(`/api/games/${game.gameId}/finish`)
      .send({ token: game.token, moves: perfectMoves(game.deck) })
      .expect(409);
  });
});
