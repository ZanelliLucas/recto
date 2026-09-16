import type { DailyChallenge } from '@recto/shared';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useStartGame } from '../game/useStartGame';
import { t } from '../i18n';
import { DailyBoard } from './DailyBoard';
import styles from './DailyPanel.module.css';

/**
 * Défi du jour (§ 3.3) : une grille commune à tous jusqu'à minuit, et son classement. Le panneau
 * disparaît si le défi est indisponible plutôt que d'afficher une erreur sur l'accueil.
 */
export function DailyPanel() {
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const { start, pending } = useStartGame();
  const { user } = useAuth();

  useEffect(() => {
    let alive = true;
    api
      .daily()
      .then((found) => alive && setChallenge(found))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (!challenge?.category || !challenge.categoryName) return null;
  const { category, categoryName, difficulty, mine } = challenge;

  return (
    <section className={styles.panel} aria-labelledby="daily-title">
      <div className={styles.head}>
        <div>
          <h2 id="daily-title" className={styles.title}>
            {t('daily.title')}
          </h2>
          <p className={styles.category}>{categoryName}</p>
          <p className={styles.hint}>{t('daily.hint')}</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={pending !== null}
          onClick={() => start(category, categoryName, difficulty, true)}
        >
          {mine ? t('daily.replay') : t('daily.play')}
        </button>
      </div>
      {mine && <p className={styles.hint}>{t('daily.once')}</p>}
      <DailyBoard challenge={challenge} signedIn={user !== null} />
    </section>
  );
}
