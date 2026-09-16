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
import { assessRights, commonsFiles, wikidataEntities, wikidataIds, wikipediaLeadImages } from './wikimedia';

const args = process.argv.slice(2);
const only = new Set(args.filter((arg) => arg.startsWith('--only=')).flatMap((arg) => arg.slice('--only='.length).split('|')));
const wanted = args.filter((arg) => !arg.startsWith('--'));
const lists = SUBJECT_LISTS.filter((list) => wanted.length === 0 || wanted.includes(list.slug));
await mkdir(lockDir, { recursive: true });

const defaultTitle = (article: string) => article.replace(/\s*\([^)]*\)\s*$/, '');

/**
 * Certaines descriptions Wikidata parlent de la page et non du sujet (« page d'homonymie de
 * Wikimédia ») : elles n'apprendraient rien au joueur et sont écartées de la légende.
 */
const usableCaption = (description: string | null | undefined) =>
  description && !/homonymie|wikimedia|wikimédia|page de liste/i.test(description) ? description : null;

for (const list of lists) {
  const subjects = only.size > 0 ? list.subjects.filter((subject) => only.has(subject.article)) : list.subjects;
  if (subjects.length === 0) continue;
  const ids = await wikidataIds(subjects.map((subject) => subject.article));
  const entities = await wikidataEntities([...new Set(ids.values())]);
  const leads = await wikipediaLeadImages(subjects.filter((subject) => !subject.file).map((subject) => subject.article));
  /**
   * Fichiers envisagés, dans l'ordre : celui qu'impose la liste des sujets, sinon l'image
   * principale de l'élément Wikidata (P18), puis l'image d'en-tête de l'article. Ce repli
   * rattrape les sujets sans P18 et ceux dont l'image de Wikidata est trop petite ou mal licenciée.
   */
  const candidatesOf = (subject: Subject) => {
    if (subject.file) return [subject.file];
    const wikidata = entities.get(ids.get(subject.article) ?? '')?.image ?? null;
    const lead = leads.get(subject.article) ?? null;
    return [...new Set([wikidata, lead].filter((file): file is string => file !== null))];
  };
  const files = [...new Set(subjects.flatMap(candidatesOf))];
  const infos = await commonsFiles(files);

  const resolved: LockItem[] = subjects.map((subject) => {
    const base = { article: subject.article, title: subject.title ?? defaultTitle(subject.article), visualGroup: subject.group ?? null };
    const reject = (reason: string): LockItem => ({ ...base, status: 'rejete', reason });

    const wikidata = ids.get(subject.article);
    if (!wikidata) return reject('article introuvable sur fr.wikipedia');
    const entity = entities.get(wikidata);
    const candidates = candidatesOf(subject);
    if (candidates.length === 0) return { ...reject('aucune image principale (P18) sur Wikidata'), wikidata };

    let refused: LockItem | null = null;
    for (const image of candidates) {
      const info = infos.get(image);
      if (!info) {
        refused ??= { ...reject('fichier Commons introuvable'), wikidata, file: image };
        continue;
      }
      const found = { wikidata, file: image, sourceUrl: info.descriptionUrl, licence: info.licence };
      // Le fichier téléchargé est la vignette de 1280 px de large : un panorama y devient trop bas.
      const scale = Math.min(1, 1280 / info.width);
      const [width, height] = [Math.round(info.width * scale), Math.round(info.height * scale)];
      if (Math.min(width, height) < MIN_SOURCE_SIZE) {
        refused ??= { ...reject(`image trop petite (${width} × ${height})`), ...found };
        continue;
      }
      const rights = assessRights(info);
      if (!rights.ok) {
        refused ??= { ...reject(rights.reason), ...found };
        continue;
      }

      return {
        ...base,
        status: 'ok',
        ...found,
        downloadUrl: info.thumbUrl,
        width: info.width,
        height: info.height,
        author: rights.author,
        licenceUrl: info.licenceUrl,
        caption: usableCaption(entity?.description),
      };
    }
    return refused ?? { ...reject('aucune image exploitable'), wikidata };
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
