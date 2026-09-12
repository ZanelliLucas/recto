import { DIFFICULTIES, difficultiesUpTo, minImagesFor, type Difficulty } from './difficulty';
import { shuffle, type Rng } from './random';

export interface DrawableImage {
  readonly id: string;
  /** EF-3.9 — deux images d'un même groupe visuel ne figurent jamais dans le même tirage. */
  readonly visualGroup: string | null;
}

const groupOf = (image: DrawableImage) => image.visualGroup ?? `#${image.id}`;

/** Nombre maximal de paires qu'un tirage peut réunir sans deux images d'un même groupe visuel. */
export function distinctGroupCount(pool: readonly DrawableImage[]): number {
  return new Set(pool.map(groupOf)).size;
}

/**
 * Difficultés jouables pour un lot d'images, jusqu'à `maxDifficulty` :
 * - EF-3.8 : au moins le double d'images par rapport au nombre de paires ;
 * - EF-1.8 et EF-3.9 : strictement plus de groupes visuels que de paires, faute de
 *   quoi deux tirages consécutifs seraient forcément identiques.
 */
export function playableDifficulties(
  pool: readonly DrawableImage[],
  maxDifficulty: Difficulty = 'difficile',
): Difficulty[] {
  const groups = distinctGroupCount(pool);
  return difficultiesUpTo(maxDifficulty).filter(
    (difficulty) => pool.length >= minImagesFor(difficulty) && groups > DIFFICULTIES[difficulty].pairs,
  );
}

export type PublicationIssue =
  | { code: 'images_insuffisantes'; required: number; actual: number }
  | { code: 'groupes_insuffisants'; required: number; actual: number };

/** EF-7.4 — ce qui empêche de publier une catégorie proposant jusqu'à `maxDifficulty`. */
export function publicationIssues(pool: readonly DrawableImage[], maxDifficulty: Difficulty): PublicationIssue[] {
  const { pairs } = DIFFICULTIES[maxDifficulty];
  const issues: PublicationIssue[] = [];
  if (pool.length < minImagesFor(maxDifficulty)) {
    issues.push({ code: 'images_insuffisantes', required: minImagesFor(maxDifficulty), actual: pool.length });
  }
  const groups = distinctGroupCount(pool);
  if (groups <= pairs) issues.push({ code: 'groupes_insuffisants', required: pairs + 1, actual: groups });
  return issues;
}

/** Empreinte d'un tirage, indépendante de l'ordre des images. */
export function drawSignature(imageIds: readonly string[]): string {
  return [...imageIds].sort().join('|');
}

/**
 * Tire `pairs` images distinctes, au plus une par groupe visuel. Si le résultat
 * reproduit le tirage précédent, une image est remplacée (EF-1.8).
 */
export function drawImages(
  pool: readonly DrawableImage[],
  pairs: number,
  rng: Rng,
  previous?: readonly string[],
): string[] {
  const shuffled = shuffle(pool, rng);
  const picked: DrawableImage[] = [];
  const usedGroups = new Set<string>();

  for (const image of shuffled) {
    if (picked.length === pairs) break;
    const group = groupOf(image);
    if (usedGroups.has(group)) continue;
    usedGroups.add(group);
    picked.push(image);
  }
  if (picked.length < pairs) {
    throw new Error(`Tirage impossible : ${pairs} paires demandées, ${picked.length} groupes visuels disponibles.`);
  }

  if (previous && drawSignature(picked.map((image) => image.id)) === drawSignature(previous)) {
    const index = Math.floor(rng() * picked.length);
    const removed = picked[index]!;
    usedGroups.delete(groupOf(removed));
    const replacement = shuffled.find((image) => image.id !== removed.id && !usedGroups.has(groupOf(image)));
    if (!replacement) throw new Error('Tirage impossible : aucun tirage ne diffère du précédent.');
    picked[index] = replacement;
  }

  return picked.map((image) => image.id);
}

/** Duplique chaque image et mélange le paquet : `deck[position]` donne l'image de la carte. */
export function buildDeck(imageIds: readonly string[], rng: Rng): string[] {
  return shuffle([...imageIds, ...imageIds], rng);
}
