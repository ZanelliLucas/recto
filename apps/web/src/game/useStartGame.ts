import type { Difficulty } from '@recto/shared';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { ApiError, api } from '../api/client';
import { t } from '../i18n';
import type { GameLocationState } from './navigation';
import { setLastPlayed } from './records';

/** Ouvre une partie et y conduit le joueur en un seul geste (CA-01, parcours § 3.3). */
export function useStartGame() {
  const navigate = useNavigate();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(
    async (category: string, categoryName: string, difficulty: Difficulty) => {
      setPending(`${category}:${difficulty}`);
      setError(null);
      try {
        const game = await api.createGame({ category, difficulty });
        setLastPlayed({ category, categoryName, difficulty });
        navigate(`/partie/${game.gameId}`, { state: { game, categoryName } satisfies GameLocationState });
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : t('error.network'));
        setPending(null);
      }
    },
    [navigate],
  );

  return { start, pending, error };
}
