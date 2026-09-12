import type { Request, RequestHandler } from 'express';
import { HttpError } from './httpError';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  key: (req: Request) => string;
  message: string;
}

/** Limitation du débit à fenêtre fixe, en mémoire : suffisante pour une instance unique. */
export function rateLimit({ windowMs, max, key, message }: RateLimitOptions): RequestHandler {
  const windows = new Map<string, { count: number; resetAt: number }>();

  return (req, res, next) => {
    const now = Date.now();
    if (windows.size > 10_000) {
      for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
    }
    const id = key(req);
    let window = windows.get(id);
    if (!window || window.resetAt <= now) {
      window = { count: 0, resetAt: now + windowMs };
      windows.set(id, window);
    }
    window.count++;
    if (window.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((window.resetAt - now) / 1000)));
      throw new HttpError(429, 'trop_de_requetes', message);
    }
    next();
  };
}
