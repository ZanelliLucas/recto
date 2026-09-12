import { useEffect, useRef } from 'react';
import { formatDuration } from '../lib/format';

interface StopwatchProps {
  /** Temps écoulé en millisecondes, lu à chaque image. */
  read: () => number;
  running: boolean;
}

/**
 * Affichage du chronomètre. Le texte est écrit directement dans le DOM à chaque
 * image, sans repasser par React : la grille n'est jamais re-rendue pour le temps.
 */
export function Stopwatch({ read, running }: StopwatchProps) {
  const output = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const render = () => {
      if (output.current) output.current.textContent = formatDuration(Math.max(0, read()));
    };
    render();
    if (!running) return;
    let frame = requestAnimationFrame(function loop() {
      render();
      frame = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(frame);
  }, [read, running]);

  return (
    <span ref={output} role="timer" aria-live="off">
      {formatDuration(0)}
    </span>
  );
}
