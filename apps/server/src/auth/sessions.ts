import type { CookieOptions, Response } from 'express';
import { jwtVerify, SignJWT } from 'jose';

export const SESSION_COOKIE = 'recto_session';
const SESSION_DAYS = 30;

/**
 * Session : jeton JWT signé, en cookie httpOnly SameSite=Lax (§ 5.1), inaccessible
 * au code client. La version portée par le jeton permet de révoquer d'un coup toutes
 * les sessions d'un compte.
 */
export class SessionManager {
  private readonly key: Uint8Array;
  private readonly cookieOptions: CookieOptions;

  constructor(secret: string, secureCookie: boolean) {
    this.key = new TextEncoder().encode(secret);
    this.cookieOptions = {
      httpOnly: true,
      sameSite: 'lax',
      secure: secureCookie,
      path: '/',
      maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    };
  }

  async open(res: Response, user: { id: string; tokenVersion: number }): Promise<void> {
    const token = await new SignJWT({ ver: user.tokenVersion })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime(`${SESSION_DAYS}d`)
      .sign(this.key);
    res.cookie(SESSION_COOKIE, token, this.cookieOptions);
  }

  close(res: Response): void {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
  }

  async read(token: unknown): Promise<{ userId: string; version: number } | null> {
    if (typeof token !== 'string' || token.length === 0) return null;
    try {
      const { payload } = await jwtVerify(token, this.key, { algorithms: ['HS256'] });
      if (typeof payload.sub !== 'string' || typeof payload.ver !== 'number') return null;
      return { userId: payload.sub, version: payload.ver };
    } catch {
      return null;
    }
  }
}
