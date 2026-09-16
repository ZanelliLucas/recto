import type { CategorySummary } from '@recto/shared';
import { useId, useMemo, useState } from 'react';
import { t } from '../i18n';
import styles from './CategoryFilters.module.css';

/** Tri « Sélection » : l'ordre voulu par l'éditeur, celui que renvoie l'API. */
export type CategorySort = 'default' | 'name' | 'images';

const SORTS: CategorySort[] = ['default', 'name', 'images'];

/** Comparaison indulgente : ni la casse ni les accents ne doivent faire échouer une recherche. */
const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export function matching(categories: CategorySummary[], query: string): CategorySummary[] {
  const needle = fold(query.trim());
  if (!needle) return categories;
  return categories.filter((category) => fold(`${category.name} ${category.description}`).includes(needle));
}

export function sorted(categories: CategorySummary[], sort: CategorySort): CategorySummary[] {
  if (sort === 'default') return categories;
  const ordered = [...categories];
  if (sort === 'name') ordered.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  else ordered.sort((a, b) => b.imageCount - a.imageCount || a.name.localeCompare(b.name, 'fr'));
  return ordered;
}

export interface CategoryFiltersState {
  query: string;
  sort: CategorySort;
}

export function useCategoryFilters(categories: CategorySummary[]) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<CategorySort>('default');
  const shown = useMemo(() => sorted(matching(categories, query), sort), [categories, query, sort]);
  return { query, setQuery, sort, setSort, shown };
}

interface Props extends CategoryFiltersState {
  total: number;
  shown: number;
  onQuery: (query: string) => void;
  onSort: (sort: CategorySort) => void;
}

/**
 * EF-3.2 — au-delà d'une dizaine de catégories, la liste seule ne suffit plus : un champ de
 * recherche et un tri permettent de retrouver une catégorie sans parcourir toute la grille.
 */
export function CategoryFilters({ query, sort, total, shown, onQuery, onSort }: Props) {
  const searchId = useId();
  const sortId = useId();

  return (
    <div className={styles.bar}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={searchId}>
          {t('categories.search')}
        </label>
        <div className={styles.search}>
          <input
            id={searchId}
            type="search"
            className={styles.input}
            value={query}
            placeholder={t('categories.searchPlaceholder')}
            autoComplete="off"
            onChange={(event) => onQuery(event.target.value)}
          />
          {query && (
            <button type="button" className={styles.clear} onClick={() => onQuery('')}>
              <span aria-hidden="true">×</span>
              <span className="visually-hidden">{t('categories.clear')}</span>
            </button>
          )}
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={sortId}>
          {t('categories.sort')}
        </label>
        <select id={sortId} className={styles.select} value={sort} onChange={(event) => onSort(event.target.value as CategorySort)}>
          {SORTS.map((option) => (
            <option key={option} value={option}>
              {t(`categories.sort.${option}`)}
            </option>
          ))}
        </select>
      </div>

      {/* Le nombre de résultats est annoncé aux lecteurs d'écran à chaque frappe (ENF-4.2). */}
      <p className={styles.count} role="status">
        {shown < 2 ? t('categories.countOne', { count: shown, total }) : t('categories.count', { count: shown, total })}
      </p>
    </div>
  );
}
