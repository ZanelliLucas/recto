import { DIFFICULTIES, DIFFICULTY_ORDER, type CardImage } from '@recto/shared';
import { useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../api/client';
import { useCategories } from '../api/useCategories';
import { CardGallery } from '../components/CardGallery';
import { Picture } from '../components/Picture';
import { useBestTimes } from '../game/bestTimes';
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
  const bestTime = useBestTimes();
  const category = state.status === 'ready' ? state.categories.find((c) => c.slug === categorie) : undefined;
  useDocumentTitle(category ? `Memory ${category.name} : jeu de mémoire en ligne` : undefined);

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
        <Picture className={styles.banner} sources={category.thumbnail} size={800} alt="" />
        <div className={styles.headerText}>
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
          const best = available ? bestTime(category.slug, difficulty) : undefined;
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
                    : best !== undefined
                      ? t('difficulty.record', { time: formatDuration(best) })
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

      <CategoryGallery key={category.slug} slug={category.slug} count={category.imageCount} />
    </section>
  );
}

type GalleryState = { status: 'idle' } | { status: 'loading' } | { status: 'error' } | { status: 'ready'; cards: CardImage[] };

/**
 * Cartes de la catégorie, consultables avant de jouer (EF-7.3). Repliée par défaut : la page reste
 * tournée vers le choix du niveau, et les images ne sont chargées qu'à l'ouverture.
 */
function CategoryGallery({ slug, count }: { slug: string; count: number }) {
  const [state, setState] = useState<GalleryState>({ status: 'idle' });

  const load = () => {
    if (state.status === 'loading' || state.status === 'ready') return;
    setState({ status: 'loading' });
    api.categoryCards(slug).then(
      (cards) => setState({ status: 'ready', cards }),
      () => setState({ status: 'error' }),
    );
  };

  return (
    <details
      className={styles.gallery}
      onToggle={(event) => {
        if (event.currentTarget.open) load();
      }}
    >
      <summary className={styles.gallerySummary}>{t('level.gallery', { count })}</summary>
      <div className={styles.galleryBody}>
        {state.status === 'loading' && <p role="status">{t('level.galleryLoading')}</p>}
        {state.status === 'error' && <p role="alert">{t('level.galleryError')}</p>}
        {state.status === 'ready' && (
          <>
            <CardGallery cards={state.cards} />
            <p className={styles.galleryCredits}>
              <Link to="/credits">{t('result.cardsCredits')}</Link>
            </p>
          </>
        )}
      </div>
    </details>
  );
}
