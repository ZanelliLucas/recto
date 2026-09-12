import type { Difficulty, PlayerStats } from '@recto/shared';
import { useCallback, useEffect, useState } from 'react';
import { meApi } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { getRecord } from './records';

let cache: { userId: string; promise: Promise<PlayerStats> } | null = null;

/** Statistiques du joueur connecté, chargées une fois puis réutilisées par tous les écrans. */
export function loadStats(userId: string): Promise<PlayerStats> {
  if (cache?.userId !== userId) {
    const promise = meApi.stats();
    promise.catch(() => {
      if (cache?.promise === promise) cache = null;
    });
    cache = { userId, promise };
  }
  return cache.promise;
}

/** À appeler après une partie terminée ou un changement de compte. */
export function invalidateStats(): void {
  cache = null;
}

/**
 * Meilleur temps d'un couple catégorie × difficulté : celui du compte (serveur) pour un
 * joueur connecté, celui du navigateur pour un invité.
 */
export function useBestTimes(): (category: string, difficulty: Difficulty) => number | undefined {
  const { user } = useAuth();
  const [server, setServer] = useState<Map<string, number> | null>(null);

  useEffect(() => {
    if (!user) {
      setServer(null);
      return;
    }
    let active = true;
    loadStats(user.id).then(
      (stats) => active && setServer(new Map(stats.records.map((r) => [`${r.category}:${r.difficulty}`, r.bestMs]))),
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [user]);

  return useCallback(
    (category: string, difficulty: Difficulty) =>
      user ? server?.get(`${category}:${difficulty}`) : getRecord(category, difficulty)?.bestMs,
    [user, server],
  );
}
