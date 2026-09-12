import { existsSync } from 'node:fs';
import path from 'node:path';
import type { AdminCategoryDetail, AdminImage } from '@recto/shared';
import { describe, expect, it } from 'vitest';
import { ADMIN_SECRET, setup } from './helpers';
import { sampleJpeg } from './pipeline.test';

type Context = Awaited<ReturnType<typeof setup>>;

const SQUARE_SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect width="300" height="300"/></svg>');

const metadata = {
  title: 'Tour Eiffel',
  author: 'Jane Doe',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Exemple.jpg',
  licence: 'CC BY-SA 4.0',
  licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
  caption: 'Tour de fer puddlé de 330 m à Paris.',
  visualGroup: '',
};

async function login(ctx: Context) {
  await ctx.agent.post('/api/admin/session').send({ secret: ADMIN_SECRET }).expect(204);
}

function upload(ctx: Context, categoryId: string, file: Buffer, filename: string, fields: Record<string, string> = metadata) {
  const req = ctx.agent.post(`/api/admin/categories/${categoryId}/images`);
  for (const [key, value] of Object.entries(fields)) req.field(key, value);
  return req.attach('file', file, filename);
}

describe('accès au back-office (EF-7.5)', () => {
  it('exige une session ouverte avec le secret d’administration', async () => {
    const ctx = await setup([]);
    await ctx.agent.get('/api/admin/categories').expect(401);
    expect((await ctx.agent.get('/api/admin/session').expect(200)).body).toEqual({ enabled: true, authenticated: false });

    await ctx.agent.post('/api/admin/session').send({ secret: 'mauvais' }).expect(401);
    await login(ctx);
    expect((await ctx.agent.get('/api/admin/session').expect(200)).body.authenticated).toBe(true);
    await ctx.agent.get('/api/admin/categories').expect(200);

    await ctx.agent.delete('/api/admin/session').expect(204);
    await ctx.agent.get('/api/admin/categories').expect(401);
  });

  it('limite les tentatives à cinq par minute (ENF-5.3)', async () => {
    const ctx = await setup([]);
    for (let i = 0; i < 5; i++) await ctx.agent.post('/api/admin/session').send({ secret: 'mauvais' }).expect(401);
    await ctx.agent.post('/api/admin/session').send({ secret: ADMIN_SECRET }).expect(429);
  });

  it('reste fermé sans secret configuré', async () => {
    const ctx = await setup([], null);
    await ctx.agent.post('/api/admin/session').send({ secret: 'quelconque' }).expect(503);
    await ctx.agent.get('/api/admin/categories').expect(503);
  });
});

describe('catégories (EF-7.1, EF-7.4)', () => {
  it('crée une catégorie non publiée et refuse un identifiant d’adresse déjà pris', async () => {
    const ctx = await setup([]);
    await login(ctx);
    const input = { slug: 'monuments', name: 'Monuments', description: 'Monuments du monde.', sortOrder: 1, maxDifficulty: 'difficile' };
    const created = (await ctx.agent.post('/api/admin/categories').send(input).expect(201)).body as AdminCategoryDetail;
    expect(created).toMatchObject({ slug: 'monuments', published: false, imageCount: 0 });
    expect(created.issues).toContainEqual({ code: 'images_insuffisantes', required: 60, actual: 0 });
    await ctx.agent.post('/api/admin/categories').send(input).expect(409);
    await ctx.agent.post('/api/admin/categories').send({ ...input, slug: 'Pas Valide' }).expect(400);
  });

  it('bloque la publication tant que la volumétrie ne couvre pas la difficulté la plus élevée (CA-11)', async () => {
    const ctx = await setup([{ slug: 'faune', count: 15, published: false, maxDifficulty: 'facile' }]);
    await login(ctx);
    const id = ctx.categoryIds.get('faune')!;

    const refused = await ctx.agent.patch(`/api/admin/categories/${id}`).send({ published: true }).expect(422);
    expect(refused.body.error.details).toContainEqual({ code: 'images_insuffisantes', required: 16, actual: 15 });

    await upload(ctx, id, SQUARE_SVG, 'carre.svg').expect(201);
    const published = (await ctx.agent.patch(`/api/admin/categories/${id}`).send({ published: true }).expect(200)).body;
    expect(published.published).toBe(true);

    // Monter en difficulté exige 30 images pour Normal : refusé tant que la catégorie est publiée.
    await ctx.agent.patch(`/api/admin/categories/${id}`).send({ maxDifficulty: 'normal' }).expect(422);
  });

  it('empêche une suppression qui ferait passer une catégorie publiée sous son minimum', async () => {
    const ctx = await setup([{ slug: 'faune', count: 16, maxDifficulty: 'facile' }]);
    await login(ctx);
    const imageId = ctx.imageIds.get('faune')![3];
    await ctx.agent.delete(`/api/admin/images/${imageId}`).expect(409);
    await ctx.agent.patch(`/api/admin/categories/${ctx.categoryIds.get('faune')}`).send({ published: false }).expect(200);
    await ctx.agent.delete(`/api/admin/images/${imageId}`).expect(204);
  });
});

