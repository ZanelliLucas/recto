/**
 * Drapeaux — métadonnées pédagogiques (EF-7.3) relevées dans Wikidata par une seule requête
 * SPARQL, sans téléchargement d'image : capitale (légende) et continent (lieu). Met à jour le
 * manifeste, puis les images déjà chargées — sans écraser une valeur saisie au back-office.
 *
 * Aucune date : l'« inception » des drapeaux dans Wikidata mêle première apparition, adoption et
 * dernière modification (1853 pour la France, 1696 pour la Russie). Mieux vaut rien qu'un fait faux.
 *
 * Usage : npm run content:drapeaux:enrich
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../../src/config';
import { SqlContentRepository } from '../../src/content/contentRepository';
import { openDatabase } from '../../src/db/client';
import { fetchWithRetry } from '../commons/wikimedia';

interface ManifestImage {
  /** Code ISO 3166-1 alpha-2 du pays. */
  id: string;
  title: string;
  sourceUrl: string;
  caption?: string | null;
  date?: string | null;
  place?: string | null;
  infoUrl?: string | null;
}

const manifestFile = path.join(config.contentDir, 'drapeaux', 'manifest.json');
const manifest = JSON.parse(await readFile(manifestFile, 'utf8')) as { slug: string; images: ManifestImage[] };

const codes = manifest.images.map((image) => `"${image.id.toUpperCase()}"`).join(' ');
const sparql = `
SELECT ?code
  (GROUP_CONCAT(DISTINCT ?capitalLabel; separator="|") AS ?capitals)
  (GROUP_CONCAT(DISTINCT ?continentLabel; separator="|") AS ?continents)
  (SAMPLE(?article) AS ?articleUrl)
WHERE {
  VALUES ?code { ${codes} }
  ?country wdt:P297 ?code .
  OPTIONAL { ?article schema:about ?country ; schema:isPartOf <https://fr.wikipedia.org/> . }
  OPTIONAL { ?country wdt:P36 ?capital . ?capital rdfs:label ?capitalLabel . FILTER(LANG(?capitalLabel) = "fr") }
  OPTIONAL { ?country wdt:P30 ?continent . ?continent rdfs:label ?continentLabel . FILTER(LANG(?continentLabel) = "fr") }
}
GROUP BY ?code`;

/** Libellés triés : le manifeste ne change pas d'une exécution à l'autre sans raison. */
const sorted = (names: string[]) => [...names].sort((a, b) => a.localeCompare(b, 'fr'));

/** « Eurasie » double l'Europe et l'Asie quand elles sont déjà citées. */
function continents(raw: string | undefined): string | null {
  const names = (raw ?? '').split('|').filter(Boolean);
  const kept = names.includes('Europe') || names.includes('Asie') ? names.filter((name) => name !== 'Eurasie') : names;
  return sorted(kept).join(' / ') || null;
}

function capitalsCaption(raw: string | undefined): string | null {
  const names = sorted((raw ?? '').split('|').filter(Boolean));
  if (names.length === 0) return null;
  return `${names.length > 1 ? 'Capitales' : 'Capitale'} : ${names.join(', ')}`;
}

const response = await fetchWithRetry(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`);
const data = (await response.json()) as {
  results: { bindings: Record<string, { value: string } | undefined>[] };
};

const facts = new Map<string, { caption: string | null; date: string | null; place: string | null; infoUrl: string | null }>();
for (const row of data.results.bindings) {
  const code = row.code?.value.toLowerCase();
  if (!code) continue;
  facts.set(code, {
    caption: capitalsCaption(row.capitals?.value),
    date: null,
    place: continents(row.continents?.value),
    // Adresse renvoyée par Wikidata, déjà encodée : l'article du pays sur Wikipédia en français.
    infoUrl: row.articleUrl?.value ?? null,
  });
}

// Valeurs du relevé précédent : remplaçables en base, contrairement à une saisie du back-office.
const previous = new Map(manifest.images.map((image) => [image.sourceUrl, { ...image }]));
for (const image of manifest.images) {
  const found = facts.get(image.id);
  if (!found) continue;
  image.caption = found.caption;
  image.date = found.date;
  image.place = found.place;
  image.infoUrl = found.infoUrl;
}
// Même mise en forme que content:drapeaux, qui régénère ce fichier (et efface donc ces relevés).
await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);

const content = new SqlContentRepository(await openDatabase(config.databaseUrl, config.migrationsDir, config.databaseAuthToken));
const category = await content.findBySlug(manifest.slug);
const bySource = new Map(manifest.images.map((image) => [image.sourceUrl, image]));
const replaceable = (current: string | null, before: string | null | undefined) => current === null || current === (before ?? null);
let updated = 0;
for (const image of category?.images ?? []) {
  const entry = bySource.get(image.sourceUrl);
  if (!entry) continue;
  const before = previous.get(image.sourceUrl);
  const update = {
    caption: replaceable(image.caption, before?.caption) ? (entry.caption ?? null) : image.caption,
    date: replaceable(image.date, before?.date) ? (entry.date ?? null) : image.date,
    place: replaceable(image.place, before?.place) ? (entry.place ?? null) : image.place,
    infoUrl: replaceable(image.infoUrl, before?.infoUrl) ? (entry.infoUrl ?? null) : image.infoUrl,
  };
  const unchanged = (['caption', 'date', 'place', 'infoUrl'] as const).every((key) => update[key] === image[key]);
  if (unchanged) continue;
  await content.updateImage(image.id, update);
  updated++;
}

const count = (key: 'caption' | 'place' | 'infoUrl') => manifest.images.filter((image) => image[key]).length;
console.log(
  `Drapeaux : ${count('caption')} capitale(s), ${count('place')} continent(s), ${count('infoUrl')} article(s) ; ${updated} image(s) mise(s) à jour en base.`,
);
