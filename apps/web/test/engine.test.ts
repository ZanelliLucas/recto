import { describe, expect, it } from 'vitest';
import { engineReducer, initEngine, type EngineAction, type EngineState } from '../src/game/engine';

const deck = ['a', 'b', 'a', 'b'];

const run = (state: EngineState, ...actions: EngineAction[]) => actions.reduce(engineReducer, state);
const playing = () => run(initEngine(deck), { type: 'ready' }, { type: 'go' });
const flip = (index: number): EngineAction => ({ type: 'flip', index });

describe('engineReducer', () => {
  it('ignore les retournements avant la fin du décompte', () => {
    const state = run(initEngine(deck), { type: 'ready' }, flip(0));
    expect(state.phase).toBe('countdown');
    expect(state.faceUp).toEqual([]);
  });

  it('ne compte pas un second clic sur une carte déjà retournée (EF-1.4)', () => {
    const state = run(playing(), flip(0), flip(0));
    expect(state.faceUp).toEqual([0]);
    expect(state.moves).toEqual([]);
  });

  it('verrouille la grille après un appariement incorrect, puis retourne les cartes', () => {
    const missed = run(playing(), flip(0), flip(1));
    expect(missed.locked).toBe(true);
    expect(missed.moves).toEqual([[0, 1]]);
    expect(run(missed, flip(2)).faceUp).toEqual([0, 1]);

    const hidden = engineReducer(missed, { type: 'hideMismatch' });
    expect(hidden.locked).toBe(false);
    expect(hidden.faceUp).toEqual([]);
  });

  it('garde visibles les paires trouvées et ignore les clics dessus', () => {
    const matched = run(playing(), flip(0), flip(2));
    expect(matched.matched).toEqual([true, false, true, false]);
    expect(matched.pairsFound).toBe(1);
    expect(run(matched, flip(0), flip(2)).moves).toHaveLength(1);
  });

  it('passe en clôture quand la dernière paire est trouvée', () => {
    const state = run(playing(), flip(0), flip(2), flip(1), flip(3));
    expect(state.phase).toBe('finishing');
    expect(state.moves).toEqual([
      [0, 2],
      [1, 3],
    ]);
    expect(engineReducer(state, { type: 'finished' }).phase).toBe('finished');
  });

  it('bloque les retournements pendant la pause (EF-1.5)', () => {
    const paused = run(playing(), { type: 'pause' }, flip(0));
    expect(paused.phase).toBe('paused');
    expect(paused.faceUp).toEqual([]);
    expect(run(paused, { type: 'resume' }, flip(0)).faceUp).toEqual([0]);
  });

  it('numérote les événements pour les annonces vocales', () => {
    const state = run(playing(), flip(0), flip(1));
    expect(state.lastEvent).toEqual({ kind: 'miss', cards: [0, 1], seq: 2 });
  });
});
