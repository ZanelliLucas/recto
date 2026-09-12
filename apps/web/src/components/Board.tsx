import { DIFFICULTIES, type Difficulty } from '@recto/shared';
import { useCallback, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { EngineState } from '../game/engine';
import { NARROW_LAYOUT, columnCount, nextFocus } from '../game/layout';
import { t } from '../i18n';
import { Card, type CardVisual } from './Card';
import styles from './Board.module.css';

/** Face d'une carte : titre et adresse de l'image dans le format et la résolution retenus. */
export interface CardFace {
  title: string;
  url: string;
}

interface BoardProps {
  engine: EngineState;
  faces: ReadonlyMap<string, CardFace>;
  difficulty: Difficulty;
  showImages: boolean;
  onFlip: (index: number) => void;
}

export function Board({ engine, faces, difficulty, showImages, onFlip }: BoardProps) {
  const [focus, setFocus] = useState(0);
  const grid = useRef<HTMLDivElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const registerRef = useCallback((index: number, element: HTMLButtonElement | null) => {
    buttons.current[index] = element;
  }, []);

  const flip = useCallback(
    (index: number) => {
      setFocus(index);
      onFlip(index);
    },
    [onFlip],
  );

  // ENF-4.1 — parcours de la grille aux touches directionnelles.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = nextFocus(event.key, focus, engine.deck.length, columnCount(grid.current));
    if (next === null) return;
    event.preventDefault();
    setFocus(next);
    buttons.current[next]?.focus();
  };

  const missed = engine.locked && engine.lastEvent?.kind === 'miss' ? engine.lastEvent.cards : [];
  const wide = DIFFICULTIES[difficulty];
  const narrow = NARROW_LAYOUT[difficulty];
  const layout = {
    '--cols-wide': wide.cols,
    '--rows-wide': wide.rows,
    '--cols-narrow': narrow.cols,
    '--rows-narrow': narrow.rows,
  } as CSSProperties;

  const visualOf = (index: number): CardVisual =>
    engine.matched[index] ? 'found' : engine.faceUp.includes(index) ? 'up' : 'hidden';

  return (
    <div
      ref={grid}
      role="group"
      aria-label={t('game.board', { count: engine.deck.length })}
      className={styles.board}
      style={layout}
      onKeyDown={onKeyDown}
    >
      {engine.deck.map((imageId, index) => {
        const image = faces.get(imageId);
        return (
          <Card
            key={index}
            index={index}
            visual={visualOf(index)}
            missed={missed.includes(index)}
            title={image?.title ?? ''}
            url={image?.url ?? ''}
            showImage={showImages}
            focusable={index === focus}
            onFlip={flip}
            registerRef={registerRef}
          />
        );
      })}
    </div>
  );
}
