import { DIFFICULTY_ORDER, type Difficulty, type PlayerStats, type RecordEntry } from '@recto/shared';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { authApi, meApi } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { AvatarIcon } from '../../components/AvatarIcon';
import { invalidateStats, loadStats } from '../../game/bestTimes';
import { difficultyLabel, t } from '../../i18n';
import { errorText } from '../../lib/errors';
import { formatDay, formatDuration, formatPercent, formatPlayTime } from '../../lib/format';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import styles from './account.module.css';

/** § 3.1 /profil — statistiques, records par catégorie et difficulté, historique (EF-5). */
export function ProfilePage() {
  useDocumentTitle(t('profile.title'));
  const { ready, user, logout } = useAuth();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [guestGames, setGuestGames] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    loadStats(user.id).then(
      (loaded) => active && setStats(loaded),
      (caught: unknown) => active && setError(errorText(caught)),
    );
    meApi.guestImport().then(
      ({ available }) => active && setGuestGames(available),
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [user]);

  if (!ready) return <p role="status">{t('profile.loading')}</p>;
  if (!user) return <Navigate to={`/connexion?retour=${encodeURIComponent('/profil')}`} replace />;

  // EF-4.4 — les parties invité de ce navigateur rejoignent le compte.
  const importGuest = async () => {
    setError(null);
    try {
      const { imported } = await meApi.importGuest();
      setGuestGames(0);
      setNotice(t('profile.import.done', { count: imported }));
      invalidateStats();
      setStats(await loadStats(user.id));
    } catch (caught) {
      setError(errorText(caught));
    }
  };

  const resend = async () => {
    setError(null);
    try {
      await authApi.resendVerification();
      setNotice(t('profile.resent'));
    } catch (caught) {
      setError(errorText(caught));
    }
  };

  return (
    <div className={`${styles.page} ${styles.wide}`}>
      <section className={styles.panel}>
        <div className={styles.identity}>
          <AvatarIcon avatar={user.avatar} size={64} />
          <div className={styles.grow}>
            <h1>{user.pseudo}</h1>
            <p className={styles.meta}>{t('profile.since', { date: formatDay(user.createdAt.slice(0, 10)) })}</p>
          </div>
          <div className={styles.actions}>
            <Link className="btn" to="/parametres">
              {t('profile.settings')}
            </Link>
            <button type="button" className="btn btn-ghost" onClick={logout}>
              {t('profile.logout')}
            </button>
          </div>
        </div>
        {!user.emailVerified && (
          <div className={styles.banner}>
            <span>{t('profile.unverified')}</span>
            <button type="button" className="btn" onClick={resend}>
              {t('profile.resend')}
            </button>
          </div>
        )}
        <div aria-live="polite">
          {notice && <p className={styles.success}>{notice}</p>}
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </div>
      </section>

      {guestGames > 0 && (
        <section className={styles.panel}>
          <h2>{t('profile.import.title')}</h2>
          <p className={styles.intro}>{t('profile.import.text', { count: guestGames })}</p>
          <div className={styles.actions}>
            <button type="button" className="btn btn-primary" onClick={importGuest}>
              {t('profile.import.submit')}
            </button>
          </div>
        </section>
      )}

      {stats ? <Statistics stats={stats} /> : !error && <p role="status">{t('profile.loading')}</p>}
    </div>
  );
}

function Statistics({ stats }: { stats: PlayerStats }) {
  const { totals } = stats;
  const byCategory = new Map<string, { name: string; entries: Partial<Record<Difficulty, RecordEntry>> }>();
  for (const record of stats.records) {
    const row = byCategory.get(record.category) ?? { name: record.categoryName, entries: {} };
    row.entries[record.difficulty] = record;
    byCategory.set(record.category, row);
  }

  return (
    <>
      <section className={styles.panel} aria-labelledby="profil-chiffres">
        <h2 id="profil-chiffres">{t('profile.totals')}</h2>
        <dl className={styles.tiles}>
          <div className={styles.tile}>
            <dt>{t('profile.gamesPlayed')}</dt>
            <dd>{totals.gamesPlayed}</dd>
          </div>
          <div className={styles.tile}>
            <dt>{t('profile.gamesFinished')}</dt>
            <dd>{totals.gamesFinished}</dd>
          </div>
          <div className={styles.tile}>
            <dt>{t('profile.playTime')}</dt>
            <dd>{formatPlayTime(totals.totalPlayMs)}</dd>
          </div>
          <div className={styles.tile}>
            <dt>{t('profile.cardsFlipped')}</dt>
            <dd>{totals.cardsFlipped}</dd>
          </div>
          <div className={styles.tile}>
            <dt>{t('profile.completion')}</dt>
            <dd>
              {totals.completed} / {totals.completable}
            </dd>
          </div>
        </dl>
      </section>

      <section className={styles.panel} aria-labelledby="profil-records">
        <h2 id="profil-records">{t('profile.records')}</h2>
        {byCategory.size === 0 ? (
          <p className={styles.intro}>{t('profile.noRecords')}</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">{t('profile.category')}</th>
                  {DIFFICULTY_ORDER.map((difficulty) => (
                    <th key={difficulty} scope="col">
                      {difficultyLabel(difficulty)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...byCategory.entries()].map(([slug, row]) => (
                  <tr key={slug}>
                    <th scope="row">
                      <Link to={`/jouer/${slug}`}>{row.name}</Link>
                    </th>
                    {DIFFICULTY_ORDER.map((difficulty) => {
                      const record = row.entries[difficulty];
                      return (
                        <td key={difficulty}>
                          {record ? (
                            <>
                              <span className={styles.time}>{formatDuration(record.bestMs)}</span>
                              <span className={styles.small}>
                                {t('profile.recordDetail', {
                                  moves: record.bestMoves,
                                  accuracy: formatPercent(record.bestAccuracy),
                                  games: record.gamesFinished,
                                })}
                              </span>
                            </>
                          ) : (
                            <span className={styles.small}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {stats.history.length > 0 && (
        <section className={styles.panel} aria-labelledby="profil-historique">
          <h2 id="profil-historique">{t('profile.history')}</h2>
          <ul className={styles.history}>
            {stats.history.map((game) => (
              <li key={game.id}>
                <span>
                  {game.categoryName} · {difficultyLabel(game.difficulty)}
                </span>
                <span>
                  {game.status === 'terminee' && game.durationMs !== null ? (
                    <span className={styles.time}>{formatDuration(game.durationMs)}</span>
                  ) : (
                    <span className={styles.meta}>{t('profile.abandoned')}</span>
                  )}{' '}
                  <span className={styles.meta}>· {formatDay(game.playedAt.slice(0, 10))}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
