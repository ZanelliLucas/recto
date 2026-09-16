import type { DailyChallenge } from '@recto/shared';
import { AvatarIcon } from './AvatarIcon';
import { t } from '../i18n';
import { formatDuration } from '../lib/format';
import styles from './DailyBoard.module.css';

/**
 * Classement du défi du jour. Seuls les comptes y figurent : un invité joue le défi, mais aucune
 * donnée nominative ne naît d'une visite anonyme (ENF-6.1).
 */
export function DailyBoard({ challenge, signedIn }: { challenge: DailyChallenge; signedIn: boolean }) {
  const { leaderboard, mine, players } = challenge;

  if (leaderboard.length === 0) {
    return <p className={styles.empty}>{signedIn ? t('daily.empty') : t('daily.guest')}</p>;
  }

  // La ligne du joueur est ajoutée sous le tableau quand son rang le laisse hors des vingt premiers.
  const outside = mine && !leaderboard.some((entry) => entry.mine) ? mine : null;

  return (
    <>
      <table className={styles.board}>
        <caption className="visually-hidden">{t('daily.board')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('daily.rank')}</th>
            <th scope="col">{t('daily.player')}</th>
            <th scope="col">{t('daily.time')}</th>
            <th scope="col">{t('daily.moves')}</th>
          </tr>
        </thead>
        <tbody>
          {[...leaderboard, ...(outside ? [outside] : [])].map((entry) => (
            <tr key={`${entry.rank}-${entry.pseudo}`} className={entry.mine ? styles.mine : undefined}>
              <td className={styles.rank}>{entry.rank}</td>
              <th scope="row" className={styles.player}>
                <AvatarIcon avatar={entry.avatar} size={24} />
                {entry.pseudo}
              </th>
              <td className={styles.time}>{formatDuration(entry.durationMs)}</td>
              <td className={styles.moves}>{entry.moves}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.note}>
        {players === 1 ? t('daily.playersOne') : t('daily.players', { count: players })}
        {mine && ` · ${mine.rank === 1 ? t('daily.yourRankFirst', { total: players }) : t('daily.yourRank', { rank: mine.rank, total: players })}`}
      </p>
      {!signedIn && <p className={styles.note}>{t('daily.guest')}</p>}
    </>
  );
}
