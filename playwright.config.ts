import { defineConfig } from '@playwright/test';

/**
 * Tests de bout en bout sur le build de production, servi en mode recette (aucune indexation).
 * Aucun navigateur n'est téléchargé : RECTO_E2E_BROWSER désigne un Chromium installé (Chrome,
 * Brave…) ; à défaut, Microsoft Edge.
 *
 *   RECTO_E2E_BROWSER="C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe" npm run test:e2e
 */
const PORT = 4820;
const executablePath = process.env.RECTO_E2E_BROWSER;

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'fr-FR',
    ...(executablePath ? { launchOptions: { executablePath } } : { channel: 'msedge' }),
  },
  projects: [
    { name: 'bureau', use: { viewport: { width: 1366, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: 'npm run build && node apps/server/dist/index.js',
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: true,
    timeout: 240_000,
    env: { NODE_ENV: 'production', PORT: String(PORT), APP_URL: `http://localhost:${PORT}`, APP_ENV: 'recette', BACKUPS: 'off' },
  },
});
