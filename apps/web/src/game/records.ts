import { comparePerformances, isDifficulty, type Difficulty, type FinishGameResponse } from '@recto/shared';
import { readJson, writeJson } from '../lib/storage';

/**
 * Record d'un couple catégorie × difficulté en mode invité (EF-4, EF-5). Cette forme
 * sera reprise telle quelle par l'import des résultats à l'inscription (EF-4.4, lot 3).
 */
export interface LocalRecord {
  /** Meilleur temps, en millisecondes. */
  bestMs: number;
  /** Coups de la partie qui détient le meilleur temps (départage, EF-1.1). */
  recordMoves: number;
  bestMoves: number;
  bestAccuracy: number;
  gamesFinished: number;
  totalMs: number;
  /** Date d'obtention du record, ISO 8601. */
  bestAt: string;
}

export interface LastPlayed {
  category: string;
  categoryName: string;
  difficulty: Difficulty;
}

const RECORDS_KEY = 'recto.records.v1';
const LAST_PLAYED_KEY = 'recto.last.v1';

const recordKey = (category: string, difficulty: Difficulty) => `${category}:${difficulty}`;

function readRecords(): Record<string, LocalRecord> {
  const records = readJson<unknown>(RECORDS_KEY, {});
  return typeof records === 'object' && records !== null ? (records as Record<string, LocalRecord>) : {};
}

export function getRecord(category: string, difficulty: Difficulty): LocalRecord | undefined {
  return readRecords()[recordKey(category, difficulty)];
}

export interface SavedResult {
  /** Record détenu avant cette partie, pour l'écart affiché (EF-5.1). */
  previous: LocalRecord | undefined;
  improved: boolean;
}

export function saveResult(category: string, difficulty: Difficulty, result: FinishGameResponse): SavedResult {
  const records = readRecords();
  const key = recordKey(category, difficulty);
  const previous = records[key];
  const improved =
    !previous || comparePerformances(result, { durationMs: previous.bestMs, moves: previous.recordMoves }) < 0;

  records[key] = {
    bestMs: improved ? result.durationMs : previous.bestMs,
    recordMoves: improved ? result.moves : previous.recordMoves,
    bestMoves: Math.min(result.moves, previous?.bestMoves ?? Infinity),
    bestAccuracy: Math.max(result.accuracy, previous?.bestAccuracy ?? 0),
    gamesFinished: (previous?.gamesFinished ?? 0) + 1,
    totalMs: (previous?.totalMs ?? 0) + result.durationMs,
    bestAt: improved ? new Date().toISOString() : previous.bestAt,
  };
  writeJson(RECORDS_KEY, records);
  return { previous, improved };
}

export function getLastPlayed(): LastPlayed | undefined {
  const last = readJson<Partial<LastPlayed> | null>(LAST_PLAYED_KEY, null);
  if (!last || typeof last.category !== 'string' || typeof last.categoryName !== 'string') return undefined;
  if (!isDifficulty(last.difficulty)) return undefined;
  return { category: last.category, categoryName: last.categoryName, difficulty: last.difficulty };
}

export function setLastPlayed(last: LastPlayed): void {
  writeJson(LAST_PLAYED_KEY, last);
}
