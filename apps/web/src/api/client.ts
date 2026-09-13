import type {
  AdminCategoryDetail,
  AdminCategorySummary,
  AdminImage,
  ApiErrorBody,
  AudienceSummary,
  CategoryInput,
  CategoryPatch,
  CategorySummary,
  CreateGameRequest,
  CreateGameResponse,
  CreditsCategory,
  FinishGameRequest,
  FinishGameResponse,
  GuestImportSummary,
  ImageMetadataInput,
  LoginRequest,
  PlayerStats,
  ProfilePatch,
  PublicUser,
  RegisterRequest,
  StartGameResponse,
} from '@recto/shared';
import { t } from '../i18n';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  /** Objet envoyé en JSON, ou formulaire multipart. */
  body?: unknown;
}

async function request<T>(path: string, { method, body }: RequestOptions = {}): Promise<T> {
  const isForm = body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: method ?? (body === undefined ? 'GET' : 'POST'),
      headers: body === undefined || isForm ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError(0, 'reseau', t('error.network'));
  }
  if (response.status === 204) return undefined as T;
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (data as ApiErrorBody | null)?.error;
    throw new ApiError(response.status, error?.code ?? 'inconnue', error?.message ?? t('error.network'), error?.details);
  }
  return data as T;
}

const game = (id: string, action: string) => `/games/${encodeURIComponent(id)}/${action}`;

export const api = {
  categories: () => request<CategorySummary[]>('/categories'),
  credits: () => request<CreditsCategory[]>('/credits'),
  createGame: (body: CreateGameRequest) => request<CreateGameResponse>('/games', { body }),
  startGame: (id: string, token: string) => request<StartGameResponse>(game(id, 'start'), { body: { token } }),
  pauseGame: (id: string, token: string) => request<void>(game(id, 'pause'), { body: { token } }),
  resumeGame: (id: string, token: string) => request<void>(game(id, 'resume'), { body: { token } }),
  abandonGame: (id: string, token: string) => request<void>(game(id, 'abandon'), { body: { token } }),
  finishGame: (id: string, body: FinishGameRequest) => request<FinishGameResponse>(game(id, 'finish'), { body }),
};

export const authApi = {
  me: () => request<{ user: PublicUser | null }>('/auth/me'),
  register: (body: RegisterRequest) => request<PublicUser>('/auth/register', { body }),
  login: (body: LoginRequest) => request<PublicUser>('/auth/login', { body }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  verifyEmail: (token: string) => request<void>('/auth/verify-email', { body: { token } }),
  resendVerification: () => request<void>('/auth/resend-verification', { method: 'POST' }),
  forgotPassword: (email: string) => request<void>('/auth/forgot-password', { body: { email } }),
  resetPassword: (token: string, password: string) => request<void>('/auth/reset-password', { body: { token, password } }),
};

export const meApi = {
  stats: () => request<PlayerStats>('/me/stats'),
  guestImport: () => request<GuestImportSummary>('/me/import-guest'),
  importGuest: () => request<{ imported: number }>('/me/import-guest', { method: 'POST' }),
  updateProfile: (patch: ProfilePatch) => request<PublicUser>('/me', { method: 'PATCH', body: patch }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>('/me/password', { body: { currentPassword, newPassword } }),
  deleteAccount: (password: string) => request<void>('/me/delete', { body: { password } }),
  /** Téléchargement direct : le serveur répond en pièce jointe. */
  exportUrl: '/api/me/export',
};

export const adminApi = {
  session: () => request<{ authenticated: boolean; admin: boolean }>('/admin/session'),
  audience: () => request<AudienceSummary>('/admin/audience'),
  categories: () => request<AdminCategorySummary[]>('/admin/categories'),
  category: (id: string) => request<AdminCategoryDetail>(`/admin/categories/${encodeURIComponent(id)}`),
  createCategory: (input: CategoryInput) => request<AdminCategoryDetail>('/admin/categories', { body: input }),
  updateCategory: (id: string, patch: CategoryPatch) =>
    request<AdminCategoryDetail>(`/admin/categories/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch }),
  uploadImage: (categoryId: string, form: FormData) =>
    request<AdminImage>(`/admin/categories/${encodeURIComponent(categoryId)}/images`, { body: form }),
  updateImage: (id: string, patch: Partial<ImageMetadataInput>) =>
    request<AdminImage>(`/admin/images/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch }),
  deleteImage: (id: string) => request<void>(`/admin/images/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
