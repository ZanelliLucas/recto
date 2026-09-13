import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { renderPage, robotsTxt } from '../src/seo/pages';
import { PAGE_TEMPLATE, setup } from './helpers';

const embeddedData = (html: string) => {
  const match = /<script id="recto-data" type="application\/json">(.*?)<\/script>/.exec(html);
  return match ? (JSON.parse(match[1]!) as { categories: { slug: string }[] }) : null;
};

describe('pages servies avec leurs métadonnées (ENF-7.1)', () => {
  it('accueil : titre, adresse canonique, partage, contenu indexable et catégories jointes', async () => {
    const ctx = await setup([{ slug: 'monuments', count: 60 }]);
    const { text } = await ctx.agent.get('/').expect(200).expect('Content-Type', /html/);
    expect(text).toContain('<title>RECTO — Jeu de mémoire en ligne par catégories</title>');
    expect(text).toContain('<link rel="canonical" href="https://recto.test/" />');
    expect(text).toContain('<meta property="og:image" content="https://recto.test/og/recto.jpg" />');
    expect(text).toContain('<a href="/jouer/monuments">monuments</a>');
    expect(text).toContain('"@type":"WebSite"');
    expect(text).not.toContain('noindex');
    expect(embeddedData(text)?.categories.map((category) => category.slug)).toEqual(['monuments']);
  });

  it('catégorie : requête « memory », niveaux jouables, image de partage propre (ENF-7.2, ENF-7.3)', async () => {
    const ctx = await setup([{ slug: 'monuments', count: 60 }]);
    const { text } = await ctx.agent.get('/jouer/monuments').expect(200);
    expect(text).toContain('<title>Memory monuments : jeu de mémoire en ligne — RECTO</title>');
    expect(text).toContain('60 images, 8, 15 ou 30 paires à retrouver');
    expect(text).toContain('content="https://recto.test/og/categorie/monuments.jpg"');
    expect(text).toContain('<link rel="canonical" href="https://recto.test/jouer/monuments" />');
  });

  it('répond 404, sans indexation, pour une catégorie inconnue ou non publiée et une adresse inconnue', async () => {
    const ctx = await setup([{ slug: 'brouillon', count: 60, published: false }]);
    for (const path of ['/jouer/inconnue', '/jouer/brouillon', '/nulle-part']) {
      const { text } = await ctx.agent.get(path).expect(404);
      expect(text).toContain('<meta name="robots" content="noindex" />');
      expect(text).not.toContain('rel="canonical"');
    }
  });

  it('sert les pages de compte et de partie sans les indexer', async () => {
    const ctx = await setup([]);
    for (const path of ['/profil', '/parametres', '/connexion', '/partie/abc/resultat', '/admin/categories/x']) {
      const { text } = await ctx.agent.get(path).expect(200);
      expect(text).toContain('<meta name="robots" content="noindex" />');
    }
    const { text } = await ctx.agent.get('/mentions-legales').expect(200);
    expect(text).toContain('<title>Mentions légales — RECTO</title>');
    expect(text).not.toContain('noindex');
  });

  it('échappe titres et données jointes : aucune chaîne ne referme la balise script', () => {
    const html = renderPage(
      PAGE_TEMPLATE,
      {
        status: 200,
        title: 'A "B" <C>',
        description: 'd',
        path: '/x',
        indexable: true,
        image: { path: '/og/recto.jpg', alt: 'a' },
        body: '',
        data: { text: '</script><script>alert(1)</script> ' },
      },
      'https://recto.test',
      true,
    );
    expect(html).toContain('<title>A &quot;B&quot; &lt;C&gt;</title>');
    expect(html).not.toContain('</script><script>alert(1)');
    expect(embeddedData(html)).toEqual({ text: '</script><script>alert(1)</script> ' });
  });
});

describe('robots, plan du site, images de partage', () => {
  it('robots.txt désigne le plan du site ; hors production, il interdit tout', async () => {
    const ctx = await setup([]);
    const { text } = await ctx.agent.get('/robots.txt').expect(200).expect('Content-Type', /text\/plain/);
    expect(text).toContain('Disallow: /admin');
    expect(text).toContain('Sitemap: https://recto.test/sitemap.xml');
    expect(robotsTxt('https://recto.test', false)).toBe('User-agent: *\nDisallow: /\n');
  });

  it('le plan du site liste les pages publiques et les seules catégories jouables', async () => {
    const ctx = await setup([
      { slug: 'monuments', count: 60 },
      { slug: 'maigre', count: 3 },
      { slug: 'brouillon', count: 60, published: false },
    ]);
    const { text } = await ctx.agent.get('/sitemap.xml').expect(200).expect('Content-Type', /xml/);
    expect(text).toContain('<loc>https://recto.test/</loc>');
    expect(text).toContain('<loc>https://recto.test/confidentialite</loc>');
    expect(text).toContain('<loc>https://recto.test/jouer/monuments</loc>');
    expect(text).not.toContain('maigre');
    expect(text).not.toContain('brouillon');
  });

  it('compose une image 1200 × 630 par catégorie et pour le site', async () => {
    const ctx = await setup([{ slug: 'monuments', count: 60 }]);
    for (const path of ['/og/categorie/monuments.jpg', '/og/recto.jpg']) {
      const response = await ctx.agent.get(path).buffer(true).expect(200).expect('Content-Type', 'image/jpeg');
      const { width, height } = await sharp(response.body as Buffer).metadata();
      expect({ width, height }).toEqual({ width: 1200, height: 630 });
    }
    await ctx.agent.get('/og/categorie/inconnue.jpg').expect(404);
  });
});

describe('supervision (§ 7.5)', () => {
  it('expose une sonde de disponibilité', async () => {
    const ctx = await setup([]);
    const { body } = await ctx.agent.get('/api/health').expect(200);
    expect(body).toMatchObject({ status: 'ok', version: 'dev' });
  });
});
