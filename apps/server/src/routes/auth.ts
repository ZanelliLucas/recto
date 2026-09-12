import { AVATARS, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, PSEUDO_PATTERN } from '@recto/shared';
import { Router } from 'express';
import { z } from 'zod';
import { normalizeEmail, toPublicUser, type AuthService } from '../auth/authService';
import { requireUser, userOf } from '../auth/middleware';
import type { SessionManager } from '../auth/sessions';
import { rateLimit } from '../http/rateLimit';
import { parseBody } from '../http/validate';

export const emailSchema = z.string().trim().max(254).email();
export const passwordSchema = z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH);
export const pseudoSchema = z.string().trim().regex(PSEUDO_PATTERN);

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  pseudo: pseudoSchema,
  avatar: z.enum(AVATARS),
  ageConfirmed: z.literal(true),
});
const loginSchema = z.object({ email: z.string().trim().max(254), password: z.string().min(1).max(PASSWORD_MAX_LENGTH) });
const tokenSchema = z.object({ token: z.string().min(20).max(100) });

const MINUTE = 60_000;
const TOO_MANY = 'Trop de tentatives. Réessayez dans une minute.';
const byIp = (prefix: string, max: number) =>
  rateLimit({ windowMs: MINUTE, max, key: (req) => `${prefix}:${req.ip}`, message: TOO_MANY });
const byEmail = (prefix: string, max: number) =>
  rateLimit({
    windowMs: MINUTE,
    max,
    key: (req) => `${prefix}:${normalizeEmail(String((req.body as { email?: unknown } | undefined)?.email ?? ''))}`,
    message: TOO_MANY,
  });

/** POST /api/auth/* (§ 5.3) — ENF-5.3 : cinq tentatives de connexion par minute et par adresse. */
export function authRouter(auth: AuthService, sessions: SessionManager): Router {
  const router = Router();

  router.get('/me', (_req, res) => {
    res.json({ user: res.locals.user ? toPublicUser(res.locals.user) : null });
  });

  router.post('/register', byIp('inscription', 10), async (req, res) => {
    const user = await auth.register(parseBody(registerSchema, req.body));
    await sessions.open(res, user);
    res.status(201).json(toPublicUser(user));
  });

  router.post('/login', byIp('connexion-ip', 20), byEmail('connexion', 5), async (req, res) => {
    const { email, password } = parseBody(loginSchema, req.body);
    const user = await auth.login(email, password);
    await sessions.open(res, user);
    res.json(toPublicUser(user));
  });

  router.post('/logout', (_req, res) => {
    sessions.close(res);
    res.status(204).end();
  });

  router.post('/verify-email', byIp('verification', 20), async (req, res) => {
    await auth.verifyEmail(parseBody(tokenSchema, req.body).token);
    res.status(204).end();
  });

  router.post(
    '/resend-verification',
    requireUser,
    rateLimit({ windowMs: MINUTE, max: 2, key: (req) => `renvoi:${req.res?.locals.user?.id}`, message: TOO_MANY }),
    async (_req, res) => {
      await auth.sendVerification(userOf(res));
      res.status(204).end();
    },
  );

  router.post('/forgot-password', byIp('oubli-ip', 10), byEmail('oubli', 3), async (req, res) => {
    const { email } = parseBody(z.object({ email: emailSchema }), req.body);
    await auth.requestPasswordReset(email);
    res.status(204).end();
  });

  router.post('/reset-password', byIp('reinitialisation', 20), async (req, res) => {
    const { token, password } = parseBody(tokenSchema.extend({ password: passwordSchema }), req.body);
    await sessions.open(res, await auth.resetPassword(token, password));
    res.status(204).end();
  });

  return router;
}
