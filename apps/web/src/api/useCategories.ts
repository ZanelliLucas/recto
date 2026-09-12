import type { CategorySummary } from '@recto/shared';
import { useEffect, useState } from 'react';
import { api } from './client';

let cache: Promise<CategorySummary[]> | null = null;

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
  const [state, setState] = useState<CategoriesState>({ status: 'loading' });

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
