import { describe, expect, it } from 'vitest';
import { normalizePath } from '../src/audience/audienceService';
import { pageViews } from '../src/db/schema';
import { playGame, setup } from './helpers';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('mesure d’audience sans cookie (ENF-6.4)', () => {
  it('ramène chaque adresse à un gabarit sans donnée propre au visiteur', () => {
    const slugs = new Set(['monuments']);
    expect(normalizePath('/', slugs)).toBe('/');
    expect(normalizePath('/categories/', slugs)).toBe('/categories');
    expect(normalizePath('/reinitialisation?jeton=secret', slugs)).toBe('/reinitialisation');
    expect(normalizePath('/jouer/monuments', slugs)).toBe('/jouer/monuments');
    expect(normalizePath('/jouer/inventee', slugs)).toBeNull();
    expect(normalizePath('/partie/0f8e-12/resultat', slugs)).toBe('/partie/resultat');
    expect(normalizePath('/partie/0f8e-12', slugs)).toBe('/partie');
    expect(normalizePath('/admin/categories', slugs)).toBeNull();
    expect(normalizePath('/nulle-part', slugs)).toBeNull();
  });

  it('compte une vue par page et par jour, sans cookie ni robot', async () => {
    const ctx = await setup([{ slug: 'monuments', count: 60 }]);
    const agent = ctx.newAgent();
    const paths = ['/', '/', '/jouer/monuments', '/partie/1234/resultat', '/reinitialisation?jeton=secret', '/admin', '/nulle-part'];
    for (const path of paths) {
      const response = await agent.post('/api/audience').send({ path }).expect(204);
      expect(response.headers['set-cookie']).toBeUndefined();
    }
    await agent.post('/api/audience').set('User-Agent', 'Mozilla/5.0 (compatible; Googlebot/2.1)').send({ path: '/' }).expect(204);

    const rows = await ctx.db.select().from(pageViews);
    expect(Object.fromEntries(rows.map((row) => [row.path, row.views]))).toEqual({
      '/': 2,
      '/jouer/monuments': 1,
      '/partie/resultat': 1,
      '/reinitialisation': 1,
    });
  });

  it('résume trente jours de fréquentation et de parties, puis purge à l’échéance', async () => {
    const ctx = await setup();
    await ctx.agent.post('/api/audience').send({ path: '/categories' }).expect(204);
    await playGame(ctx, ctx.agent);

    const summary = await ctx.audience.summary(30);
    expect(summary.days).toHaveLength(30);
    expect(summary.days.at(-1)).toMatchObject({ views: 1, gamesStarted: 1, gamesFinished: 1 });
    expect(summary.pages).toEqual([{ path: '/categories', views: 1 }]);
    expect(summary.categories).toEqual([{ name: 'test', games: 1, finished: 1 }]);

    expect(await ctx.audience.purge(ctx.now() + DAY_MS)).toBe(1);
    expect(await ctx.db.select().from(pageViews)).toEqual([]);
  });

  it('réserve la synthèse au back-office', async () => {
    const ctx = await setup([]);
    await ctx.agent.get('/api/admin/audience').expect(401);
  });
});

describe('erreurs du navigateur (§ 7.5)', () => {
  it('accepte un signalement borné et refuse un corps invalide', async () => {
    const ctx = await setup([]);
    await ctx.agent.post('/api/client-errors').send({ message: 'TypeError: x', path: '/partie/1?jeton=a' }).expect(204);
    await ctx.agent.post('/api/client-errors').send({ message: 'x'.repeat(600), path: '/' }).expect(400);
  });
});
