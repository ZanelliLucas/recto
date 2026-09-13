import type { AudienceSummary } from '@recto/shared';
import { useEffect, useState } from 'react';
import { adminApi } from '../../api/client';
import { formatDay } from '../../lib/format';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import styles from './AdminAudiencePage.module.css';

type State = { status: 'loading' } | { status: 'ready'; summary: AudienceSummary } | { status: 'error' };

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/** ENF-6.4 — fréquentation sans cookie : compteurs agrégés des trente derniers jours. */
export function AdminAudiencePage() {
  useDocumentTitle('Audience — Back-office');
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    adminApi.audience().then(
      (summary) => setState({ status: 'ready', summary }),
      () => setState({ status: 'error' }),
    );
  }, []);

  if (state.status === 'loading') return <p role="status">Chargement…</p>;
  if (state.status === 'error') return <p role="alert">Impossible de charger la fréquentation.</p>;

  const { summary } = state;
  const peak = Math.max(1, ...summary.days.map((day) => day.views));
  const days = [...summary.days].reverse();

  return (
    <div className={styles.page}>
      <h1>Audience</h1>
      <p className={styles.intro}>
        Du {formatDay(summary.from)} au {formatDay(summary.to)}. Pages vues comptées sans cookie ni identifiant : un
        visiteur qui revient compte à nouveau.
      </p>

      <dl className={styles.tiles}>
        <div>
          <dt>Pages vues</dt>
          <dd>{sum(summary.days.map((day) => day.views))}</dd>
        </div>
        <div>
          <dt>Parties lancées</dt>
          <dd>{sum(summary.days.map((day) => day.gamesStarted))}</dd>
        </div>
        <div>
          <dt>Parties terminées</dt>
          <dd>{sum(summary.days.map((day) => day.gamesFinished))}</dd>
        </div>
      </dl>

      <section className={styles.panel}>
        <h2>Par jour</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Jour</th>
                <th scope="col">Pages vues</th>
                <th scope="col" className={styles.number}>
                  Parties lancées
                </th>
                <th scope="col" className={styles.number}>
                  Terminées
                </th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day.day}>
                  <th scope="row">{formatDay(day.day)}</th>
                  <td>
                    <span className={styles.barCell}>
                      <span className={styles.bar} style={{ width: `${(day.views / peak) * 100}%` }} aria-hidden="true" />
                      <span className={styles.number}>{day.views}</span>
                    </span>
                  </td>
                  <td className={styles.number}>{day.gamesStarted}</td>
                  <td className={styles.number}>{day.gamesFinished}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className={styles.columns}>
        <section className={styles.panel}>
          <h2>Pages les plus vues</h2>
          {summary.pages.length === 0 ? (
            <p className={styles.intro}>Aucune page vue sur la période.</p>
          ) : (
            <table className={styles.table}>
              <tbody>
                {summary.pages.map((page) => (
                  <tr key={page.path}>
                    <th scope="row">
                      <code>{page.path}</code>
                    </th>
                    <td className={styles.number}>{page.views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className={styles.panel}>
          <h2>Parties par catégorie</h2>
          {summary.categories.length === 0 ? (
            <p className={styles.intro}>Aucune partie sur la période.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Catégorie</th>
                  <th scope="col" className={styles.number}>
                    Lancées
                  </th>
                  <th scope="col" className={styles.number}>
                    Terminées
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.categories.map((category) => (
                  <tr key={category.name}>
                    <th scope="row">{category.name}</th>
                    <td className={styles.number}>{category.games}</td>
                    <td className={styles.number}>{category.finished}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
