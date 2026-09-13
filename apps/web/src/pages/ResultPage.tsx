import type { CardImage } from '@recto/shared';
import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { Picture } from '../components/Picture';
import type { ResultLocationState } from '../game/navigation';
import { useStartGame } from '../game/useStartGame';
import { difficultyLabel, t } from '../i18n';
import { formatDelta, formatDuration, formatPercent } from '../lib/format';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import styles from './ResultPage.module.css';

export function ResultPage() {
  const state = useLocation().state as ResultLocationState | null;
  const { user } = useAuth();
  const { start, pending, error } = useStartGame();
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  useDocumentTitle(t('result.title'));

  if (!state) return <Navigate to="/categories" replace />;

  const { result, previous, improved, category, categoryName, difficulty } = state;
  // EF-5.1 — écart signé au record antérieur : le principal motif de relance.
  const delta = previous ? result.durationMs - previous.durationMs : null;

  // Partage : feuille native du téléphone si elle existe, sinon texte et lien copiés. Le lien mène
  // à la catégorie, dont l'aperçu porte son image de partage (ENF-7.2).
  const share = async () => {
    const url = `${location.origin}/jouer/${category}`;
    const text = t('result.shareText', {
      pairs: result.pairs,
      category: categoryName,
      level: difficultyLabel(difficulty),
      time: formatDuration(result.durationMs),
    });
    try {
      if (navigator.share) {
        await navigator.share({ title: 'RECTO', text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setShareStatus(t('result.shareCopied'));
    } catch (caught) {
      // Feuille de partage fermée par le joueur : rien à signaler.
      if (!(caught instanceof DOMException && caught.name === 'AbortError')) setShareStatus(t('result.shareFailed'));
    }
  };

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
        <button type="button" className="btn btn-ghost" onClick={share}>
          {t('result.share')}
        </button>
      </div>
      <p className={styles.shareStatus} role="status">
        {shareStatus}
      </p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {/* § 3.2 — le compte est proposé juste après un résultat que le joueur souhaite conserver. */}
      {!user && (
        <div className={styles.cta}>
          <p>{t('result.saveCta')}</p>
          <Link className="btn" to={`/inscription?retour=${encodeURIComponent('/profil')}`}>
            {t('result.createAccount')}
          </Link>
        </div>
      )}

      {state.cards && state.cards.length > 0 && <CardsReview cards={state.cards} />}
    </section>
  );
}

/**
 * « Chaque carte vous apprend quelque chose » : les images de la partie, avec leurs métadonnées
 * pédagogiques quand elles existent (EF-7.3). Préfigure les fiches pédagogiques de la version 2.
 */
function CardsReview({ cards }: { cards: CardImage[] }) {
  const sorted = [...cards].sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  return (
    <section className={styles.review} aria-labelledby="result-cards">
      <h2 id="result-cards" className={styles.reviewTitle}>
        {t('result.cards')}
      </h2>
      <ul className={styles.cards}>
        {sorted.map((card) => {
          const meta = [card.date, card.place].filter(Boolean).join(' · ');
          return (
            <li key={card.id} className={styles.cardItem}>
              <Picture className={styles.cardImage} sources={card.sources} size={200} alt="" />
              <div className={styles.cardText}>
                <p className={styles.cardTitle}>{card.title}</p>
                {meta && <p className={styles.cardMeta}>{meta}</p>}
                {card.caption && <p className={styles.cardCaption}>{card.caption}</p>}
              </div>
            </li>
          );
        })}
      </ul>
      <p className={styles.cardsCredits}>
        <Link to="/credits">{t('result.cardsCredits')}</Link>
      </p>
    </section>
  );
}
