/**
 * Étape 1 de l'import Commons : relève, sans rien télécharger d'autre que des
 * métadonnées, le fichier retenu pour chaque sujet, son auteur et sa licence.
 * Écrit content/commons/<slug>.lock.json, à valider avant l'import.
 *
 * Usage : npm run content:commons:resolve [-- monuments histoire faune]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { lockDir, lockPath, type LockFile, type LockItem } from './lock';
import { SUBJECT_LISTS } from './subjects';
import { MIN_SOURCE_SIZE } from '../../src/media/pipeline';
import { assessRights, commonsFiles, wikidataEntities, wikidataIds } from './wikimedia';

const wanted = process.argv.slice(2);
const lists = SUBJECT_LISTS.filter((list) => wanted.length === 0 || wanted.includes(list.slug));
await mkdir(lockDir, { recursive: true });

const defaultTitle = (article: string) => article.replace(/\s*\([^)]*\)\s*$/, '');

for (const list of lists) {
  const ids = await wikidataIds(list.subjects.map((subject) => subject.article));
  const entities = await wikidataEntities([...new Set(ids.values())]);
  const files = [...new Set([...entities.values()].flatMap((entity) => (entity.image ? [entity.image] : [])))];
  const infos = await commonsFiles(files);

  const items: LockItem[] = list.subjects.map((subject) => {
    const base = { article: subject.article, title: subject.title ?? defaultTitle(subject.article), visualGroup: subject.group ?? null };
    const reject = (reason: string): LockItem => ({ ...base, status: 'rejete', reason });

    const wikidata = ids.get(subject.article);
    if (!wikidata) return reject('article introuvable sur fr.wikipedia');
    const entity = entities.get(wikidata);
    if (!entity?.image) return { ...reject('aucune image principale (P18) sur Wikidata'), wikidata };
    const info = infos.get(entity.image);
    if (!info) return { ...reject('fichier Commons introuvable'), wikidata, file: entity.image };
    const found = { wikidata, file: entity.image, sourceUrl: info.descriptionUrl, licence: info.licence };
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
      caption: entity.description,
    };
  });

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
