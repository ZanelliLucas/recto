import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';
import styles from './Countdown.module.css';

interface CountdownProps {
  /** Instant (horloge `performance.now()`) où le chronomètre démarre. */
  endsAt: number;
  onDone: () => void;
}

const secondsLeft = (endsAt: number) => Math.max(1, Math.ceil((endsAt - performance.now()) / 1000));

/** Décompte de trois secondes (EF-1, étape 3). La grille reste visible, face cachée. */
export function Countdown({ endsAt, onDone }: CountdownProps) {
  const [seconds, setSeconds] = useState(() => secondsLeft(endsAt));
  const done = useRef(onDone);

  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    let frame = requestAnimationFrame(function tick() {
      if (performance.now() >= endsAt) return;
      setSeconds(secondsLeft(endsAt));
      frame = requestAnimationFrame(tick);
    });
    // requestAnimationFrame est suspendu dans un onglet masqué : le minuteur garantit la fin.
    const timer = window.setTimeout(() => done.current(), Math.max(0, endsAt - performance.now()));
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [endsAt]);

  return (
    <div className={styles.countdown} role="status">
      <span key={seconds} className={styles.number} aria-hidden="true">
        {seconds}
      </span>
      <span className="visually-hidden">{t('game.countdown', { seconds })}</span>
    </div>
  );
}
