/** Un coup : les positions des deux cartes retournées (EF-1.2). */
export type Move = readonly [number, number];

export type ReplayError = 'indice_invalide' | 'meme_carte' | 'carte_deja_trouvee' | 'partie_incomplete';

export type ReplayResult =
  | { readonly ok: true; readonly moves: number; readonly pairsFound: number }
  | { readonly ok: false; readonly reason: ReplayError; readonly moveIndex: number };

const isIndex = (value: number, length: number) => Number.isInteger(value) && value >= 0 && value < length;

/**
 * Rejoue une partie à partir de la liste des coups. Le serveur compte ainsi lui-même
 * les coups au lieu de croire le client, et refuse une partie inachevée ou
 * incohérente (ENF-1.2).
 */
export function replayMoves(deck: readonly string[], moves: readonly Move[]): ReplayResult {
  const matched = new Array<boolean>(deck.length).fill(false);
  let pairsFound = 0;

  for (const [moveIndex, [a, b]] of moves.entries()) {
    if (!isIndex(a, deck.length) || !isIndex(b, deck.length)) return { ok: false, reason: 'indice_invalide', moveIndex };
    if (a === b) return { ok: false, reason: 'meme_carte', moveIndex };
    if (matched[a] || matched[b]) return { ok: false, reason: 'carte_deja_trouvee', moveIndex };
    if (deck[a] === deck[b]) {
      matched[a] = true;
      matched[b] = true;
      pairsFound++;
    }
  }

  if (pairsFound * 2 !== deck.length) return { ok: false, reason: 'partie_incomplete', moveIndex: moves.length };
  return { ok: true, moves: moves.length, pairsFound };
}
