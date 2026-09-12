import { DIFFICULTY_ORDER } from '@recto/shared';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { ADMIN_COOKIE, type AdminAuth } from '../admin/adminAuth';
import type { AdminService } from '../admin/adminService';
import { HttpError } from '../http/httpError';
import { rateLimit } from '../http/rateLimit';
import { parseBody } from '../http/validate';

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Champ facultatif : chaîne vide ou absente → null (les formulaires multipart n'envoient que des chaînes). */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value ? value : null));

/** Adresse http(s) uniquement : une URL javascript: finirait en lien sur la page de crédits. */
const httpUrl = z
  .string()
  .trim()
  .max(500)
  .refine((value) => /^https?:\/\/[^\s]+$/i.test(value), 'Adresse http(s) attendue.');

const slug = z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(60);

const categoryInputSchema = z.object({
  slug,
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(400),
  sortOrder: z.coerce.number().int().min(0).max(999),
  maxDifficulty: z.enum(DIFFICULTY_ORDER),
});

const categoryPatchSchema = categoryInputSchema.partial().extend({
  published: z.boolean().optional(),
  thumbnailImageId: z.string().regex(ID).nullable().optional(),
});

const imageMetadataSchema = z.object({
  title: z.string().trim().min(1).max(120),
  author: z.string().trim().min(1).max(300),
  sourceUrl: httpUrl,
  licence: z.string().trim().min(1).max(120),
  licenceUrl: httpUrl.nullish().or(z.literal('').transform(() => null)),
  retrievedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  caption: optionalText(400),
  date: optionalText(80),
  place: optionalText(120),
  visualGroup: optionalText(60),
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });

function id(raw: unknown, what: 'categorie' | 'image'): string {
  if (typeof raw !== 'string' || !ID.test(raw)) throw new HttpError(404, `${what}_introuvable`, 'Ressource introuvable.');
  return raw;
}

export function adminRouter(admin: AdminService, auth: AdminAuth): Router {
  const router = Router();

  router.get('/session', (req, res) => {
    res.json({ enabled: auth.enabled, authenticated: auth.verify(req.cookies?.[ADMIN_COOKIE]) });
  });

  // Cinq tentatives par minute et par adresse (ENF-5.3).
  const loginLimit = rateLimit({
    windowMs: 60_000,
    max: 5,
    key: (req) => req.ip ?? 'inconnue',
    message: 'Trop de tentatives. Réessayez dans une minute.',
  });

  router.post('/session', loginLimit, (req, res) => {
    if (!auth.enabled) throw new HttpError(503, 'admin_desactive', 'Back-office désactivé : ADMIN_SECRET n’est pas défini.');
    const { secret } = parseBody(z.object({ secret: z.string().min(1).max(256) }), req.body);
    if (!auth.checkSecret(secret)) throw new HttpError(401, 'secret_invalide', 'Secret d’administration incorrect.');
    res.cookie(ADMIN_COOKIE, auth.issue(), auth.cookieOptions);
    res.status(204).end();
  });

  router.delete('/session', (_req, res) => {
    res.clearCookie(ADMIN_COOKIE, { path: '/api/admin' });
    res.status(204).end();
  });

  router.use(auth.require);

  router.get('/categories', async (_req, res) => {
    res.json(await admin.listCategories());
  });

  router.post('/categories', async (req, res) => {
    res.status(201).json(await admin.createCategory(parseBody(categoryInputSchema, req.body)));
  });

  router.get('/categories/:id', async (req, res) => {
    res.json(await admin.getCategory(id(req.params.id, 'categorie')));
  });

  router.patch('/categories/:id', async (req, res) => {
    res.json(await admin.updateCategory(id(req.params.id, 'categorie'), parseBody(categoryPatchSchema, req.body)));
  });

  router.post('/categories/:id/images', upload.single('file'), async (req, res) => {
    if (!req.file) throw new HttpError(400, 'fichier_manquant', 'Aucun fichier reçu.');
    const metadata = parseBody(imageMetadataSchema, req.body);
    res.status(201).json(await admin.addImage(id(req.params.id, 'categorie'), req.file.buffer, req.file.mimetype, metadata));
  });

  router.patch('/images/:id', async (req, res) => {
    res.json(await admin.updateImage(id(req.params.id, 'image'), parseBody(imageMetadataSchema.partial(), req.body)));
  });

  router.delete('/images/:id', async (req, res) => {
    await admin.deleteImage(id(req.params.id, 'image'));
    res.status(204).end();
  });

  return router;
}
