/** Accès aux API publiques de Wikipédia, Wikidata et Wikimedia Commons (lecture seule). */

export const USER_AGENT = 'RECTO-content-import/0.1 (jeu de memoire ; import ponctuel de contenus libres)';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Une connexion muette ne doit pas figer un import de plusieurs centaines d'images. */
const REQUEST_TIMEOUT_MS = 60_000;
/** Pause maximale acceptée sur demande du serveur ; au-delà, l'import renonce au sujet. */
const MAX_RETRY_AFTER_MS = 900_000;
const MAX_ATTEMPTS = 6;

/**
 * Requête polie envers les serveurs Wikimedia : réessais espacés, en respectant Retry-After.
 * Chaque tentative est bornée dans le temps, et une coupure réseau est réessayée comme un 5xx.
 */
export async function fetchWithRetry(url: string): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const backoff = 5000 * 2 ** attempt;
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, 'Api-User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      if (attempt >= MAX_ATTEMPTS - 1) throw error;
      await sleep(backoff);
      continue;
    }
    if ((response.status === 429 || response.status >= 500) && attempt < MAX_ATTEMPTS) {
      const retryAfter = Number(response.headers.get('retry-after')) * 1000;
      const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, MAX_RETRY_AFTER_MS) : backoff;
      await sleep(wait);
      continue;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status} pour ${url.slice(0, 120)}…`);
    return response;
  }
}

async function query<T>(host: string, params: Record<string, string>): Promise<T> {
  const search = new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  const response = await fetchWithRetry(`https://${host}/w/api.php?${search}`);
  await sleep(1000);
  return response.json() as Promise<T>;
}

function chunks<T>(items: readonly T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));
}

interface TitleMappings {
  normalized?: { from: string; to: string }[];
  redirects?: { from: string; to: string }[];
}

function follow(title: string, mappings: TitleMappings): string {
  let current = title;
  for (const step of [...(mappings.normalized ?? []), ...(mappings.redirects ?? [])]) {
    if (step.from === current) current = step.to;
  }
  return current;
}

/** Titre d'article fr.wikipedia → identifiant Wikidata, redirections suivies. */
export async function wikidataIds(titles: readonly string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  for (const batch of chunks(titles, 50)) {
    const data = await query<{
      query?: TitleMappings & { pages: { title: string; pageprops?: { wikibase_item?: string } }[] };
    }>('fr.wikipedia.org', {
      action: 'query',
      prop: 'pageprops',
      ppprop: 'wikibase_item',
      redirects: '1',
      titles: batch.join('|'),
    });
    const q = data.query;
    if (!q) continue;
    const byTitle = new Map(q.pages.map((page) => [page.title, page.pageprops?.wikibase_item]));
    for (const title of batch) {
      const id = byTitle.get(follow(title, q));
      if (id) result.set(title, id);
    }
  }
  return result;
}

export interface EntitySummary {
  /** Fichier Commons de l'image principale (propriété P18). */
  image: string | null;
  description: string | null;
}

interface Claim {
  rank: 'preferred' | 'normal' | 'deprecated';
  mainsnak: { datavalue?: { value: unknown } };
}

/**
 * Image d'en-tête de l'article de fr.wikipedia, utilisée quand Wikidata n'a pas d'image
 * principale (P18) ou que celle-ci se révèle inexploitable. Renvoie le nom du fichier Commons.
 */
export async function wikipediaLeadImages(titles: readonly string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  for (const batch of chunks(titles, 50)) {
    const data = await query<{
      query?: TitleMappings & { pages: { title: string; pageimage?: string }[] };
    }>('fr.wikipedia.org', {
      action: 'query',
      prop: 'pageimages',
      piprop: 'name',
      pilimit: '50',
      redirects: '1',
      titles: batch.join('|'),
    });
    const q = data.query;
    if (!q) continue;
    const byTitle = new Map(q.pages.map((page) => [page.title, page.pageimage]));
    for (const title of batch) {
      const file = byTitle.get(follow(title, q));
      if (file) result.set(title, file.replace(/_/g, ' '));
    }
  }
  return result;
}

