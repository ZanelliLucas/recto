import { useCategories } from '../api/useCategories';
import { useStartGame } from '../game/useStartGame';
import { t } from '../i18n';
import { CategoryCard } from './CategoryCard';
import styles from './CategoryList.module.css';

export function CategoryList() {
  const state = useCategories();
  const { start, pending, error } = useStartGame();

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
  if (state.categories.length === 0) return <p className={styles.status}>{t('categories.empty')}</p>;

  return (
    <>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.grid}>
        {state.categories.map((category) => (
          <CategoryCard
            key={category.slug}
            category={category}
            pending={pending}
            onPlay={(difficulty) => start(category.slug, category.name, difficulty)}
          />
        ))}
      </div>
    </>
  );
}
