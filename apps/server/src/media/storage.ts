import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** Stockage des fichiers d'images. L'implémentation locale cédera la place à un stockage objet (§ 5.1). */
export interface MediaStorage {
  put(key: string, data: Buffer): Promise<void>;
  read(key: string): Promise<Buffer>;
  remove(keys: readonly string[]): Promise<void>;
  url(key: string): string;
}

const KEY = /^[a-z0-9][a-z0-9_.-]*(\/[a-z0-9][a-z0-9_.-]*)*$/i;

export class LocalMediaStorage implements MediaStorage {
  constructor(
    readonly root: string,
    private readonly publicPath = '/media',
  ) {}

  async put(key: string, data: Buffer): Promise<void> {
    const file = this.resolve(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data);
  }

  read(key: string): Promise<Buffer> {
    return readFile(this.resolve(key));
  }

  async remove(keys: readonly string[]): Promise<void> {
    await Promise.all(keys.map((key) => rm(this.resolve(key), { force: true })));
  }

  url(key: string): string {
    return `${this.publicPath}/${key}`;
  }

  private resolve(key: string): string {
    if (!KEY.test(key) || key.includes('..')) throw new Error(`Clé de média invalide : ${key}`);
    return path.join(this.root, ...key.split('/'));
  }
}
