import { useMemo } from 'react';
import { CategoryList } from '../components/CategoryList';
import { useBestTimes } from '../game/bestTimes';
import { getLastPlayed } from '../game/records';
import { useStartGame } from '../game/useStartGame';
import { difficultyLabel, t } from '../i18n';
import { formatDuration } from '../lib/format';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import styles from './HomePage.module.css';

export function HomePage() {
  useDocumentTitle();
  const last = useMemo(getLastPlayed, []);
  const bestTime = useBestTimes();
  const best = last ? bestTime(last.category, last.difficulty) : undefined;
  const { start, pending, error } = useStartGame();

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.cards} aria-hidden="true">
          <span className={styles.cardBack} />
          <span className={styles.cardFront} />
        </div>
        <h1 className={styles.title}>{t('app.name')}</h1>
        <p className={styles.tagline}>{t('app.tagline')}</p>
        <p className={styles.promise}>{t('app.promise')}</p>

        {/* Parcours du joueur récurrent (§ 3.3) : relance directe au dernier niveau joué. */}
        {last && (
          <div className={styles.replay}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={pending !== null}
              onClick={() => start(last.category, last.categoryName, last.difficulty)}
            >
              {t('home.replay')} ·{' '}
              {t('home.replayHint', { category: last.categoryName, difficulty: difficultyLabel(last.difficulty) })}
            </button>
            {best !== undefined && (
              <span className={styles.replayRecord}>{t('difficulty.record', { time: formatDuration(best) })}</span>
            )}
          </div>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </section>

      <section aria-labelledby="home-categories">
        <h2 id="home-categories" className={styles.sectionTitle}>
          {t('home.categories')}
        </h2>
        <CategoryList />
      </section>
    </>
  );
}
