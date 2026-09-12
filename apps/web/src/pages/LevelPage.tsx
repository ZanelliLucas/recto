import { DIFFICULTIES, DIFFICULTY_ORDER } from '@recto/shared';
import type { CSSProperties } from 'react';
import { Link, useParams } from 'react-router';
import { useCategories } from '../api/useCategories';
import { Picture } from '../components/Picture';
import { getRecord } from '../game/records';
import { useStartGame } from '../game/useStartGame';
import { difficultyLabel, t } from '../i18n';
import { formatDuration } from '../lib/format';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import styles from './LevelPage.module.css';

/** Sélection du niveau, avec rappel du record personnel par niveau (§ 3.1). */
export function LevelPage() {
  const { categorie } = useParams();
  const state = useCategories();
  const { start, pending, error } = useStartGame();
  const category = state.status === 'ready' ? state.categories.find((c) => c.slug === categorie) : undefined;
  useDocumentTitle(category?.name);

  if (state.status === 'loading') return <p role="status">{t('categories.loading')}</p>;
  if (state.status === 'error') return <p role="alert">{t('categories.error')}</p>;
  if (!category) {
    return (
      <div className={styles.page}>
        <p>{t('level.unknown')}</p>
        <Link className="btn" to="/categories">
          {t('level.back')}
        </Link>
      </div>
    );
  }

  return (
    <section className={styles.page}>
      <Link to="/categories" className={styles.back}>
        ← {t('level.back')}
      </Link>
      <header className={styles.header}>
        <Picture className={styles.thumb} sources={category.thumbnail} size={200} alt="" />
        <div>
          <h1>{category.name}</h1>
          <p>
            {category.description} {t('categories.images', { count: category.imageCount })}.
          </p>
        </div>
      </header>

      <h2 className={styles.subtitle}>{t('level.title')}</h2>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <ul className={styles.levels}>
        {DIFFICULTY_ORDER.map((difficulty) => {
          const spec = DIFFICULTIES[difficulty];
          const available = category.difficulties.includes(difficulty);
          const record = available ? getRecord(category.slug, difficulty) : undefined;
          return (
            <li key={difficulty}>
              <button
                type="button"
                className={styles.level}
                disabled={!available || pending !== null}
                aria-busy={pending === `${category.slug}:${difficulty}`}
                onClick={() => start(category.slug, category.name, difficulty)}
              >
                <span className={styles.levelName}>{difficultyLabel(difficulty)}</span>
                <span className={styles.levelSpec}>
                  {t('difficulty.pairs', { pairs: spec.pairs, cards: spec.pairs * 2 })} · {t(`difficulty.target.${difficulty}`)}
                </span>
                <span className={styles.levelRecord}>
                  {!available
                    ? t('difficulty.unavailable')
                    : record
                      ? t('difficulty.record', { time: formatDuration(record.bestMs) })
                      : t('difficulty.noRecord')}
                </span>
                <span className={styles.miniGrid} style={{ '--cols': spec.cols } as CSSProperties} aria-hidden="true">
                  {Array.from({ length: spec.pairs * 2 }, (_, i) => (
                    <span key={i} />
                  ))}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
