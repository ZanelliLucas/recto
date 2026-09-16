import { del, head, list, put } from '@vercel/blob';
import type { MediaStorage } from './storage';

const KEY = /^[a-z0-9][a-z0-9_.-]*(\/[a-z0-9][a-z0-9_.-]*)*$/i;

/**
 * Stockage objet (§ 5.1) pour un hébergement sans disque persistant : les images vivent dans
 * un magasin Vercel Blob et sont servies depuis son domaine, sans passer par le serveur.
 *
 * Le préfixe public est relevé une fois au démarrage : Blob préfixe chaque magasin d'un
 * identifiant, que l'adresse publique doit reprendre telle quelle.
 */
export class BlobMediaStorage implements MediaStorage {
  constructor(
    private readonly baseUrl: string,
    private readonly token = process.env.BLOB_READ_WRITE_TOKEN,
  ) {}

  /** Retrouve le domaine du magasin à partir d'un fichier déjà déposé, ou en en déposant un. */
  static async open(token = process.env.BLOB_READ_WRITE_TOKEN): Promise<BlobMediaStorage> {
    const existing = await list({ token, limit: 1 });
    const known = existing.blobs[0]?.url;
    if (known) return new BlobMediaStorage(new URL(known).origin, token);
    const probe = await put('media/.probe', 'recto', { access: 'public', token, addRandomSuffix: false });
    return new BlobMediaStorage(new URL(probe.url).origin, token);
  }

  async put(key: string, data: Buffer): Promise<void> {
    await put(this.path(key), data, {
      access: 'public',
      token: this.token,
      addRandomSuffix: false,
      // Les images portent un nom unique : elles sont immuables et mises en cache longtemps.
      cacheControlMaxAge: 31_536_000,
    });
  }

  async read(key: string): Promise<Buffer> {
    const response = await fetch(this.url(key));
    if (!response.ok) throw new Error(`Média introuvable : ${key}`);
    return Buffer.from(await response.arrayBuffer());
  }

  async remove(keys: readonly string[]): Promise<void> {
    if (keys.length === 0) return;
    await del(
      keys.map((key) => this.url(key)),
      { token: this.token },
    );
  }

  url(key: string): string {
    return `${this.baseUrl}/${this.path(key)}`;
  }

  /** Vrai si la clé est déjà déposée : l'envoi initial peut alors la sauter. */
  async has(key: string): Promise<boolean> {
    try {
      await head(this.url(key), { token: this.token });
      return true;
    } catch {
      return false;
    }
  }

  private path(key: string): string {
    if (!KEY.test(key) || key.includes('..')) throw new Error(`Clé de média invalide : ${key}`);
    return `media/${key}`;
  }
}
