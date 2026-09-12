import type { ZodType } from 'zod';
import { HttpError } from './httpError';

/** ENF-5.2 — toute donnée entrante est validée côté serveur. */
export function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) throw new HttpError(400, 'requete_invalide', 'Paramètres invalides.');
  return result.data;
}
