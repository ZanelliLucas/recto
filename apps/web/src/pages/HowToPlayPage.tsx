import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { t, type MessageKey } from '../i18n';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import styles from './HowToPlayPage.module.css';

type MiniCard = 'hidden' | 'up' | 'found' | 'miss';

/** EF-8.2 — quatre écrans au plus. Chaque illustration reprend le dos et la face des vraies cartes. */
const STEPS: readonly { n: 1 | 2 | 3 | 4; cards: readonly MiniCard[] }[] = [
  { n: 1, cards: ['hidden', 'hidden', 'hidden', 'hidden', 'hidden', 'hidden'] },
  { n: 2, cards: ['found', 'hidden', 'miss', 'found', 'miss', 'hidden'] },
  { n: 3, cards: ['hidden', 'hidden', 'hidden', 'hidden', 'hidden', 'hidden'] },
  { n: 4, cards: ['found', 'found', 'found', 'found', 'found', 'found'] },
];

export function HowToPlayPage() {
  useDocumentTitle(t('help.title'));
  const [index, setIndex] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const step = STEPS[index]!;
  const last = index === STEPS.length - 1;

  // Après un changement d'étape, son titre reçoit le focus : les lecteurs d'écran annoncent le nouvel écran.
  useEffect(() => {
    if (moved.current) heading.current?.focus();
  }, [index]);

  const go = (next: number) => {
    moved.current = true;
    setIndex(next);
  };

  return (
    <section className={styles.page} aria-labelledby="help-title">
      <h1 id="help-title" className={styles.title}>
        {t('help.title')}
      </h1>

      <div className={styles.step}>
        <div className={styles.illustration} aria-hidden="true" data-step={step.n}>
          {step.cards.map((card, position) => (
            <span key={position} className={styles.card} data-card={card} />
          ))}
          {step.n === 3 && <span className={styles.count}>3</span>}
        </div>
        <p className={styles.counter}>{t('help.step', { n: step.n, total: STEPS.length })}</p>
        <h2 ref={heading} tabIndex={-1} className={styles.stepTitle}>
          {t(`help.${step.n}.title` as MessageKey)}
        </h2>
        <p className={styles.text}>{t(`help.${step.n}.text` as MessageKey)}</p>
      </div>

      <div className={styles.dots} aria-hidden="true">
        {STEPS.map((item, position) => (
          <span key={item.n} data-active={position === index} />
        ))}
      </div>

      <div className={styles.actions}>
        <button type="button" className="btn btn-ghost" onClick={() => go(index - 1)} disabled={index === 0}>
          {t('help.previous')}
        </button>
        {last ? (
          <Link className="btn btn-primary" to="/categories">
            {t('help.play')}
          </Link>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => go(index + 1)}>
            {t('help.next')}
          </button>
        )}
      </div>
    </section>
  );
}
