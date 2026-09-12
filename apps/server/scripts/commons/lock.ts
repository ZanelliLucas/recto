import path from 'node:path';
import { config } from '../../src/config';

/**
 * Liste verrouillée : pour chaque sujet, le fichier Commons retenu et ses droits,
 * relevés par `resolve` et validés avant tout téléchargement par `import`.
 */
export interface LockItem {
  article: string;
  title: string;
  visualGroup: string | null;
  status: 'ok' | 'rejete';
  reason?: string;
  wikidata?: string;
  file?: string;
  /** Page Commons du fichier : la source créditée. */
  sourceUrl?: string;
  /** Vignette de 1280 px téléchargée à l'import. */
  downloadUrl?: string;
  width?: number;
  height?: number;
  author?: string;
  licence?: string;
  licenceUrl?: string | null;
  /** Description Wikidata, reprise comme légende pédagogique (EF-7.3). */
  caption?: string | null;
}

export interface LockFile {
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  resolvedAt: string;
  items: LockItem[];
}

export const lockDir = path.join(config.contentDir, 'commons');
export const lockPath = (slug: string) => path.join(lockDir, `${slug}.lock.json`);
