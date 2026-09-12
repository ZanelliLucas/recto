import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { CategoryRepository, ContentCategory } from './types';

const imageSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  file: z.string().regex(/^[\w.-]+\.(svg|avif|webp)$/),
  author: z.string().min(1),
  sourceUrl: z.string().url(),
  licence: z.string().min(1),
  retrievedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  visualGroup: z.string().min(1).nullable(),
});

const manifestSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  description: z.string(),
  order: z.number().int(),
  published: z.boolean(),
  thumbnail: z.string(),
  images: z.array(imageSchema),
});

/**
 * Lit les catégories depuis `content/<slug>/manifest.json`. Solution du lot 1
 * (« une catégorie intégrée en dur ») ; le lot 2 la remplace par la base de données.
 */
export class FileCategoryRepository implements CategoryRepository {
  private constructor(private readonly categories: readonly ContentCategory[]) {}

  static async load(contentDir: string): Promise<FileCategoryRepository> {
    const categories: ContentCategory[] = [];
    for (const entry of await readdir(contentDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const manifestPath = path.join(contentDir, entry.name, 'manifest.json');
      const raw = await readFile(manifestPath, 'utf8').catch(() => null);
      if (raw === null) continue;
      categories.push(parseManifest(JSON.parse(raw), entry.name, manifestPath));
    }
    categories.sort((a, b) => a.order - b.order);
    return new FileCategoryRepository(categories);
  }

  async listPublished(): Promise<ContentCategory[]> {
    return this.categories.filter((category) => category.published);
  }

  async findPublished(slug: string): Promise<ContentCategory | undefined> {
    return this.categories.find((category) => category.published && category.slug === slug);
  }
}

function parseManifest(json: unknown, directory: string, manifestPath: string): ContentCategory {
  const category = manifestSchema.parse(json);
  const fail = (reason: string) => new Error(`${manifestPath} : ${reason}`);
  if (category.slug !== directory) throw fail(`le slug « ${category.slug} » ne correspond pas au dossier.`);
  const ids = new Set(category.images.map((image) => image.id));
  if (ids.size !== category.images.length) throw fail('identifiants d’images en double.');
  if (!ids.has(category.thumbnail)) throw fail(`vignette « ${category.thumbnail} » absente des images.`);
  return category;
}
