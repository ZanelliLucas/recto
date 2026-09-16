/**
 * Complète les métadonnées pédagogiques (EF-7.3) des listes verrouillées : date et lieu relevés
 * dans Wikidata, sans aucun téléchargement d'image. Met à jour les fichiers verrouillés, puis les
 * images déjà importées (reconnues à leur source) — légende comprise, et sans écraser une valeur
 * saisie au back-office.
 *
 * Usage : npm run content:commons:enrich [-- monuments histoire faune]
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../../src/config';
import { SqlContentRepository } from '../../src/content/contentRepository';
import { openDatabase } from '../../src/db/client';
import { lockDir, type LockFile } from './lock';
import { announcesAmbiguity, describesThePage, wikidataFacts, wikipediaLeadSentences } from './wikimedia';

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
  // La description Wikidata ne distingue qu'un élément d'un autre (« espèce de champignons ») :
  // la première phrase de l'article, elle, apprend quelque chose au joueur (EF-7.3).
  const sentences = await wikipediaLeadSentences(lock.items.filter((item) => item.status === 'ok').map((item) => item.article));

  // Valeurs de l'enrichissement précédent : en base, elles peuvent être remplacées ; toute autre
  // valeur a été saisie au back-office et prévaut.
  const previous = new Map(
    lock.items.map((item) => [
      item.sourceUrl,
      { caption: item.caption ?? null, date: item.date ?? null, place: item.place ?? null, infoUrl: item.infoUrl ?? null },
    ]),
  );
  for (const item of lock.items) {
    const found = item.wikidata ? facts.get(item.wikidata) : undefined;
    if (!found) continue;
    item.date = found.date;
    item.place = found.place;
    item.infoUrl = found.infoUrl;
  }
  for (const item of lock.items) {
    const sentence = sentences.get(item.article);
    // Faute de définition, on garde la description Wikidata — sauf si elle parle de la page ou
    // annonce une ambiguïté, auquel cas mieux vaut aucune légende qu'une légende inutile.
    if (sentence) item.caption = sentence;
    else if (describesThePage(item.caption) || (item.caption && announcesAmbiguity(item.caption))) item.caption = null;
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
      // La légende vient du relevé : une description Wikidata écartée depuis doit disparaître.
      caption:
        replaceable(image.caption, before?.caption) ||
        describesThePage(image.caption) ||
        (image.caption !== null && announcesAmbiguity(image.caption))
          ? (item.caption ?? null)
          : image.caption,
      date: replaceable(image.date, before?.date) ? (item.date ?? null) : image.date,
      place: replaceable(image.place, before?.place) ? (item.place ?? null) : image.place,
      infoUrl: replaceable(image.infoUrl, before?.infoUrl) ? (item.infoUrl ?? null) : image.infoUrl,
    };
    if (
      update.caption === image.caption &&
      update.date === image.date &&
      update.place === image.place &&
      update.infoUrl === image.infoUrl
    )
      continue;
    await content.updateImage(image.id, update);
    updated++;
  }

  const withDate = lock.items.filter((item) => item.date).length;
  const withPlace = lock.items.filter((item) => item.place).length;
  const withArticle = lock.items.filter((item) => item.infoUrl).length;
  const withSentence = lock.items.filter((item) => sentences.has(item.article)).length;
  console.log(
    `${lock.name} : ${withSentence} définition(s), ${withDate} date(s), ${withPlace} lieu(x), ${withArticle} article(s) relevés ; ${updated} image(s) mise(s) à jour en base.`,
  );
}
