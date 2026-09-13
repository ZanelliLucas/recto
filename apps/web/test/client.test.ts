import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, isTransient } from '../src/api/client';

const result = { durationMs: 30_000, moves: 8, pairs: 8, accuracy: 1, record: null };
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('clôture de partie sur réseau instable', () => {
  it('retente après une coupure réseau puis rend le résultat', async () => {
    vi.useFakeTimers();
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(json(503, { error: { code: 'indisponible', message: 'Indisponible' } }))
      .mockResolvedValueOnce(json(200, result));
    vi.stubGlobal('fetch', fetch);

    const pending = api.finishGame('partie', { token: 'secret', moves: [] });
    await vi.advanceTimersByTimeAsync(4_000);
    await expect(pending).resolves.toEqual(result);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('ne retente jamais un refus du serveur', async () => {
    const fetch = vi.fn().mockResolvedValue(json(422, { error: { code: 'coups_invalides', message: 'Coups invalides.' } }));
    vi.stubGlobal('fetch', fetch);

    await expect(api.finishGame('partie', { token: 'secret', moves: [] })).rejects.toMatchObject({ status: 422 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('abandonne après trois tentatives, avec une erreur passagère', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetch);

    const pending = api.finishGame('partie', { token: 'secret', moves: [] });
    const outcome = expect(pending).rejects.toSatisfy(isTransient);
    await vi.advanceTimersByTimeAsync(4_000);
    await outcome;
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('distingue erreurs passagères et refus', () => {
    expect(isTransient(new ApiError(0, 'reseau', 'Hors ligne'))).toBe(true);
    expect(isTransient(new ApiError(502, 'passerelle', 'Panne'))).toBe(true);
    expect(isTransient(new ApiError(409, 'etat_incompatible', 'Close'))).toBe(false);
    expect(isTransient(new Error('autre'))).toBe(false);
  });
});
