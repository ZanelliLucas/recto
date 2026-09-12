import { fileURLToPath } from 'node:url';

const isProduction = process.env.NODE_ENV === 'production';

export const config = {
  /**
   * En production, un seul processus sert l'interface et l'API sur PORT. En
   * développement, PORT appartient au serveur Vite : l'API écoute sur API_PORT.
   */
  port: Number(process.env.API_PORT ?? (isProduction ? process.env.PORT : undefined) ?? 4747),
  isProduction,
  /** Contenu intégré en dur au lot 1 ; le lot 2 le déplace en base et en stockage objet. */
  contentDir: fileURLToPath(new URL('../content/', import.meta.url)),
  /** Build de l'interface, servi par le même processus quand il existe. */
  webDistDir: fileURLToPath(new URL('../../web/dist/', import.meta.url)),
  /** Les parties plus anciennes sont purgées du magasin en mémoire. */
  gameRetentionMs: 6 * 60 * 60 * 1000,
};