export async function wikidataEntities(ids: readonly string[]): Promise<Map<string, EntitySummary>> {
  const result = new Map<string, EntitySummary>();
  for (const batch of chunks(ids, 50)) {
    const data = await query<{
      entities: Record<string, { claims?: Record<string, Claim[]>; descriptions?: Record<string, { value: string }> }>;
    }>('www.wikidata.org', {
      action: 'wbgetentities',
      ids: batch.join('|'),
      props: 'claims|descriptions',
      languages: 'fr',
    });
    for (const [id, entity] of Object.entries(data.entities)) {
      const claims = (entity.claims?.P18 ?? []).filter((claim) => claim.rank !== 'deprecated');
      const best = claims.find((claim) => claim.rank === 'preferred') ?? claims[0];
      const value = best?.mainsnak.datavalue?.value;
      result.set(id, {
        image: typeof value === 'string' ? value : null,
        description: entity.descriptions?.fr?.value ?? null,
      });
    }
  }
  return result;
}

interface TimeValue {
  time: string;
  precision: number;
}

const ROMAN: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];
const roman = (n: number) => ROMAN.reduce((out, [value, digits]) => {
  let text = out;
  while (n >= value) {
    text += digits;
    n -= value;
  }
  return text;
}, '');

/**
 * Date Wikidata en français, à la précision annoncée : année (9), décennie (8), siècle (7) ou
 * millénaire (6). Les années négatives sont avant notre ère.
 */
export function formatWikidataTime({ time, precision }: TimeValue): string | null {
  const match = /^([+-])0*(\d+)-/.exec(time);
  if (!match || precision < 6) return null;
  const bc = match[1] === '-';
  const year = Number(match[2]);
  const era = bc ? ' av. J.-C.' : '';
  if (precision >= 9) return `${year}${era}`;
  if (precision === 8) return bc ? `vers ${year}${era}` : `années ${Math.floor(year / 10) * 10}`;
  if (precision === 7) return `${roman(Math.ceil(year / 100))}e siècle${era}`;
  return `${roman(Math.ceil(year / 1000))}e millénaire${era}`;
}

/**
 * Dates d'une vie : « 1869–1948 », ou pour une personne vivante « né en 1930 » / « née en 1937 »
 * selon le sexe indiqué par Wikidata (P21), « naissance en 1930 » à défaut.
 */
export function lifeDates(born: string, died: string | null, sex: string | null): string {
  if (died) return `${born}–${died}`;
  if (sex === 'Q6581072') return `née en ${born}`;
  if (sex === 'Q6581097') return `né en ${born}`;
  return `naissance en ${born}`;
}

export interface EntityFacts {
  date: string | null;
  place: string | null;
  /** Article de Wikipédia en français consacré au sujet. */
  infoUrl: string | null;
}

type WikidataEntity = {
  claims?: Record<string, Claim[]>;
  labels?: Record<string, { value: string }>;
  sitelinks?: Record<string, { title: string } | undefined>;
};

