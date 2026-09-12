import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { CookieOptions, RequestHandler } from 'express';
import { HttpError } from '../http/httpError';

export const ADMIN_COOKIE = 'recto_admin';
const SESSION_MS = 12 * 60 * 60 * 1000;

const digest = (value: string) => createHash('sha256').update(value).digest();

/**
 * Accès au back-office par secret d'administration (EF-7.5), en attendant le rôle
 * administrateur des comptes du lot 3. La session est un jeton signé en cookie
 * httpOnly, limité au chemin /api/admin.
 */
export class AdminAuth {
  readonly cookieOptions: CookieOptions;

  constructor(
    private readonly secret: string | null,
    secureCookie: boolean,
    private readonly now: () => number = Date.now,
  ) {
    this.cookieOptions = { httpOnly: true, sameSite: 'strict', secure: secureCookie, path: '/api/admin', maxAge: SESSION_MS };
  }

  get enabled(): boolean {
    return this.secret !== null;
  }

  checkSecret(candidate: string): boolean {
    return this.secret !== null && timingSafeEqual(digest(candidate), digest(this.secret));
  }

  issue(): string {
    const payload = `v1.${this.now() + SESSION_MS}`;
    return `${payload}.${this.sign(payload)}`;
  }

  verify(token: unknown): boolean {
    if (this.secret === null || typeof token !== 'string') return false;
    const [version, expires, mac] = token.split('.');
    if (version !== 'v1' || !expires || !mac || Number(expires) < this.now()) return false;
    const expected = Buffer.from(this.sign(`v1.${expires}`));
    const received = Buffer.from(mac);
    return expected.length === received.length && timingSafeEqual(expected, received);
  }

  readonly require: RequestHandler = (req, _res, next) => {
    if (!this.enabled) throw new HttpError(503, 'admin_desactive', 'Back-office désactivé : ADMIN_SECRET n’est pas défini.');
    if (!this.verify(req.cookies?.[ADMIN_COOKIE])) throw new HttpError(401, 'non_authentifie', 'Authentification requise.');
    next();
  };

  private sign(payload: string): string {
    return createHmac('sha256', this.secret!).update(payload).digest('base64url');
  }
}
