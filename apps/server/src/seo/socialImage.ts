import sharp from 'sharp';
import type { CategoryRepository, ContentCategory, ContentImage } from '../content/types';
import { VECTOR_SUFFIX, variantSuffix } from '../media/sources';
import type { MediaStorage } from '../media/storage';

/**
 * ENF-7.2 — images de partage social (1200 × 630), propres à chaque catégorie : une grille de
 * cartes, les unes retournées sur les images de la catégorie, les autres face cachée. Composées à
 * la première demande puis gardées en mémoire tant que la catégorie ne change pas.
 */
const WIDTH = 1200;
const HEIGHT = 630;
const TILE = 150;
const GAP = 16;
const COLS = 3;
const GRID = COLS * TILE + (COLS - 1) * GAP;
const GRID_LEFT = WIDTH - 72 - GRID;
const GRID_TOP = (HEIGHT - GRID) / 2;
/** Positions laissées face cachée : la grille évoque une partie en cours. */
const BACKS = new Set([1, 5, 6]);
const FACES = COLS * COLS - BACKS.size;

const FONT = "'Segoe UI', 'DejaVu Sans', 'Helvetica Neue', Arial, sans-serif";

const escapeXml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!);

const svg = (content: string, width = TILE, height = TILE) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${content}</svg>`);

const ROUNDED = svg(`<rect width="${TILE}" height="${TILE}" rx="14" ry="14" fill="#000"/>`);

/** Dos de carte : même motif que le jeu (treillis et losange). */
const CARD_BACK = svg(`
  <defs><pattern id="p" width="11" height="11" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="1" height="11" fill="rgba(92,200,255,0.14)"/></pattern></defs>
  <rect x="0.5" y="0.5" width="${TILE - 1}" height="${TILE - 1}" rx="14" fill="#121b26" stroke="#2d3e52"/>
  <rect x="0.5" y="0.5" width="${TILE - 1}" height="${TILE - 1}" rx="14" fill="url(#p)"/>
  <rect x="${TILE * 0.3}" y="${TILE * 0.3}" width="${TILE * 0.4}" height="${TILE * 0.4}" rx="4" fill="none"
    stroke="rgba(92,200,255,0.4)" stroke-width="2" transform="rotate(45 ${TILE / 2} ${TILE / 2})"/>`);

async function faceTile(media: MediaStorage, image: ContentImage): Promise<Buffer | null> {
  try {
    if (image.kind === 'raster') {
      const source = await media.read(image.storageKey + variantSuffix(400, 'webp'));
      return await sharp(source).resize(TILE, TILE, { fit: 'cover' }).composite([{ input: ROUNDED, blend: 'dest-in' }]).png().toBuffer();
    }
    // Image vectorielle (drapeau) : posée sur la face claire des cartes, marges comprises.
    const inner = TILE - 24;
    const art = await sharp(await media.read(image.storageKey + VECTOR_SUFFIX), { density: 288 })
      .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    return await sharp(svg(`<rect width="${TILE}" height="${TILE}" rx="14" fill="#eef1f5"/>`))
      .composite([{ input: art, top: 12, left: 12 }])
      .png()
      .toBuffer();
  } catch {
    // Fichier manquant ou illisible : la carte reste face cachée.
    return null;
  }
}

/** Vignette d'abord, puis des images réparties dans toute la catégorie : un choix stable. */
function pickImages(category: ContentCategory, count: number): ContentImage[] {
  const thumbnail = category.images.find((image) => image.id === category.thumbnailImageId);
  const others = category.images.filter((image) => image !== thumbnail);
  const step = Math.max(1, Math.floor(others.length / count));
  const picked = thumbnail ? [thumbnail] : [];
  for (let index = 0; picked.length < count && index < others.length; index += step) picked.push(others[index]!);
  return picked;
}

interface Composition {
  title: string;
  subtitle: string;
  footer: string;
  images: ContentImage[];
}

async function compose(media: MediaStorage, { title, subtitle, footer, images }: Composition): Promise<Buffer> {
  const faces = await Promise.all(images.map((image) => faceTile(media, image)));
  const tiles: Buffer[] = [];
  let next = 0;
  for (let position = 0; position < COLS * COLS; position++) {
    tiles.push((BACKS.has(position) ? null : faces[next++]) ?? CARD_BACK);
  }

  // Titre ajusté à la colonne de gauche : environ 0,58 em par caractère.
  const titleSize = Math.min(84, Math.floor((GRID_LEFT - 64 - 48) / (Math.max(title.length, 1) * 0.58)));
  const background = svg(
    `<defs><radialGradient id="g" cx="25%" cy="0%" r="85%">
      <stop offset="0" stop-color="#5cc8ff" stop-opacity="0.18"/><stop offset="1" stop-color="#5cc8ff" stop-opacity="0"/>
    </radialGradient></defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="#0b0f14"/>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#g)"/>
    <g transform="translate(64 78)">
      <rect x="0" y="4" width="22" height="30" rx="4" fill="#121b26" stroke="#5cc8ff" stroke-width="3" transform="rotate(-10 11 19)"/>
      <rect x="18" y="4" width="22" height="30" rx="4" fill="#eef1f5" stroke="#5cc8ff" stroke-width="3" transform="rotate(8 29 19)"/>
    </g>
    <g font-family="${FONT}">
      <text x="120" y="112" fill="#e7edf4" font-size="30" font-weight="800" letter-spacing="7">RECTO</text>
      <text x="64" y="330" fill="#e7edf4" font-size="${titleSize}" font-weight="800">${escapeXml(title)}</text>
      <text x="64" y="392" fill="#93ddff" font-size="34" font-weight="600">${escapeXml(subtitle)}</text>
      <text x="64" y="556" fill="#95a3b5" font-size="26">${escapeXml(footer)}</text>
    </g>`,
    WIDTH,
    HEIGHT,
  );

  return sharp(background)
    .composite(
      tiles.map((input, position) => ({
        input,
        left: GRID_LEFT + (position % COLS) * (TILE + GAP),
        top: GRID_TOP + Math.floor(position / COLS) * (TILE + GAP),
      })),
    )
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
}

export class SocialImages {
  private readonly cache = new Map<string, { version: string; image: Promise<Buffer> }>();

  constructor(
    private readonly categories: CategoryRepository,
    private readonly media: MediaStorage,
  ) {}

  async category(slug: string): Promise<Buffer | null> {
    const category = await this.categories.findPublished(slug);
    if (!category || category.images.length === 0) return null;
    const images = pickImages(category, FACES);
    return this.cached(`categorie:${slug}`, [category.name, ...images.map((image) => image.id)].join('|'), () =>
      compose(this.media, {
        title: category.name,
        subtitle: 'Memory · jeu de mémoire en ligne',
        footer: `${category.images.length} images · Retournez. Retenez.`,
        images,
      }),
    );
  }

  /** Image du site : les vignettes des catégories, tour à tour. */
  async site(): Promise<Buffer> {
    const categories = (await this.categories.listPublished()).filter((category) => category.images.length > 0);
    const picks = categories.map((category) => pickImages(category, FACES));
    const images: ContentImage[] = [];
    for (let round = 0; images.length < FACES && picks.some((list) => list.length > round); round++) {
      for (const list of picks) if (list[round] && images.length < FACES) images.push(list[round]!);
    }
    return this.cached('site', images.map((image) => image.id).join('|'), () =>
      compose(this.media, {
        title: 'Jeu de mémoire',
        subtitle: 'en ligne, par catégories',
        footer: categories.map((category) => category.name).join(' · ') || 'Retournez. Retenez.',
        images,
      }),
    );
  }

  private cached(key: string, version: string, build: () => Promise<Buffer>): Promise<Buffer> {
    const hit = this.cache.get(key);
    if (hit && hit.version === version) return hit.image;
    const image = build();
    this.cache.set(key, { version, image });
    // Échec de composition : retiré du cache pour qu'une demande suivante réessaie.
    image.catch(() => this.cache.delete(key));
    return image;
  }
}
