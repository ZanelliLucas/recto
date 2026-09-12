/**
 * Produit la catégorie « Drapeaux » : un SVG carré par drapeau et le manifeste
 * portant, pour chaque image, l'auteur, la source, la licence et la date (ENF-8).
 *
 * Usage : npm run content:drapeaux
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FLAGS } from './flags';
import { squareCard } from './svg';

const outDir = fileURLToPath(new URL('../../content/drapeaux/', import.meta.url));
const RETRIEVED_AT = '2026-09-12';

const codes = FLAGS.map((flag) => flag.code);
const duplicates = codes.filter((code, i) => codes.indexOf(code) !== i);
if (duplicates.length > 0) throw new Error(`Codes en double : ${duplicates.join(', ')}`);

await mkdir(outDir, { recursive: true });

for (const flag of FLAGS) {
  await writeFile(path.join(outDir, `${flag.code}.svg`), squareCard(flag.draw(), flag.square));
}

const manifest = {
  slug: 'drapeaux',
  name: 'Drapeaux',
  description: 'Drapeaux nationaux du monde entier : bandes, croix, astres et croissants.',
  order: 3,
  published: true,
  thumbnail: 'fr',
  images: FLAGS.map((flag) => ({
    id: flag.code,
    title: flag.name,
    file: `${flag.code}.svg`,
    author: 'RECTO — tracé vectoriel d’après le dessin officiel, proportions normalisées',
    sourceUrl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(flag.commonsFile)}`,
    licence: 'Domaine public',
    retrievedAt: RETRIEVED_AT,
    visualGroup: flag.visualGroup ?? null,
  })),
};

await writeFile(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const groups = new Set(FLAGS.map((flag) => flag.visualGroup ?? flag.code)).size;
console.log(`${FLAGS.length} drapeaux écrits dans ${outDir} (${groups} groupes visuels).`);
