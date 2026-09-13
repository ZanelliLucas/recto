import type { CategorySummary } from '@recto/shared';
import { useEffect, useState } from 'react';
import { api } from './client';

let cache: Promise<CategorySummary[]> | null = null;

/**
 * ENF-2.1 — le serveur joint la liste des catégories à la page d'accueil et aux pages de catégories :
 * le premier affichage se passe alors de tout aller-retour. Lue une seule fois.
 */
function embeddedCategories(): CategorySummary[] | null {
  const element = document.getElementById('recto-data');
  if (!element?.textContent) return null;
  element.remove();
  try {
    const data = JSON.parse(element.textContent) as { categories?: CategorySummary[] };
    return Array.isArray(data.categories) ? data.categories : null;
  } catch {
    return null;
  }
}

const embedded = embeddedCategories();
if (embedded) cache = Promise.resolve(embedded);

/** Les catégories changent rarement : une seule requête par visite, relancée en cas d'échec. */
function loadCategories(): Promise<CategorySummary[]> {
  cache ??= api.categories().catch((error: unknown) => {
    cache = null;
    throw error;
  });
  return cache;
}

export type CategoriesState =
  | { status: 'loading' }
  | { status: 'ready'; categories: CategorySummary[] }
  | { status: 'error' };

export function useCategories(): CategoriesState {
  // Données jointes à la page : prêtes dès le premier rendu, sans état de chargement.
  const [state, setState] = useState<CategoriesState>(() =>
    embedded ? { status: 'ready', categories: embedded } : { status: 'loading' },
  );

  useEffect(() => {
    let active = true;
    loadCategories().then(
      (categories) => active && setState({ status: 'ready', categories }),
      () => active && setState({ status: 'error' }),
    );
    return () => {
      active = false;
    };
  }, []);

  return state;
}
