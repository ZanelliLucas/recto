import type {
  ApiErrorBody,
  CategorySummary,
  CreateGameRequest,
  CreateGameResponse,
  FinishGameRequest,
  FinishGameResponse,
  StartGameResponse,
} from '@recto/shared';
import { t } from '../i18n';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError(0, 'reseau', t('error.network'));
  }
  if (response.status === 204) return undefined as T;
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (data as ApiErrorBody | null)?.error;
    throw new ApiError(response.status, error?.code ?? 'inconnue', error?.message ?? t('error.network'));
  }
  return data as T;
}

const game = (id: string, action: string) => `/games/${encodeURIComponent(id)}/${action}`;

export const api = {
  categories: () => request<CategorySummary[]>('/categories'),
  createGame: (body: CreateGameRequest) => request<CreateGameResponse>('/games', body),
  startGame: (id: string, token: string) => request<StartGameResponse>(game(id, 'start'), { token }),
  pauseGame: (id: string, token: string) => request<void>(game(id, 'pause'), { token }),
  resumeGame: (id: string, token: string) => request<void>(game(id, 'resume'), { token }),
  abandonGame: (id: string, token: string) => request<void>(game(id, 'abandon'), { token }),
  finishGame: (id: string, body: FinishGameRequest) => request<FinishGameResponse>(game(id, 'finish'), body),
};
