import { DIFFICULTIES, type CategorySummary } from '@recto/shared';
import type { CategoryRepository } from '../content/types';
import type { MediaStorage } from '../media/storage';
import { publishedSummaries } from '../routes/categories';

/**
 * ENF-7.1 — chaque page est servie avec son titre, sa description, son adresse canonique, ses
 * métadonnées de partage et, pour l'accueil et les catégories, un contenu indexable avant tout
 * JavaScript. L'application React remplace ce contenu dès son chargement.
 */
export interface PageDescription {
  status: number;
  title: string;
  description: string;
  /** Chemin canonique. */
  path: string;
  indexable: boolean;
  /** ENF-7.2 — image de partage, chemin absolu sur le site. */
  image: { path: string; alt: string };
  body: string;
  jsonLd?: object;
  /** Données jointes à la page, lues par l'application au démarrage. */
  data?: object;
}

const SITE = 'RECTO';
const HOME_TITLE = 'RECTO — Jeu de mémoire en ligne par catégories';
const DEFAULT_DESCRIPTION =
  'RECTO, le jeu de mémoire en ligne par catégories thématiques : monuments, drapeaux, faune, histoire. Retrouvez les paires, battez votre record.';
const SITE_IMAGE = { path: '/og/recto.jpg', alt: 'RECTO, jeu de mémoire en ligne' };

const TEXT_PAGES: Record<string, { title: string; description: string }> = {
  '/comment-jouer': {
    title: 'Comment jouer',
    description: 'Les règles de RECTO en quatre étapes : choisir une catégorie, retourner les cartes, battre le chronomètre, établir un record.',
  },
  '/credits': {
    title: 'Crédits iconographiques',
    description: 'Auteur, licence et source de chacune des images des cartes de RECTO, toutes libres de droits ou sous licence libre.',
  },
  '/mentions-legales': { title: 'Mentions légales', description: 'Éditeur, hébergeur et propriété intellectuelle du site RECTO.' },
  '/confidentialite': {
    title: 'Politique de confidentialité',
    description: 'Données conservées par RECTO, durées, cookies strictement nécessaires et exercice de vos droits.',
  },
  '/contact': { title: 'Contact', description: 'Écrire à l’éditeur de RECTO, signaler une image, exercer vos droits.' },
};

/** Pages propres au joueur ou transitoires : servies normalement, jamais indexées. */
const PRIVATE_PAGES = [
  /^\/connexion$/,
  /^\/inscription$/,
  /^\/verification$/,
  /^\/mot-de-passe-oublie$/,
  /^\/reinitialisation$/,
  /^\/profil$/,
  /^\/parametres$/,
  /^\/admin(\/.*)?$/,
  /^\/partie\/[\w-]+(\/resultat)?$/,
];

export const PUBLIC_PATHS = ['/', '/categories', ...Object.keys(TEXT_PAGES)];

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

/** JSON inséré dans une balise script : `<` échappé pour qu'aucune chaîne ne puisse la refermer. */
const safeJson = (value: unknown) =>
  JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

function pairsText(category: CategorySummary): string {
  const pairs = category.difficulties.map((difficulty) => DIFFICULTIES[difficulty].pairs);
  if (pairs.length === 1) return `${pairs[0]} paires`;
  return `${pairs.slice(0, -1).join(', ')} ou ${pairs.at(-1)} paires`;
}

function categoryList(categories: CategorySummary[]): string {
  const items = categories
    .map(
      (category) =>
        `<li><a href="/jouer/${escapeHtml(category.slug)}">${escapeHtml(category.name)}</a> — ${escapeHtml(
          category.description,
        )} <span>(${category.imageCount} images)</span></li>`,
    )
    .join('');
  return `<ul>${items}</ul>`;
}

const fallback = (content: string) => `<div class="seo-fallback">${content}</div>`;

