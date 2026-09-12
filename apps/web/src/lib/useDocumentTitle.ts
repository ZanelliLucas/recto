import { useEffect } from 'react';

/** Titre de l'onglet propre à chaque écran (WCAG 2.4.2). */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} — RECTO` : 'RECTO — Retournez. Retenez.';
  }, [title]);
}
