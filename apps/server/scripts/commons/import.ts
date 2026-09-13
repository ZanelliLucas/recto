/**
 * Étape 2 de l'import Commons : télécharge les vignettes des sujets retenus dans les
 * listes verrouillées, les passe par la chaîne de traitement du back-office
 * (recadrage carré, trois résolutions, AVIF et WebP) et les enregistre avec leurs
 * crédits. Publie la catégorie si sa volumétrie le permet. Relançable : les images
 * déjà importées sont ignorées.
 *
 * Usage : npm run content:commons:import [-- monuments histoire faune]
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { AdminService } from '../../src/admin/adminService';
import { config } from '../../src/config';
import { SqlContentRepository } from '../../src/content/contentRepository';
import { openDatabase } from '../../src/db/client';
import { LocalMediaStorage } from '../../src/media/storage';
import { lockDir, type LockFile } from './lock';
import { fetchWithRetry, licenceLabel } from './wikimedia';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const content = new SqlContentRepository(await openDatabase(config.databaseUrl, config.migrationsDir, config.databaseAuthToken));
const admin = new AdminService(content, new LocalMediaStorage(config.mediaDir));

const wanted = process.argv.slice(2);
const lockFiles = (await readdir(lockDir)).filter(
  (file) => file.endsWith('.lock.json') && (wanted.length === 0 || wanted.includes(file.replace('.lock.json', ''))),
);

for (const file of lockFiles) {
  const lock = JSON.parse(await readFile(path.join(lockDir, file), 'utf8')) as LockFile;
  const existing = await content.findBySlug(lock.slug);
  const category =
    existing ??
    (await admin.createCategory({
      slug: lock.slug,
      name: lock.name,
      description: lock.description,
      sortOrder: lock.sortOrder,
      maxDifficulty: 'difficile',
    }));
  const known = new Set((existing?.images ?? []).map((image) => image.sourceUrl));

  let added = 0;
  const failures: string[] = [];
  for (const item of lock.items) {
    if (item.status !== 'ok' || !item.downloadUrl || !item.sourceUrl || known.has(item.sourceUrl)) continue;
    try {
      const response = await fetchWithRetry(item.downloadUrl);
      const mime = (response.headers.get('content-type') ?? '').split(';')[0]!.trim();
      await admin.addImage(category.id, Buffer.from(await response.arrayBuffer()), mime, {
        title: item.title,
        author: item.author!,
        sourceUrl: item.sourceUrl,
        licence: licenceLabel(item.licence!),
        licenceUrl: item.licenceUrl ?? null,
        caption: item.caption ?? null,
        visualGroup: item.visualGroup,
      });
      added++;
      process.stdout.write('.');
    } catch (error) {
      failures.push(`${item.title} — ${error instanceof Error ? error.message : String(error)}`);
    }
    await sleep(250);
  }

  const detail = await admin.getCategory(category.id);
  let status = 'non publiée : volumétrie insuffisante';
  if (detail.issues.length === 0) {
    await admin.updateCategory(category.id, {
      published: true,
      thumbnailImageId: detail.thumbnailImageId ?? detail.images[0]?.id ?? null,
    });
    status = 'publiée';
  }
  console.log(`\n${lock.name} : ${added} image(s) importée(s), ${detail.imageCount} au total, ${detail.groupCount} groupes — ${status}.`);
  for (const failure of failures) console.log(`  ✗ ${failure}`);
}
