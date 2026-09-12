import type { Move } from '@recto/shared';

export type Phase = 'loading' | 'countdown' | 'playing' | 'paused' | 'finishing' | 'finished';

export interface FlipEvent {
  readonly kind: 'reveal' | 'match' | 'miss';
  readonly cards: readonly number[];
  /** Numéro d'ordre : distingue deux événements identiques successifs. */
  readonly seq: number;
}

export interface EngineState {
  readonly deck: readonly string[];
  readonly phase: Phase;
  readonly matched: readonly boolean[];
  /** Cartes retournées et pas encore appariées : zéro, une ou deux. */
  readonly faceUp: readonly number[];
  /** Vrai pendant le délai qui suit un appariement incorrect : les interactions sont neutralisées. */
  readonly locked: boolean;
  readonly moves: readonly Move[];
  readonly pairsFound: number;
  readonly lastEvent: FlipEvent | null;
}

export type EngineAction =
  | { type: 'ready' }
  | { type: 'go' }
  | { type: 'flip'; index: number }
  | { type: 'hideMismatch' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'finished' };

export function initEngine(deck: readonly string[]): EngineState {
  return {
    deck,
    phase: 'loading',
    matched: deck.map(() => false),
    faceUp: [],
    locked: false,
    moves: [],
    pairsFound: 0,
    lastEvent: null,
  };
}

/** Déroulement d'une partie (EF-1), sans effet de bord : les délais sont pilotés par le composant. */
export function engineReducer(state: EngineState, action: EngineAction): EngineState {
  switch (action.type) {
    case 'ready':
      return state.phase === 'loading' ? { ...state, phase: 'countdown' } : state;
    case 'go':
      return state.phase === 'countdown' ? { ...state, phase: 'playing' } : state;
    case 'pause':
      return state.phase === 'playing' ? { ...state, phase: 'paused' } : state;
    case 'resume':
      return state.phase === 'paused' ? { ...state, phase: 'playing' } : state;
    case 'finished':
      return state.phase === 'finishing' ? { ...state, phase: 'finished' } : state;
    case 'hideMismatch':
      return state.locked ? { ...state, faceUp: [], locked: false } : state;
    case 'flip':
      return flip(state, action.index);
  }
}

function flip(state: EngineState, index: number): EngineState {
  if (state.phase !== 'playing' || state.locked) return state;
  if (!Number.isInteger(index) || index < 0 || index >= state.deck.length) return state;
  // EF-1.4 — une carte déjà visible ne réagit pas et le clic n'est pas compté.
  if (state.matched[index] || state.faceUp.includes(index)) return state;

  const seq = (state.lastEvent?.seq ?? 0) + 1;
  const [first] = state.faceUp;
  if (first === undefined) {
    return { ...state, faceUp: [index], lastEvent: { kind: 'reveal', cards: [index], seq } };
  }

  const move: Move = [first, index];
  const moves = [...state.moves, move];

  if (state.deck[first] !== state.deck[index]) {
    return { ...state, faceUp: [first, index], locked: true, moves, lastEvent: { kind: 'miss', cards: move, seq } };
  }

  const matched = state.matched.slice();
  matched[first] = true;
  matched[index] = true;
  const pairsFound = state.pairsFound + 1;
  return {
    ...state,
    matched,
    faceUp: [],
    moves,
    pairsFound,
    phase: pairsFound * 2 === state.deck.length ? 'finishing' : 'playing',
    lastEvent: { kind: 'match', cards: move, seq },
  };
}
