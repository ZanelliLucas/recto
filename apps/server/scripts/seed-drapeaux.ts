/**
 * Charge la catégorie Drapeaux (SVG générés par content:drapeaux) dans la base et
 * le stockage des médias, puis la publie. Relançable : les drapeaux déjà présents
 * sont ignorés.
 *
 * Usage : npm run db:seed
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { AdminService } from '../src/admin/adminService';
import { config } from '../src/config';
import { SqlContentRepository } from '../src/content/contentRepository';
import { openDatabase } from '../src/db/client';
import { LocalMediaStorage } from '../src/media/storage';

interface FlagManifest {
  slug: string;
  name: string;
  description: string;
  order: number;
  thumbnail: string;
  images: {
    id: string;
    title: string;
    file: string;
    author: string;
    sourceUrl: string;
    licence: string;
    retrievedAt: string;
    visualGroup: string | null;
  }[];
}

const directory = path.join(config.contentDir, 'drapeaux');
const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8')) as FlagManifest;

const content = new SqlContentRepository(await openDatabase(config.databaseUrl, config.migrationsDir));
const admin = new AdminService(content, new LocalMediaStorage(config.mediaDir));

const existing = await content.findBySlug(manifest.slug);
const category =
  existing ??
  (await admin.createCategory({
    slug: manifest.slug,
    name: manifest.name,
    description: manifest.description,
    sortOrder: manifest.order,
    maxDifficulty: 'difficile',
  }));
const known = new Set((existing?.images ?? []).map((image) => image.sourceUrl));

let thumbnailImageId = category.thumbnailImageId;
let added = 0;
for (const entry of manifest.images) {
  if (known.has(entry.sourceUrl)) continue;
  const svg = await readFile(path.join(directory, entry.file));
  const image = await admin.addImage(category.id, svg, 'image/svg+xml', {
    title: entry.title,
    author: entry.author,
    sourceUrl: entry.sourceUrl,
    licence: entry.licence,
    retrievedAt: entry.retrievedAt,
    visualGroup: entry.visualGroup,
  });
  if (entry.id === manifest.thumbnail) thumbnailImageId = image.id;
  added++;
}

await admin.updateCategory(category.id, { thumbnailImageId, published: true });
console.log(`Drapeaux : ${added} image(s) ajoutée(s), ${known.size} déjà présente(s). Catégorie publiée.`);
