import { and, asc, eq, inArray, type SQL } from 'drizzle-orm';
import type { Database } from '../db/client';
import { categories, images } from '../db/schema';
import type { CategoryRepository, ContentCategory, ContentImage } from './types';

type CategoryRow = typeof categories.$inferSelect;
export type CategoryUpdate = Partial<Omit<CategoryRow, 'id' | 'createdAt'>>;
export type ImageUpdate = Partial<Omit<ContentImage, 'id' | 'categoryId' | 'kind' | 'storageKey' | 'createdAt'>>;

/** Catégories et images en base (EF-3, EF-7). */
export class SqlContentRepository implements CategoryRepository {
  constructor(private readonly db: Database) {}

  listPublished(): Promise<ContentCategory[]> {
    return this.load(eq(categories.published, true));
  }

  async findPublished(slug: string): Promise<ContentCategory | undefined> {
    return (await this.load(and(eq(categories.published, true), eq(categories.slug, slug))))[0];
  }

  listAll(): Promise<ContentCategory[]> {
    return this.load();
  }

  async findById(id: string): Promise<ContentCategory | undefined> {
    return (await this.load(eq(categories.id, id)))[0];
  }

  async findBySlug(slug: string): Promise<ContentCategory | undefined> {
    return (await this.load(eq(categories.slug, slug)))[0];
  }

  async insertCategory(row: CategoryRow): Promise<void> {
    await this.db.insert(categories).values(row);
  }

  async updateCategory(id: string, update: CategoryUpdate): Promise<void> {
    await this.db.update(categories).set(update).where(eq(categories.id, id));
  }

  async findImage(id: string): Promise<ContentImage | undefined> {
    return this.db.select().from(images).where(eq(images.id, id)).get();
  }

  async insertImage(image: ContentImage): Promise<void> {
    await this.db.insert(images).values(image);
  }

  async updateImage(id: string, update: ImageUpdate): Promise<void> {
    await this.db.update(images).set(update).where(eq(images.id, id));
  }

  async deleteImage(id: string): Promise<void> {
    await this.db.delete(images).where(eq(images.id, id));
  }

  private async load(where?: SQL): Promise<ContentCategory[]> {
    const rows = await this.db
      .select()
      .from(categories)
      .where(where)
      .orderBy(asc(categories.sortOrder), asc(categories.name));
    if (rows.length === 0) return [];

    const imageRows = await this.db
      .select()
      .from(images)
      .where(inArray(images.categoryId, rows.map((row) => row.id)))
      .orderBy(asc(images.createdAt), asc(images.title));
    const byCategory = new Map<string, ContentImage[]>();
    for (const image of imageRows) {
      byCategory.set(image.categoryId, [...(byCategory.get(image.categoryId) ?? []), image]);
    }
    return rows.map((row) => ({ ...row, images: byCategory.get(row.id) ?? [] }));
  }
}
