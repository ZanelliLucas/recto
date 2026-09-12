/** Accès aux API publiques de Wikipédia, Wikidata et Wikimedia Commons (lecture seule). */

export const USER_AGENT = 'RECTO-content-import/0.1 (jeu de memoire ; import ponctuel de contenus libres)';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Requête polie envers les serveurs Wikimedia : réessais espacés, en respectant Retry-After. */
export async function fetchWithRetry(url: string): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Api-User-Agent': USER_AGENT } });
    if ((response.status === 429 || response.status >= 500) && attempt < 6) {
      const retryAfter = Number(response.headers.get('retry-after'));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 5000 * 2 ** attempt);
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
        licence: stripHtml(meta.LicenseShortName?.value ?? ''),
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

/** Licences admises (§ 4.1) : domaine public, CC0, CC BY, CC BY-SA. */
const ACCEPTED_LICENCE = /^(public domain|domaine public|pd\b|cc0|cc[ -]by(-sa)?[ -]\d(\.\d)?)/i;
const PUBLIC_DOMAIN = /^(public domain|domaine public|pd\b|cc0)/i;

export function assessRights(info: FileInfo): { ok: true; author: string } | { ok: false; reason: string } {
  if (!ACCEPTED_LICENCE.test(info.licence)) return { ok: false, reason: `licence non admise (${info.licence || 'inconnue'})` };
  if (info.artist) return { ok: true, author: info.artist.slice(0, 300) };
  if (PUBLIC_DOMAIN.test(info.licence)) return { ok: true, author: 'Auteur inconnu' };
  return { ok: false, reason: 'auteur absent alors que la licence exige une attribution' };
}
