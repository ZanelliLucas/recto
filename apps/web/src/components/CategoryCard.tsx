import { DIFFICULTIES, DIFFICULTY_ORDER, type CategorySummary, type Difficulty } from '@recto/shared';
import { Link } from 'react-router';
import { useBestTimes } from '../game/bestTimes';
import { difficultyLabel, t } from '../i18n';
import { formatDuration } from '../lib/format';
import styles from './CategoryCard.module.css';
import { Picture } from './Picture';

interface CategoryCardProps {
  category: CategorySummary;
  /** Partie en cours d'ouverture (`catégorie:difficulté`), qui neutralise les autres boutons. */
  pending: string | null;
  onPlay: (difficulty: Difficulty) => void;
  /** Niveau du titre, selon la page : les titres ne sautent jamais de niveau (WCAG 1.3.1). */
  headingLevel?: 2 | 3;
}

/** Chaque niveau se lance directement depuis la carte : accueil → partie en un clic (CA-01). */
export function CategoryCard({ category, pending, onPlay, headingLevel = 3 }: CategoryCardProps) {
  const bestTime = useBestTimes();
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <article className={styles.card}>
      <Link to={`/jouer/${category.slug}`} className={styles.head}>
        <Picture className={styles.thumb} sources={category.thumbnail} size={200} alt="" />
        <span className={styles.heading}>
          <Heading className={styles.name}>{category.name}</Heading>
          <span className={styles.count}>{t('categories.images', { count: category.imageCount })}</span>
        </span>
      </Link>
      <p className={styles.description}>{category.description}</p>
      <ul className={styles.levels} aria-label={t('categories.levelsLabel', { category: category.name })}>
        {DIFFICULTY_ORDER.map((difficulty) => {
          const available = category.difficulties.includes(difficulty);
          const best = available ? bestTime(category.slug, difficulty) : undefined;
          return (
            <li key={difficulty}>
              <button
                type="button"
                className={styles.level}
                disabled={!available || pending !== null}
                aria-busy={pending === `${category.slug}:${difficulty}`}
                onClick={() => onPlay(difficulty)}
              >
                <span className={styles.levelName}>{difficultyLabel(difficulty)}</span>
                <span className={styles.levelMeta}>
                  {best !== undefined
                    ? formatDuration(best)
                    : t('difficulty.pairsShort', { pairs: DIFFICULTIES[difficulty].pairs })}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
