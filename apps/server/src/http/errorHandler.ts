import type { ApiErrorBody } from '@recto/shared';
import type { ErrorRequestHandler } from 'express';
import { ImageRejectedError } from '../media/pipeline';
import { HttpError } from './httpError';

const body = (code: string, message: string, details?: unknown): ApiErrorBody => ({
  error: details === undefined ? { code, message } : { code, message, details },
});

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json(body(err.code, err.message, err.details));
    return;
  }
  if (err instanceof ImageRejectedError) {
    res.status(422).json(body('image_refusee', err.message));
    return;
  }
  if (err instanceof Error && err.name === 'MulterError') {
    res.status(400).json(body('fichier_invalide', 'Fichier refusé : 10 Mo au plus, un seul fichier.'));
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