export class SeoService {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly media: MediaStorage,
  ) {}

  async describe(rawPath: string): Promise<PageDescription> {
    const path = rawPath.length > 1 ? rawPath.replace(/\/+$/, '') : rawPath;

    if (path === '/' || path === '/categories') {
      const categories = await publishedSummaries(this.categories, this.media);
      const home = path === '/';
      return {
        status: 200,
        title: home ? HOME_TITLE : `Catégories — ${SITE}`,
        description: home
          ? DEFAULT_DESCRIPTION
          : `Choisissez votre jeu de mémoire : ${categories.map((category) => category.name).join(', ')}. Trois niveaux, de 8 à 30 paires.`,
        path,
        indexable: true,
        image: SITE_IMAGE,
        body: fallback(
          (home
            ? '<h1>RECTO</h1><p>Retournez. Retenez.</p><p>Le jeu de mémoire où chaque carte vous apprend quelque chose. Retrouvez les paires, battez votre record.</p><h2>Choisissez une catégorie</h2>'
            : '<h1>Catégories</h1>') + categoryList(categories),
        ),
        jsonLd: home
          ? { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE, description: DEFAULT_DESCRIPTION, inLanguage: 'fr' }
          : undefined,
        data: { categories },
      };
    }

    const categoryMatch = /^\/jouer\/([a-z0-9-]+)$/.exec(path);
    if (categoryMatch) {
      const categories = await publishedSummaries(this.categories, this.media);
      const category = categories.find((candidate) => candidate.slug === categoryMatch[1]);
      if (!category) return this.notFound(path);
      // ENF-7.3 — requêtes visées : « memory monuments », « jeu de mémoire en ligne ».
      const title = `Memory ${category.name} : jeu de mémoire en ligne`;
      const description = `${category.description} ${category.imageCount} images, ${pairsText(category)} à retrouver. Gratuit, sans inscription.`.trim();
      const levels = category.difficulties
        .map((difficulty) => `<li>${DIFFICULTIES[difficulty].pairs} paires</li>`)
        .join('');
      return {
        status: 200,
        title: `${title} — ${SITE}`,
        description,
        path,
        indexable: true,
        image: { path: `/og/categorie/${category.slug}.jpg`, alt: `Memory ${category.name} sur RECTO` },
        body: fallback(
          `<h1>Memory ${escapeHtml(category.name)}</h1><p>${escapeHtml(category.description)}</p><p>${category.imageCount} images. Niveaux :</p><ul>${levels}</ul><p><a href="/categories">Toutes les catégories</a></p>`,
        ),
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Game',
          name: `Memory ${category.name}`,
          description,
          inLanguage: 'fr',
          isPartOf: { '@type': 'WebSite', name: SITE },
        },
        data: { categories },
      };
    }

    const text = TEXT_PAGES[path];
    if (text) {
      return {
        status: 200,
        title: `${text.title} — ${SITE}`,
        description: text.description,
        path,
        indexable: true,
        image: SITE_IMAGE,
        body: '',
      };
    }

    if (PRIVATE_PAGES.some((pattern) => pattern.test(path))) {
      return { status: 200, title: HOME_TITLE, description: DEFAULT_DESCRIPTION, path, indexable: false, image: SITE_IMAGE, body: '' };
    }
    return this.notFound(path);
  }

  /** § 7.4 — plan du site : pages publiques et catégories jouables. */
  async sitemap(appUrl: string): Promise<string> {
    const published = await this.categories.listPublished();
    const playable = new Set((await publishedSummaries(this.categories, this.media)).map((category) => category.slug));
    const entries = [
      ...PUBLIC_PATHS.map((path) => ({ path, lastmod: null as string | null })),
      ...published
        .filter((category) => playable.has(category.slug))
        .map((category) => ({ path: `/jouer/${category.slug}`, lastmod: new Date(category.updatedAt).toISOString().slice(0, 10) })),
    ];
    const urls = entries
      .map(
        ({ path, lastmod }) =>
          `  <url><loc>${escapeHtml(appUrl + path)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`,
      )
      .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  }

  private notFound(path: string): PageDescription {
    return {
      status: 404,
      title: `Page introuvable — ${SITE}`,
      description: DEFAULT_DESCRIPTION,
      path,
      indexable: false,
      image: SITE_IMAGE,
      body: '',
    };
  }
}

export function robotsTxt(appUrl: string, indexable: boolean): string {
  // Recette et développement : rien n'est indexé (§ 7.5).
  if (!indexable) return 'User-agent: *\nDisallow: /\n';
  return [
    'User-agent: *',
    'Disallow: /admin',
    'Disallow: /partie/',
    'Disallow: /profil',
    'Disallow: /parametres',
    'Disallow: /api/',
    '',
    `Sitemap: ${appUrl}/sitemap.xml`,
    '',
  ].join('\n');
}

/** Insère les métadonnées et le contenu de la page dans le gabarit produit par Vite. */
export function renderPage(template: string, page: PageDescription, appUrl: string, siteIndexable: boolean): string {
  const url = appUrl + page.path;
  const image = appUrl + page.image.path;
  const tags = [
    `<title>${escapeHtml(page.title)}</title>`,
    `<meta name="description" content="${escapeHtml(page.description)}" />`,
    page.status === 200 ? `<link rel="canonical" href="${escapeHtml(url)}" />` : '',
    page.indexable && siteIndexable ? '' : '<meta name="robots" content="noindex" />',
    '<meta property="og:type" content="website" />',
    `<meta property="og:site_name" content="${SITE}" />`,
    '<meta property="og:locale" content="fr_FR" />',
    `<meta property="og:title" content="${escapeHtml(page.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(page.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${escapeHtml(page.image.alt)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    page.jsonLd ? `<script type="application/ld+json">${safeJson({ ...page.jsonLd, url })}</script>` : '',
    page.data ? `<script id="recto-data" type="application/json">${safeJson(page.data)}</script>` : '',
  ].filter(Boolean);

  return template
    .replace(/<!--recto:head-->[\s\S]*?<!--\/recto:head-->/, () => tags.join('\n    '))
    .replace('<!--recto:body-->', () => page.body);
}
