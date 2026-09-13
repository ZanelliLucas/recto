import { expect, test, type Page, type Response } from '@playwright/test';

/** Partie créée par l'interface : on relit sa grille pour la jouer comme un joueur parfait. */
interface CreatedGame {
  gameId: string;
  deck: string[];
  images: { id: string; title: string }[];
}

const isCreation = (response: Response) =>
  response.url().endsWith('/api/games') && response.request().method() === 'POST' && response.status() === 201;

/** Lance une partie depuis l'accueil, en un clic (CA-01), et attend la fin du décompte. */
async function startFromHome(page: Page, category: string, level: 'Facile' | 'Normal' | 'Difficile'): Promise<CreatedGame> {
  await page.goto('/');
  const card = page.locator('article').filter({ has: page.getByRole('heading', { name: category }) });
  const created = page.waitForResponse(isCreation);
  await card.getByRole('button', { name: new RegExp(`^${level}`) }).click();
  const game = (await (await created).json()) as CreatedGame;
  await expect(page).toHaveURL(new RegExp(`/partie/${game.gameId}$`));
  await expect(page.getByRole('button', { name: 'Pause' })).toBeEnabled({ timeout: 20_000 });
  return game;
}

/** Positions des paires dans l'ordre de la grille. */
function pairs(deck: readonly string[]): [number, number][] {
  const positions = new Map<string, number[]>();
  deck.forEach((id, index) => positions.set(id, [...(positions.get(id) ?? []), index]));
  return [...positions.values()].map(([a, b]) => [a!, b!]);
}

test.describe('bureau', () => {
  test.skip(({ isMobile }) => isMobile, 'parcours au clavier');

  test('une partie complète se joue au clavier seul, puis on revoit les cartes (CA-07, CA-01)', async ({ page }) => {
    // Feuille de partage simulée : le texte partagé est relevé au lieu d'ouvrir celle du système.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async (data: ShareData) => {
          (window as unknown as { __shared: ShareData }).__shared = data;
        },
      });
    });
    const game = await startFromHome(page, 'Monuments', 'Facile');

    // Tabulation jusqu'à la grille : une seule carte y est atteignable (tabulation itinérante).
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab');
      const label = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '');
      if (label.startsWith('Carte ')) break;
    }
    await expect(page.locator(':focus')).toHaveAttribute('aria-label', /^Carte \d+, face cachée$/);

    for (const [a, b] of pairs(game.deck)) {
      for (const target of [a, b]) {
        await page.keyboard.press('Home');
        for (let step = 0; step < target; step++) await page.keyboard.press('ArrowRight');
        await page.keyboard.press(target === a ? 'Enter' : 'Space');
      }
      // Rythme humain : le serveur refuse une partie plus rapide que 300 ms par paire.
      await page.waitForTimeout(350);
    }

    await expect(page).toHaveURL(/\/resultat$/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { level: 1, name: 'Partie terminée' })).toBeVisible();
    await expect(page.getByText('100 %')).toBeVisible();
    const review = page.getByRole('region', { name: 'Les cartes de la partie' });
    await expect(review.getByRole('listitem')).toHaveCount(game.images.length);
    // Le titre est un lien dont le nom accessible précise « en savoir plus » : on cherche la carte qui le contient.
    await expect(review.getByRole('listitem').filter({ hasText: game.images[0]!.title })).toHaveCount(1);
    // « En savoir plus » : les titres mènent à l'article de Wikipédia, dans un nouvel onglet.
    const more = review.getByRole('link', { name: /en savoir plus sur Wikipédia/ });
    expect(await more.count()).toBeGreaterThan(0);
    await expect(more.first()).toHaveAttribute('href', /^https:\/\/fr\.wikipedia\.org\/wiki\//);
    await expect(more.first()).toHaveAttribute('target', '_blank');

    await page.getByRole('button', { name: 'Partager' }).click();
    const shared = await page.evaluate(() => (window as unknown as { __shared?: ShareData }).__shared);
    expect(shared?.text).toContain('les 8 paires de « Monuments » (niveau Facile)');
    expect(shared?.url).toMatch(/\/jouer\/monuments$/);
  });

  test('l’abandon se confirme dans la page et suspend la partie', async ({ page }) => {
    await startFromHome(page, 'Drapeaux', 'Facile');
    await page.getByRole('button', { name: 'Abandonner' }).click();
    const dialog = page.getByRole('alertdialog', { name: 'Abandonner la partie ?' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Continuer la partie' })).toBeFocused();
    await expect(page.getByRole('button', { name: 'Reprendre' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Pause' })).toBeEnabled();

    await page.getByRole('button', { name: 'Abandonner' }).click();
    await dialog.getByRole('button', { name: 'Abandonner' }).click();
    await expect(page).toHaveURL(/\/jouer\/drapeaux$/);
  });

  test('quitter l’onglet met la partie en pause', async ({ page }) => {
    await startFromHome(page, 'Faune', 'Facile');
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.getByText('Partie en pause')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reprendre' }).first()).toBeVisible();
  });
});

test.describe('mobile', () => {
  test.skip(({ isMobile }) => !isMobile, 'grille recomposée pour le mobile');

  test('la grille Difficile reste actionnable au pouce, sans défilement horizontal (A-7)', async ({ page }) => {
    await startFromHome(page, 'Histoire', 'Difficile');
    const cards = page.getByRole('button', { name: /^Carte \d+, face cachée$/ });
    await expect(cards).toHaveCount(60);
    const widths = await cards.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().width));
    expect(Math.min(...widths)).toBeGreaterThanOrEqual(56);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test('l’interface passe en anglais depuis les paramètres, puis revient au français (EF-8.4)', async ({ page }) => {
  await page.goto('/parametres');
  await page.getByLabel('Langue').selectOption('en');
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Categories' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  await page.getByLabel('Language').selectOption('fr');
  await expect(page.getByRole('heading', { level: 1, name: 'Paramètres' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
});

test('le site est installable : manifeste, icônes, service worker et page hors ligne', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest).toMatchObject({ short_name: 'RECTO', display: 'standalone', start_url: '/' });
  for (const icon of manifest.icons as { src: string }[]) expect((await request.get(icon.src)).ok()).toBe(true);
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(new URL(scope).pathname).toBe('/');
  expect((await request.get('/offline.html')).ok()).toBe(true);
});

test('mentions légales et confidentialité sont accessibles depuis toutes les pages (CA-13)', async ({ page }) => {
  for (const path of ['/', '/categories', '/jouer/monuments', '/comment-jouer', '/credits', '/parametres', '/nulle-part']) {
    await page.goto(path);
    const footer = page.getByRole('contentinfo');
    await expect(footer.getByRole('link', { name: 'Mentions légales' })).toHaveAttribute('href', '/mentions-legales');
    await expect(footer.getByRole('link', { name: 'Confidentialité' })).toHaveAttribute('href', '/confidentialite');
  }
});