/** Adresse de l'article de Wikipédia en français. */
export const frWikipediaUrl = (title: string) => `https://fr.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;

const bestValue = (entity: WikidataEntity, property: string): unknown => {
  const claims = (entity.claims?.[property] ?? []).filter((claim) => claim.rank !== 'deprecated');
  return (claims.find((claim) => claim.rank === 'preferred') ?? claims[0])?.mainsnak.datavalue?.value;
};
const refValue = (entity: WikidataEntity, property: string) =>
  (bestValue(entity, property) as { id?: string } | undefined)?.id ?? null;
const refValues = (entity: WikidataEntity, property: string) =>
  (entity.claims?.[property] ?? []).flatMap((claim) => {
    const id = (claim.mainsnak.datavalue?.value as { id?: string } | undefined)?.id;
    return claim.rank !== 'deprecated' && id ? [id] : [];
  });

async function fetchEntities(ids: readonly string[], props: string): Promise<Map<string, WikidataEntity>> {
  const result = new Map<string, WikidataEntity>();
  for (const batch of chunks(ids, 50)) {
    const data = await query<{ entities: Record<string, WikidataEntity> }>('www.wikidata.org', {
      action: 'wbgetentities',
      ids: batch.join('|'),
      props,
      languages: 'fr',
      sitefilter: 'frwiki',
    });
    for (const [id, entity] of Object.entries(data.entities)) result.set(id, entity);
  }
  return result;
}

/** Natures d'une localité à l'échelle de la ville : on remonte les subdivisions jusqu'à l'une d'elles. */
const SETTLEMENTS = new Set([
  'Q515', // ville
  'Q1549591', // grande ville
  'Q1637706', // ville millionnaire
  'Q200250', // métropole
  'Q5119', // capitale
  'Q3957', // petite ville
  'Q532', // village
  'Q486972', // établissement humain
  'Q15284', // municipalité
  'Q484170', // commune de France
  'Q747074', // commune d'Italie
  'Q2074737', // municipalité d'Espagne
  'Q262166', // commune d'Allemagne
  'Q42744322', // ville d'Allemagne
  'Q1093829', // ville des États-Unis
  'Q748149', // ville-préfecture de Chine
  'Q7930989', // ville ou bourg
]);
/** Libellés d'échelle trop fine pour être affichés seuls. */
const SUBDIVISION = /^(sous-district|district|arrondissement|quartier|secteur|canton)\b/i;
/** Emplacement trop précis : une salle de musée n'aide pas le joueur. */
const ROOM = /^(salle|galerie|aile)\b/i;

/**
 * EF-7.3 — métadonnées pédagogiques. Date : création ou mise en service, sinon naissance et mort
 * d'un personnage, sinon date de l'événement. Lieu : pour une œuvre ou un objet, l'institution qui
 * le conserve ; pour un monument, sa ville (subdivisions remontées) et son pays.
 */
export async function wikidataFacts(ids: readonly string[]): Promise<Map<string, EntityFacts>> {
  const time = (entity: WikidataEntity, property: string) => {
    const value = bestValue(entity, property) as TimeValue | undefined;
    return value?.time ? formatWikidataTime(value) : null;
  };
  const entities = await fetchEntities(ids, 'claims|sitelinks');

  // Premier niveau de références : collections, emplacements, territoires et pays.
  const firstRefs = [...entities.values()].flatMap((entity) =>
    ['P195', 'P276', 'P131', 'P17'].map((property) => refValue(entity, property)).filter((x): x is string => !!x),
  );
  const related = await fetchEntities([...new Set(firstRefs)], 'claims|labels');
  const label = (id: string | null) => (id ? related.get(id)?.labels?.fr?.value ?? null : null);

  // Remonte P131 jusqu'à une localité à l'échelle de la ville, trois niveaux au plus.
  const cityOf = async (start: string | null): Promise<string | null> => {
    let current = start;
    for (let depth = 0; current && depth < 3; depth++) {
      let entity = related.get(current);
      if (!entity) {
        const fetched = await fetchEntities([current], 'claims|labels');
        entity = fetched.get(current);
        if (entity) related.set(current, entity);
      }
      if (!entity) return null;
      if (refValues(entity, 'P31').some((kind) => SETTLEMENTS.has(kind))) return current;
      current = refValue(entity, 'P131');
    }
    const first = label(start);
    return first && !SUBDIVISION.test(first) ? start : null;
  };

  const result = new Map<string, EntityFacts>();
  for (const [id, entity] of entities) {
    const born = time(entity, 'P569');
    const died = time(entity, 'P570');
    const date =
      time(entity, 'P571') ??
      (born ? lifeDates(born, died, refValue(entity, 'P21')) : null) ??
      time(entity, 'P585') ??
      time(entity, 'P580');

    // Œuvre ou objet : l'institution qui le conserve. Monument : sa ville et son pays. L'emplacement
    // précis (P276 : esplanade, colline…) ne sert qu'à défaut des deux.
    let place: string | null = label(refValue(entity, 'P195'));
    // Un personnage (P569) n'a pas de lieu : sa ville natale serait trompeuse.
    if (!place && !born) {
      const city = label(await cityOf(refValue(entity, 'P131')));
      const country = label(refValue(entity, 'P17'));
      place = [...new Set([city, country].filter((x): x is string => !!x))].join(', ') || null;
    }
    if (!place) {
      const location = label(refValue(entity, 'P276'));
      place = location && !ROOM.test(location) ? location : null;
    }
    const article = entity.sitelinks?.frwiki?.title;
    result.set(id, { date, place, infoUrl: article ? frWikipediaUrl(article) : null });
  }
  return result;
}

export interface FileInfo {
  descriptionUrl: string;
  thumbUrl: string;
  width: number;
  height: number;
  mime: string;
  artist: string;
  licence: string;
  licenceUrl: string | null;
}

interface ImageInfo {
  descriptionurl: string;
  thumburl?: string;
  width: number;
  height: number;
  mime: string;
  extmetadata?: Record<string, { value: string } | undefined>;
}

/** Métadonnées d'auteur et de licence des fichiers Commons, avec une vignette de 1280 px. */
export async function commonsFiles(files: readonly string[]): Promise<Map<string, FileInfo>> {
  const result = new Map<string, FileInfo>();
  for (const batch of chunks(files, 20)) {
    const titles = batch.map((file) => `File:${file}`);
    const data = await query<{ query?: TitleMappings & { pages: { title: string; imageinfo?: ImageInfo[] }[] } }>(
      'commons.wikimedia.org',
      {
        action: 'query',
        prop: 'imageinfo',
        iiprop: 'url|size|mime|extmetadata',
        iiurlwidth: '1280',
        iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl',
        titles: titles.join('|'),
      },
    );
    const q = data.query;
    if (!q) continue;
    const byTitle = new Map(q.pages.map((page) => [page.title, page.imageinfo?.[0]]));
    batch.forEach((file, i) => {
      const info = byTitle.get(follow(titles[i]!, q));
      if (!info) return;
      const meta = info.extmetadata ?? {};
      result.set(file, {
        descriptionUrl: info.descriptionurl,
        thumbUrl: info.thumburl ?? info.descriptionurl,
        width: info.width,
        height: info.height,
        mime: info.mime,
        artist: stripHtml(meta.Artist?.value ?? ''),
        licence: licenceLabel(stripHtml(meta.LicenseShortName?.value ?? '')),
        licenceUrl: meta.LicenseUrl?.value || null,
      });
    });
  }
  return result;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
      if (code.startsWith('#x')) return String.fromCodePoint(parseInt(code.slice(2), 16));
      if (code.startsWith('#')) return String.fromCodePoint(Number(code.slice(1)));
      return ENTITIES[code.toLowerCase()] ?? match;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/** Libellé affiché sur la page de crédits : Commons renvoie « Public domain » en anglais. */
export function licenceLabel(licence: string): string {
  return /^public domain$/i.test(licence.trim()) ? 'Domaine public' : licence;
}

/** Licences admises (§ 4.1) : domaine public, CC0, CC BY, CC BY-SA. */
const ACCEPTED_LICENCE = /^(public domain|domaine public|pd\b|cc0|cc[ -]by(-sa)?[ -]\d(\.\d)?)/i;
const PUBLIC_DOMAIN = /^(public domain|domaine public|pd\b|cc0)/i;

export function assessRights(info: FileInfo): { ok: true; author: string } | { ok: false; reason: string } {
  if (!ACCEPTED_LICENCE.test(info.licence)) return { ok: false, reason: `licence non admise (${info.licence || 'inconnue'})` };
  if (info.artist) return { ok: true, author: info.artist.slice(0, 300) };
  if (PUBLIC_DOMAIN.test(info.licence)) return { ok: true, author: 'Auteur inconnu' };
  return { ok: false, reason: 'auteur absent alors que la licence exige une attribution' };
}
