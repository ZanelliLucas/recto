import { hash, verify } from '@node-rs/argon2';

/** Argon2id, paramètres recommandés par l'OWASP : 19 Mio, deux passes (§ 5.1). */
const OPTIONS = { algorithm: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

let dummyHash: Promise<string> | null = null;

/**
 * Vérifie un mot de passe. Sans compte correspondant, on vérifie contre une empreinte
 * factice : la durée de réponse ne révèle pas si l'adresse est inscrite.
 */
export async function verifyPassword(passwordHash: string | null, password: string): Promise<boolean> {
  dummyHash ??= hashPassword('recto-empreinte-factice-de-reference');
  const target = passwordHash ?? (await dummyHash);
  const ok = await verify(target, password).catch(() => false);
  return ok && passwordHash !== null;
}
