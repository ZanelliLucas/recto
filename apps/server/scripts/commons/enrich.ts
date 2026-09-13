/**
 * Complète les métadonnées pédagogiques (EF-7.3) des listes verrouillées : date et lieu relevés
 * dans Wikidata, sans aucun téléchargement d'image. Met à jour les fichiers verrouillés, puis les
 * images déjà importées (reconnues à leur source) — sans écraser une valeur saisie au back-office.
 *
 * Usage : npm run content:commons:enrich [-- monuments histoire faune]
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../../src/config';
import { SqlContentRepository } from '../../src/content/contentRepository';
import { openDatabase } from '../../src/db/client';
import { lockDir, type LockFile } from './lock';
import { wikidataFacts } from './wikimedia';

const wanted = process.argv.slice(2);
const content = new SqlContentRepository(await openDatabase(config.databaseUrl, config.migrationsDir, config.databaseAuthToken));
const lockFiles = (await readdir(lockDir)).filter(
  (file) => file.endsWith('.lock.json') && (wanted.length === 0 || wanted.includes(file.replace('.lock.json', ''))),
);

for (const file of lockFiles) {
  const lockFile = path.join(lockDir, file);
  const lock = JSON.parse(await readFile(lockFile, 'utf8')) as LockFile;
  const ids = [...new Set(lock.items.flatMap((item) => (item.status === 'ok' && item.wikidata ? [item.wikidata] : [])))];
  const facts = await wikidataFacts(ids);

  // Valeurs de l'enrichissement précédent : en base, elles peuvent être remplacées ; toute autre
  // valeur a été saisie au back-office et prévaut.
  const previous = new Map(lock.items.map((item) => [item.sourceUrl, { date: item.date ?? null, place: item.place ?? null }]));
  for (const item of lock.items) {
    const found = item.wikidata ? facts.get(item.wikidata) : undefined;
    if (!found) continue;
    item.date = found.date;
    item.place = found.place;
  }
  await writeFile(lockFile, `${JSON.stringify(lock, null, 2)}\n`);

  const category = await content.findBySlug(lock.slug);
  const bySource = new Map(lock.items.map((item) => [item.sourceUrl, item]));
  const replaceable = (current: string | null, before: string | null | undefined) => current === null || current === (before ?? null);
  let updated = 0;
  for (const image of category?.images ?? []) {
    const item = bySource.get(image.sourceUrl);
    if (!item) continue;
    const before = previous.get(image.sourceUrl);
    const update = {
      date: replaceable(image.date, before?.date) ? (item.date ?? null) : image.date,
      place: replaceable(image.place, before?.place) ? (item.place ?? null) : image.place,
    };
    if (update.date === image.date && update.place === image.place) continue;
    await content.updateImage(image.id, update);
    updated++;
  }

  const withDate = lock.items.filter((item) => item.date).length;
  const withPlace = lock.items.filter((item) => item.place).length;
  console.log(`${lock.name} : ${withDate} date(s), ${withPlace} lieu(x) relevés ; ${updated} image(s) mise(s) à jour en base.`);
}
