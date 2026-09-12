import { AVATARS, PASSWORD_MAX_LENGTH } from '@recto/shared';
import { Router } from 'express';
import { z } from 'zod';
import { toPublicUser, type AuthService } from '../auth/authService';
import { requireUser, userOf } from '../auth/middleware';
import type { SessionManager } from '../auth/sessions';
import { guestKey } from '../http/playerIdentity';
import { rateLimit } from '../http/rateLimit';
import { parseBody } from '../http/validate';
import type { RecordService } from '../records/recordService';
import { passwordSchema, pseudoSchema } from './auth';

const profileSchema = z.object({ pseudo: pseudoSchema.optional(), avatar: z.enum(AVATARS).optional() });
const confirmSchema = z.object({ password: z.string().min(1).max(PASSWORD_MAX_LENGTH) });
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  newPassword: passwordSchema,
});

/** /api/me — profil, statistiques, reprise du mode invité, portabilité et effacement. */
export function meRouter(auth: AuthService, records: RecordService, sessions: SessionManager): Router {
  const router = Router();
  router.use(requireUser);

  // Confirmations par mot de passe : même plafond que la connexion (ENF-5.3).
  const passwordLimit = rateLimit({
    windowMs: 60_000,
    max: 5,
    key: (_req) => `compte:${_req.res?.locals.user?.id}`,
    message: 'Trop de tentatives. Réessayez dans une minute.',
  });

  router.get('/stats', async (_req, res) => {
    res.json(await records.stats(userOf(res).id));
  });

  router.get('/import-guest', async (_req, res) => {
    res.json({ available: await records.countGuestGames(guestKey(res.locals.guestId!)) });
  });

  // EF-4.4 — rattache au compte les parties jouées sur ce navigateur avant l'inscription.
  router.post('/import-guest', async (_req, res) => {
    res.json({ imported: await records.claimGuestGames(guestKey(res.locals.guestId!), userOf(res).id) });
  });

  router.patch('/', async (req, res) => {
    res.json(toPublicUser(await auth.updateProfile(userOf(res), parseBody(profileSchema, req.body))));
  });

  router.post('/password', passwordLimit, async (req, res) => {
    const { currentPassword, newPassword } = parseBody(changePasswordSchema, req.body);
    // Les autres sessions sont révoquées ; celle-ci est renouvelée.
    await sessions.open(res, await auth.changePassword(userOf(res), currentPassword, newPassword));
    res.status(204).end();
  });

  // ENF-6.2 — portabilité : export JSON depuis l'interface.
  router.get('/export', async (_req, res) => {
    const user = userOf(res);
    const stats = await records.stats(user.id);
    const exportedAt = new Date();
    res.setHeader('Content-Disposition', `attachment; filename="recto-donnees-${exportedAt.toISOString().slice(0, 10)}.json"`);
    res.json({
      exportedAt: exportedAt.toISOString(),
      account: {
        email: user.email,
        pseudo: user.pseudo,
        avatar: user.avatar,
        role: user.role,
        createdAt: new Date(user.createdAt).toISOString(),
        emailVerifiedAt: user.emailVerifiedAt === null ? null : new Date(user.emailVerifiedAt).toISOString(),
      },
      totals: stats.totals,
      records: stats.records,
      games: await records.gamesOf(user.id),
    });
  });

  // ENF-6.3 — effacement définitif, sur confirmation du mot de passe.
  router.post('/delete', passwordLimit, async (req, res) => {
    await auth.deleteAccount(userOf(res), parseBody(confirmSchema, req.body).password);
    sessions.close(res);
    res.status(204).end();
  });

  return router;
}