describe('images (EF-7.2, EF-7.3)', () => {
  it('traite une photographie : trois résolutions stockées, métadonnées et crédits enregistrés', async () => {
    const ctx = await setup([{ slug: 'monuments', count: 0, published: false }]);
    await login(ctx);
    const id = ctx.categoryIds.get('monuments')!;

    const image = (await upload(ctx, id, await sampleJpeg(), 'photo.jpg').expect(201)).body as AdminImage;
    expect(image).toMatchObject({ title: 'Tour Eiffel', author: 'Jane Doe', licence: 'CC BY-SA 4.0', visualGroup: null });
    expect(image.caption).toBe(metadata.caption);
    expect(image.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    if (image.sources.kind !== 'raster') throw new Error('image matricielle attendue');
    for (const url of [...Object.values(image.sources.avif), ...Object.values(image.sources.webp)]) {
      expect(existsSync(path.join(ctx.media.root, url.replace('/media/', ''))), url).toBe(true);
    }
    await ctx.agent.get(image.sources.avif[400]).expect(200).expect('content-type', /avif/);

    const detail = (await ctx.agent.get(`/api/admin/categories/${id}`).expect(200)).body as AdminCategoryDetail;
    expect(detail.images).toHaveLength(1);
  }, 20_000);

  it('exige titre, auteur, source et licence, et refuse les adresses non http', async () => {
    const ctx = await setup([{ slug: 'monuments', count: 0, published: false }]);
    await login(ctx);
    const id = ctx.categoryIds.get('monuments')!;
    await upload(ctx, id, SQUARE_SVG, 'a.svg', { ...metadata, licence: '' }).expect(400);
    await upload(ctx, id, SQUARE_SVG, 'a.svg', { ...metadata, author: '' }).expect(400);
    await upload(ctx, id, SQUARE_SVG, 'a.svg', { ...metadata, sourceUrl: 'javascript:alert(1)' }).expect(400);
  });

  it('refuse une image inexploitable avec un message explicite', async () => {
    const ctx = await setup([{ slug: 'monuments', count: 0, published: false }]);
    await login(ctx);
    const response = await upload(ctx, ctx.categoryIds.get('monuments')!, await sampleJpeg(200, 200), 'petite.jpg').expect(422);
    expect(response.body.error.message).toMatch(/trop petite/);
  });

  it('modifie les métadonnées d’une image, puis la supprime avec ses fichiers', async () => {
    const ctx = await setup([{ slug: 'monuments', count: 0, published: false }]);
    await login(ctx);
    const image = (await upload(ctx, ctx.categoryIds.get('monuments')!, SQUARE_SVG, 'a.svg').expect(201)).body as AdminImage;
    const updated = (await ctx.agent.patch(`/api/admin/images/${image.id}`).send({ place: 'Paris', visualGroup: 'tour' }).expect(200))
      .body as AdminImage;
    expect(updated).toMatchObject({ place: 'Paris', visualGroup: 'tour', title: 'Tour Eiffel' });

    if (image.sources.kind !== 'vector') throw new Error('image vectorielle attendue');
    const file = path.join(ctx.media.root, image.sources.url.replace('/media/', ''));
    expect(existsSync(file)).toBe(true);
    await ctx.agent.delete(`/api/admin/images/${image.id}`).expect(204);
    expect(existsSync(file)).toBe(false);
  });
});
