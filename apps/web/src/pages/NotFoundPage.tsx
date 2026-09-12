import { Link } from 'react-router';
import { t } from '../i18n';
import { useDocumentTitle } from '../lib/useDocumentTitle';

export function NotFoundPage() {
  useDocumentTitle(t('notFound.title'));

  return (
    <section style={{ display: 'grid', justifyItems: 'center', gap: '1rem', padding: '3rem 1rem', textAlign: 'center' }}>
      <h1>{t('notFound.title')}</h1>
      <p style={{ margin: 0, color: 'var(--muted)' }}>{t('notFound.text')}</p>
      <Link className="btn btn-primary" to="/">
        {t('notFound.back')}
      </Link>
    </section>
  );
}
