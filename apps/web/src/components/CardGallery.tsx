import type { CardImage } from '@recto/shared';
import { t } from '../i18n';
import styles from './CardGallery.module.css';
import { Picture } from './Picture';

/**
 * Cartes et leurs fiches (EF-7.3) : titre menant à l'article de référence, date et lieu,
 * légende. Utilisée après la partie (revue) et sur la page de la catégorie (galerie).
 */
export function CardGallery({ cards }: { cards: readonly CardImage[] }) {
  const sorted = [...cards].sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  return (
    <ul className={styles.cards}>
      {sorted.map((card) => {
        const meta = [card.date, card.place].filter(Boolean).join(' · ');
        return (
          <li key={card.id} className={styles.cardItem}>
            <Picture className={styles.cardImage} sources={card.sources} size={200} alt="" />
            <div className={styles.cardText}>
              <p className={styles.cardTitle}>
                {card.infoUrl ? (
                  <a href={card.infoUrl} target="_blank" rel="noopener noreferrer">
                    {card.title}
                    <span className="visually-hidden"> — {t('result.cardsMore')}</span>
                  </a>
                ) : (
                  card.title
                )}
              </p>
              {meta && <p className={styles.cardMeta}>{meta}</p>}
              {card.caption && <p className={styles.cardCaption}>{card.caption}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
