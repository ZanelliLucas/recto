/**
 * Retire d'une catégorie les images qui font double emploi : même fichier Commons importé
 * plusieurs fois, ou image absente de la liste verrouillée. La plus ancienne de chaque
 * source est conservée, avec ses éventuelles retouches du back-office.
 *
 * Sans `--appliquer`, le script se contente d'énumérer ce qu'il retirerait.
 *
 * Usage : npm run content:commons:dedupe [-- champignons --appliquer]
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { AdminService } from '../../src/admin/adminService';
import { config } from '../../src/config';
import { SqlContentRepository } from '../../src/content/contentRepository';
import { openDatabase } from '../../src/db/client';
import { LocalMediaStorage } from '../../src/media/storage';
import { lockDir, type LockFile } from './lock';

const content = new SqlContentRepository(await openDatabase(config.databaseUrl, config.migrationsDir, config.databaseAuthToken));
const admin = new AdminService(content, new LocalMediaStorage(config.mediaDir));

const args = process.argv.slice(2);
const apply = args.includes('--appliquer');
const wanted = args.filter((arg) => !arg.startsWith('--'));
const lockFiles = (await readdir(lockDir)).filter(
  (file) => file.endsWith('.lock.json') && (wanted.length === 0 || wanted.includes(file.replace('.lock.json', ''))),
);

for (const file of lockFiles) {
  const lock = JSON.parse(await readFile(path.join(lockDir, file), 'utf8')) as LockFile;
  const category = await content.findBySlug(lock.slug);
  if (!category) continue;
  const expected = new Set(lock.items.filter((item) => item.status === 'ok').map((item) => item.sourceUrl));

  const seen = new Set<string>();
  const extra = category.images.filter((image) => {
    if (!expected.has(image.sourceUrl)) return true;
    if (seen.has(image.sourceUrl)) return true;
    seen.add(image.sourceUrl);
    return false;
  });

  for (const image of extra) {
    if (apply) await admin.deleteImage(image.id);
    console.log(`  ${apply ? '✗' : '·'} ${lock.name} — ${image.title}`);
  }
  const remaining = category.images.length - extra.length;
  console.log(`${lock.name} : ${category.images.length} en base, ${extra.length} en trop, ${remaining} conservée(s).`);
}
