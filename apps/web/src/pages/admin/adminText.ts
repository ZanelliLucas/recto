import type { PublicationIssue } from '@recto/shared';
import { ApiError } from '../../api/client';

export function issueText(issue: PublicationIssue): string {
  return issue.code === 'images_insuffisantes'
    ? `${issue.actual} images sur ${issue.required} requises`
    : `${issue.actual} groupes visuels, ${issue.required} requis`;
}

export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Erreur inattendue.';
  if (error.status === 401) return 'Session expirée : rechargez la page pour vous reconnecter.';
  if (Array.isArray(error.details) && error.details.length > 0) {
    return `${error.message} ${(error.details as PublicationIssue[]).map(issueText).join(' ; ')}.`;
  }
  return error.message;
}

/** « Œuvres d'art » → « oeuvres-d-art » : identifiant d'adresse proposé à partir du nom. */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/gi, 'oe')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
