import type { CreditsCategory } from '@recto/shared';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { t } from '../i18n';
import { formatDay } from '../lib/format';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import styles from './CreditsPage.module.css';

type CreditsState = { status: 'loading' } | { status: 'ready'; credits: CreditsCategory[] } | { status: 'error' };

/** ENF-8, CA-12 — crédits générés automatiquement à partir du contenu publié. */
export function CreditsPage() {
  useDocumentTitle(t('credits.title'));
  const [state, setState] = useState<CreditsState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    api.credits().then(
      (credits) => active && setState({ status: 'ready', credits }),
      () => active && setState({ status: 'error' }),
    );
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>{t('credits.title')}</h1>
      <p className={styles.intro}>{t('credits.intro')}</p>
      {state.status === 'loading' && <p role="status">{t('credits.loading')}</p>}
      {state.status === 'error' && <p role="alert">{t('credits.error')}</p>}
      {state.status === 'ready' &&
        state.credits.map((category) => (
          <section key={category.slug} aria-labelledby={`credits-${category.slug}`} className={styles.category}>
            <h2 id={`credits-${category.slug}`}>{category.name}</h2>
            <ul className={styles.list}>
              {category.images.map((image) => (
                <li key={image.id}>
                  <strong>{image.title}</strong> — {image.author} —{' '}
                  {image.licenceUrl ? (
                    <a href={image.licenceUrl} target="_blank" rel="noopener noreferrer">
                      {image.licence}
                    </a>
                  ) : (
                    image.licence
                  )}{' '}
                  —{' '}
                  <a href={image.sourceUrl} target="_blank" rel="noopener noreferrer">
                    {t('credits.source')}
                  </a>{' '}
                  <span className={styles.date}>({t('credits.retrieved', { date: formatDay(image.retrievedAt) })})</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </section>
  );
}
