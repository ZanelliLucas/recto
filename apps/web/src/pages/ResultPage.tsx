import { Link, Navigate, useLocation } from 'react-router';
import type { ResultLocationState } from '../game/navigation';
import { useStartGame } from '../game/useStartGame';
import { difficultyLabel, t } from '../i18n';
import { formatDelta, formatDuration, formatPercent } from '../lib/format';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import styles from './ResultPage.module.css';

export function ResultPage() {
  const state = useLocation().state as ResultLocationState | null;
  const { start, pending, error } = useStartGame();
  useDocumentTitle(t('result.title'));

  if (!state) return <Navigate to="/categories" replace />;

  const { result, previous, improved, category, categoryName, difficulty } = state;
  // EF-5.1 — écart signé au record antérieur : le principal motif de relance.
  const delta = previous ? result.durationMs - previous.bestMs : null;

  return (
    <section className={styles.result} aria-labelledby="result-title">
      <p className={styles.kicker}>
        {categoryName} · {difficultyLabel(difficulty)}
      </p>
      <h1 id="result-title" className={styles.title}>
        {t('result.title')}
      </h1>
      <p className={styles.time}>{formatDuration(result.durationMs)}</p>
      {improved && <p className={styles.badge}>{previous ? t('result.newRecord') : t('result.firstRecord')}</p>}
      {delta !== null && (
        <p className={styles.delta} data-better={delta < 0}>
          {t('result.delta', { delta: formatDelta(delta) })}
        </p>
      )}

      <dl className={styles.stats}>
        <div>
          <dt>{t('result.moves')}</dt>
          <dd>{result.moves}</dd>
        </div>
        <div>
          <dt>{t('result.accuracy')}</dt>
          <dd>{formatPercent(result.accuracy)}</dd>
        </div>
        <div>
          <dt>{t('result.pairs')}</dt>
          <dd>{result.pairs}</dd>
        </div>
      </dl>

      <div className={styles.actions}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={pending !== null}
          onClick={() => start(category, categoryName, difficulty)}
          autoFocus
        >
          {t('result.replay')}
        </button>
        <Link className="btn" to={`/jouer/${category}`}>
          {t('result.changeLevel')}
        </Link>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <p className={styles.notice}>{t('app.guestNotice')}</p>
    </section>
  );
}
