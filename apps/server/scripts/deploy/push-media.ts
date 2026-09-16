/**
 * Envoie les images traitées vers le magasin objet de l'hébergement sans serveur. Relançable :
 * les fichiers déjà déposés sont sautés, ce qui permet de reprendre un envoi interrompu.
 *
 * Usage : BLOB_READ_WRITE_TOKEN=… npm run deploy:media
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../../src/config';
import { BlobMediaStorage } from '../../src/media/blobStorage';

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN manquant : jeton du magasin Blob du projet Vercel.');
  process.exit(1);
}

async function keys(dir: string, prefix = ''): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const found: string[] = [];
  for (const entry of entries) {
    const key = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) found.push(...(await keys(path.join(dir, entry.name), key)));
    else found.push(key);
  }
  return found;
}

const storage = await BlobMediaStorage.open();
const all = await keys(config.mediaDir);
console.log(`${all.length} fichier(s) dans ${config.mediaDir}.`);

let sent = 0;
let skipped = 0;
let bytes = 0;
const failures: string[] = [];

for (const key of all) {
  try {
    if (await storage.has(key)) {
      skipped++;
      continue;
    }
    const file = path.join(config.mediaDir, ...key.split('/'));
    await storage.put(key, await readFile(file));
    bytes += (await stat(file)).size;
    sent++;
    if (sent % 50 === 0) process.stdout.write(`\r${sent} envoyé(s), ${skipped} déjà présent(s)…`);
  } catch (error) {
    failures.push(`${key} — ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log(`\n${sent} envoyé(s) (${(bytes / 1e6).toFixed(1)} Mo), ${skipped} déjà présent(s), ${failures.length} en échec.`);
for (const failure of failures.slice(0, 20)) console.log(`  ✗ ${failure}`);
