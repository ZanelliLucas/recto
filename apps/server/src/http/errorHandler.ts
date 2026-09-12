import type { ApiErrorBody } from '@recto/shared';
import type { ErrorRequestHandler } from 'express';
import { HttpError } from './httpError';

const body = (code: string, message: string): ApiErrorBody => ({ error: { code, message } });

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json(body(err.code, err.message));
    return;
  }
  // Erreurs levées par les middlewares Express (corps illisible, trop volumineux…).
  const status = clientErrorStatus(err);
  if (status !== null) {
    res.status(status).json(body('requete_invalide', 'Requête invalide.'));
    return;
  }
  console.error(err);
  res.status(500).json(body('erreur_interne', 'Erreur interne du serveur.'));
};

function clientErrorStatus(err: unknown): number | null {
  if (typeof err !== 'object' || err === null || !('status' in err)) return null;
  const { status } = err;
  return typeof status === 'number' && status >= 400 && status < 500 ? status : null;
}
