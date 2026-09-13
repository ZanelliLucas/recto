import { useEffect } from 'react';

/**
 * Titre de l'onglet propre à chaque écran (WCAG 2.4.2). Mêmes titres que ceux servis par le
 * serveur (apps/server/src/seo/pages.ts) : les moteurs qui exécutent le script voient les mêmes.
 */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} — RECTO` : 'RECTO — Jeu de mémoire en ligne par catégories';
  }, [title]);
}
