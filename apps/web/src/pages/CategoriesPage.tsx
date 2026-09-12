import { CategoryList } from '../components/CategoryList';
import { t } from '../i18n';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import styles from './CategoriesPage.module.css';

export function CategoriesPage() {
  useDocumentTitle(t('categories.title'));

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>{t('categories.title')}</h1>
      <CategoryList />
    </section>
  );
}
