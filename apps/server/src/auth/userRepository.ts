import { and, eq } from 'drizzle-orm';
import type { Database } from '../db/client';
import { emailTokens, games, personalBests, users } from '../db/schema';

export type UserRecord = typeof users.$inferSelect;
export type TokenPurpose = (typeof emailTokens.$inferSelect)['purpose'];

export class SqlUserRepository {
  constructor(private readonly db: Database) {}

  findById(id: string): Promise<UserRecord | undefined> {
    return this.db.select().from(users).where(eq(users.id, id)).get();
  }

  findByEmail(email: string): Promise<UserRecord | undefined> {
    return this.db.select().from(users).where(eq(users.email, email)).get();
  }

  findByPseudoKey(pseudoKey: string): Promise<UserRecord | undefined> {
    return this.db.select().from(users).where(eq(users.pseudoKey, pseudoKey)).get();
  }

  async insert(user: UserRecord): Promise<void> {
    await this.db.insert(users).values(user);
  }

  async update(id: string, patch: Partial<Omit<UserRecord, 'id' | 'createdAt'>>): Promise<void> {
    await this.db.update(users).set(patch).where(eq(users.id, id));
  }

  /** ENF-6.3 — effacement du compte et de toutes les données qui lui sont rattachées. */
  async delete(id: string): Promise<void> {
    await this.db.batch([
      this.db.delete(emailTokens).where(eq(emailTokens.userId, id)),
      this.db.delete(personalBests).where(eq(personalBests.userId, id)),
      this.db.delete(games).where(eq(games.userId, id)),
      this.db.delete(users).where(eq(users.id, id)),
    ]);
  }

  /** Un seul jeton valide par compte et par usage : le précédent est remplacé. */
  async replaceToken(row: typeof emailTokens.$inferInsert): Promise<void> {
    await this.db.batch([
      this.db.delete(emailTokens).where(and(eq(emailTokens.userId, row.userId), eq(emailTokens.purpose, row.purpose))),
      this.db.insert(emailTokens).values(row),
    ]);
  }

  /** Consomme un jeton : renvoie le compte s'il est valide, et le rend inutilisable dans tous les cas. */
  async consumeToken(tokenHash: string, purpose: TokenPurpose, now: number): Promise<string | null> {
    const row = await this.db.select().from(emailTokens).where(eq(emailTokens.tokenHash, tokenHash)).get();
    if (!row) return null;
    await this.db.delete(emailTokens).where(eq(emailTokens.tokenHash, tokenHash));
    return row.purpose === purpose && row.expiresAt > now ? row.userId : null;
  }
}
