/**
 * Reprend le cadrage des images déjà importées dont la source est très allongée : la chaîne
 * de traitement les intègre désormais en entier dans le carré au lieu d'en recadrer une
 * bande (voir LETTERBOX_RATIO). Les variantes stockées sont réécrites sous la même clé,
 * donc les identifiants, les crédits et les groupes sont conservés.
 *
 * Les fichiers de /media sont servis en cache immuable pour un an : après une mise en ligne,
 * ce recadrage doit s'accompagner d'une purge du cache pour atteindre les visiteurs connus.
 *
 * Usage : npm run content:commons:reframe [-- monuments instruments]
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../../src/config';
import { SqlContentRepository } from '../../src/content/contentRepository';
import { openDatabase } from '../../src/db/client';
import { processImage } from '../../src/media/pipeline';
import { LocalMediaStorage } from '../../src/media/storage';
import { lockDir, type LockFile } from './lock';
import { fetchWithRetry } from './wikimedia';

/** Même seuil que la chaîne de traitement : en deçà, le recadrage carré reste fidèle. */
const LETTERBOX_RATIO = 1.8;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const content = new SqlContentRepository(await openDatabase(config.databaseUrl, config.migrationsDir, config.databaseAuthToken));
const media = new LocalMediaStorage(config.mediaDir);

const wanted = process.argv.slice(2);
const lockFiles = (await readdir(lockDir)).filter(
  (file) => file.endsWith('.lock.json') && (wanted.length === 0 || wanted.includes(file.replace('.lock.json', ''))),
);

for (const file of lockFiles) {
  const lock = JSON.parse(await readFile(path.join(lockDir, file), 'utf8')) as LockFile;
  const category = await content.findBySlug(lock.slug);
  if (!category) continue;
  const stored = new Map(category.images.map((image) => [image.sourceUrl, image]));

  const elongated = lock.items.filter((item) => {
    if (item.status !== 'ok' || !item.width || !item.height || !item.sourceUrl) return false;
    return Math.max(item.width, item.height) / Math.min(item.width, item.height) >= LETTERBOX_RATIO;
  });

  let done = 0;
  const failures: string[] = [];
  for (const item of elongated) {
    const image = stored.get(item.sourceUrl!);
    if (!image) continue;
    try {
      const response = await fetchWithRetry(item.downloadUrl!);
      const mime = (response.headers.get('content-type') ?? '').split(';')[0]!.trim();
      const processed = await processImage(Buffer.from(await response.arrayBuffer()), mime);
      await Promise.all(processed.files.map((variant) => media.put(image.storageKey + variant.suffix, variant.data)));
      done++;
      process.stdout.write('.');
    } catch (error) {
      failures.push(`${item.title} — ${error instanceof Error ? error.message : String(error)}`);
    }
    await sleep(250);
  }

  console.log(`\n${lock.name} : ${done} image(s) recadrée(s) sur ${elongated.length} allongée(s).`);
  for (const failure of failures) console.log(`  ✗ ${failure}`);
}
