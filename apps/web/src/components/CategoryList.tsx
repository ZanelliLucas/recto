import { useCategories } from '../api/useCategories';
import { useStartGame } from '../game/useStartGame';
import { t } from '../i18n';
import { CategoryCard } from './CategoryCard';
import { CategoryFilters, useCategoryFilters } from './CategoryFilters';
import styles from './CategoryList.module.css';

/** En deçà, la grille se parcourt d'un coup d'œil : la barre de recherche serait du bruit. */
const FILTERS_FROM = 8;

export function CategoryList({ headingLevel = 3 }: { headingLevel?: 2 | 3 }) {
  const state = useCategories();
  const { start, pending, error } = useStartGame();
  const categories = state.status === 'ready' ? state.categories : [];
  const { query, setQuery, sort, setSort, shown } = useCategoryFilters(categories);

  if (state.status === 'loading') {
    return (
      <p className={styles.status} role="status">
        {t('categories.loading')}
      </p>
    );
  }
  if (state.status === 'error') {
    return (
      <p className={styles.error} role="alert">
        {t('categories.error')}
      </p>
    );
  }
  if (categories.length === 0) return <p className={styles.status}>{t('categories.empty')}</p>;

  return (
    <>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {categories.length >= FILTERS_FROM && (
        <CategoryFilters
          query={query}
          sort={sort}
          total={categories.length}
          shown={shown.length}
          onQuery={setQuery}
          onSort={setSort}
        />
      )}
      {shown.length === 0 ? (
        <p className={styles.status}>{t('categories.noMatch', { query: query.trim() })}</p>
      ) : (
        <div className={styles.grid}>
          {shown.map((category) => (
            <CategoryCard
              key={category.slug}
              category={category}
              pending={pending}
              headingLevel={headingLevel}
              onPlay={(difficulty) => start(category.slug, category.name, difficulty)}
            />
          ))}
        </div>
      )}
    </>
  );
}
