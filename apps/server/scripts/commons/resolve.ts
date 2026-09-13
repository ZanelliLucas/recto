/**
 * Étape 1 de l'import Commons : relève, sans rien télécharger d'autre que des
 * métadonnées, le fichier retenu pour chaque sujet, son auteur et sa licence.
 * Écrit content/commons/<slug>.lock.json, à valider avant l'import.
 *
 * Usage : npm run content:commons:resolve [-- monuments histoire faune]
 *         npm run content:commons:resolve -- faune "--only=Cobra royal|Poulpe commun"
 *
 * Avec --only, seuls les sujets cités sont relevés ; le reste de la liste verrouillée (fichiers,
 * dates, lieux) est conservé tel quel. Un sujet dont le fichier change garde la trace de l'ancien
 * (`replaces`), que l'import supprime une fois le nouveau en place.
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { lockDir, lockPath, type LockFile, type LockItem } from './lock';
import { SUBJECT_LISTS, type Subject } from './subjects';
import { MIN_SOURCE_SIZE } from '../../src/media/pipeline';
import { assessRights, commonsFiles, wikidataEntities, wikidataIds } from './wikimedia';

const args = process.argv.slice(2);
const only = new Set(args.filter((arg) => arg.startsWith('--only=')).flatMap((arg) => arg.slice('--only='.length).split('|')));
const wanted = args.filter((arg) => !arg.startsWith('--'));
const lists = SUBJECT_LISTS.filter((list) => wanted.length === 0 || wanted.includes(list.slug));
await mkdir(lockDir, { recursive: true });

const defaultTitle = (article: string) => article.replace(/\s*\([^)]*\)\s*$/, '');

for (const list of lists) {
  const subjects = only.size > 0 ? list.subjects.filter((subject) => only.has(subject.article)) : list.subjects;
  if (subjects.length === 0) continue;
  const ids = await wikidataIds(subjects.map((subject) => subject.article));
  const entities = await wikidataEntities([...new Set(ids.values())]);
  // Fichier imposé par la liste des sujets, sinon image principale de l'élément Wikidata.
  const imageOf = (subject: Subject) => subject.file ?? entities.get(ids.get(subject.article) ?? '')?.image ?? null;
  const files = [...new Set(subjects.map(imageOf).filter((file): file is string => file !== null))];
  const infos = await commonsFiles(files);

  const resolved: LockItem[] = subjects.map((subject) => {
    const base = { article: subject.article, title: subject.title ?? defaultTitle(subject.article), visualGroup: subject.group ?? null };
    const reject = (reason: string): LockItem => ({ ...base, status: 'rejete', reason });

    const wikidata = ids.get(subject.article);
    if (!wikidata) return reject('article introuvable sur fr.wikipedia');
    const entity = entities.get(wikidata);
    const image = imageOf(subject);
    if (!image) return { ...reject('aucune image principale (P18) sur Wikidata'), wikidata };
    const info = infos.get(image);
    if (!info) return { ...reject('fichier Commons introuvable'), wikidata, file: image };
    const found = { wikidata, file: image, sourceUrl: info.descriptionUrl, licence: info.licence };
    // Le fichier téléchargé est la vignette de 1280 px de large : un panorama y devient trop bas.
    const scale = Math.min(1, 1280 / info.width);
    const [width, height] = [Math.round(info.width * scale), Math.round(info.height * scale)];
    if (Math.min(width, height) < MIN_SOURCE_SIZE) return { ...reject(`image trop petite (${width} × ${height})`), ...found };
    const rights = assessRights(info);
    if (!rights.ok) return { ...reject(rights.reason), ...found };

    return {
      ...base,
      status: 'ok',
      ...found,
      downloadUrl: info.thumbUrl,
      width: info.width,
      height: info.height,
      author: rights.author,
      licenceUrl: info.licenceUrl,
      caption: entity?.description ?? null,
    };
  });

  // Relevé ciblé : les autres sujets de la liste verrouillée restent intacts.
  let items = resolved;
  if (only.size > 0 && existsSync(lockPath(list.slug))) {
    const previous = (JSON.parse(await readFile(lockPath(list.slug), 'utf8')) as LockFile).items;
    const fresh = new Map(resolved.map((item) => [item.article, item]));
    items = previous.map((item) => {
      const update = fresh.get(item.article);
      if (!update) return item;
      fresh.delete(item.article);
      const replaced = item.status === 'ok' && update.sourceUrl && item.sourceUrl && item.sourceUrl !== update.sourceUrl;
      return replaced ? { ...update, replaces: item.sourceUrl } : update;
    });
    items.push(...fresh.values());
  }

  const lock: LockFile = {
    slug: list.slug,
    name: list.name,
    description: list.description,
    sortOrder: list.sortOrder,
    resolvedAt: new Date().toISOString().slice(0, 10),
    items,
  };
  await writeFile(lockPath(list.slug), `${JSON.stringify(lock, null, 2)}\n`);

  const accepted = items.filter((item) => item.status === 'ok');
  const groups = new Set(accepted.map((item) => item.visualGroup ?? item.article)).size;
  console.log(`\n${list.name} : ${accepted.length}/${items.length} retenus, ${groups} groupes visuels.`);
  for (const item of items) if (item.status === 'rejete') console.log(`  ✗ ${item.article} — ${item.reason}`);
}
