import { memo } from 'react';
import { t } from '../i18n';
import styles from './Card.module.css';

export type CardVisual = 'hidden' | 'up' | 'found';

interface CardProps {
  index: number;
  visual: CardVisual;
  /** Carte d'un appariement incorrect, pendant le délai de 900 ms. */
  missed: boolean;
  title: string;
  url: string;
  /** Faux tant que le préchargement n'est pas terminé. */
  showImage: boolean;
  /** Tabulation itinérante : une seule carte de la grille est atteignable par Tab. */
  focusable: boolean;
  onFlip: (index: number) => void;
  registerRef: (index: number, element: HTMLButtonElement | null) => void;
}

/**
 * Carte à retournement tridimensionnel (§ 6.1), réalisé en CSS pur. Les faces sont
 * masquées aux technologies d'assistance : le libellé du bouton décrit l'état (ENF-4.2).
 */
export const Card = memo(function Card({
  index,
  visual,
  missed,
  title,
  url,
  showImage,
  focusable,
  onFlip,
  registerRef,
}: CardProps) {
  const n = index + 1;
  const label =
    visual === 'hidden'
      ? t('game.cardHidden', { n })
      : t(visual === 'up' ? 'game.cardUp' : 'game.cardFound', { n, title });

  return (
    <button
      type="button"
      ref={(element) => registerRef(index, element)}
      className={styles.card}
      data-state={visual}
      data-missed={missed || undefined}
      tabIndex={focusable ? 0 : -1}
      aria-label={label}
      aria-disabled={visual === 'found' || undefined}
      onClick={() => onFlip(index)}
    >
      <span className={styles.shell}>
        <span className={styles.inner}>
          <span className={`${styles.face} ${styles.back}`} aria-hidden="true" />
          <span className={`${styles.face} ${styles.front}`} aria-hidden="true">
            {showImage && <img src={url} alt={title} draggable={false} />}
            {visual === 'found' && <span className={styles.check}>✓</span>}
          </span>
        </span>
      </span>
    </button>
  );
});
