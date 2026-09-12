import { ApiError } from '../api/client';
import { t } from '../i18n';

/** Message à afficher pour une erreur d'appel : celui du serveur, sinon un message générique. */
export function errorText(error: unknown): string {
  return error instanceof ApiError ? error.message : t('error.generic');
}
