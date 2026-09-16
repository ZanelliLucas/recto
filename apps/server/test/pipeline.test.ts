import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { ImageRejectedError, processImage } from '../src/media/pipeline';

/** Photographie de synthèse : dégradé et formes, pour que l'encodeur ait du détail à compresser. */
export async function sampleJpeg(width = 1200, height = 800): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><linearGradient id="g"><stop offset="0" stop-color="#1d4e89"/><stop offset="1" stop-color="#f2a541"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    ${Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 97) % width}" cy="${(i * 53) % height}" r="${20 + (i % 7) * 9}" fill="hsl(${i * 37} 70% 50%)"/>`).join('')}
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}

describe('processImage', () => {
  it('produit trois résolutions carrées en AVIF et WebP, dans le budget de poids (EF-3.10 à EF-3.12)', async () => {
    const processed = await processImage(await sampleJpeg(), 'image/jpeg');
    expect(processed.kind).toBe('raster');
    expect(processed.files.map((file) => file.suffix).sort()).toEqual(
      ['-200.avif', '-200.webp', '-400.avif', '-400.webp', '-800.avif', '-800.webp'].sort(),
    );
    for (const file of processed.files) {
      const size = Number(/-(\d+)\./.exec(file.suffix)![1]);
      const { width, height } = await sharp(file.data).metadata();
      expect([width, height]).toEqual([size, size]);
    }
    const avif400 = processed.files.find((file) => file.suffix === '-400.avif')!;
    expect(avif400.data.length).toBeLessThanOrEqual(25_000);
  }, 20_000);

  it('intègre une image très allongée en entier au lieu de la recadrer (EF-3.10)', async () => {
    const processed = await processImage(await sampleJpeg(2400, 600), 'image/jpeg');
    const webp400 = processed.files.find((file) => file.suffix === '-400.webp')!;
    const square = sharp(webp400.data);
    expect((await square.metadata()).width).toBe(400);

    // Le sujet occupe une bande centrale de 100 px ; au-dessus, le fond flouté est plus sombre.
    const { data, info } = await square.raw().toBuffer({ resolveWithObject: true });
    const luminance = (x: number, y: number) => {
      const at = (y * info.width + x) * info.channels;
      return (data[at]! + data[at + 1]! + data[at + 2]!) / 3;
    };
    let darker = 0;
    for (let x = 20; x < 380; x += 20) if (luminance(x, 30) < luminance(x, 200)) darker += 1;
    expect(darker).toBeGreaterThan(12);
  }, 20_000);

  it("garde la transparence d'une image détourée allongée", async () => {
    const wide = await sharp({
      create: { width: 2000, height: 500, channels: 4, background: { r: 200, g: 40, b: 40, alpha: 1 } },
    })
      .png()
      .toBuffer();
    const processed = await processImage(wide, 'image/png');
    const webp200 = processed.files.find((file) => file.suffix === '-200.webp')!;
    const { data, info } = await sharp(webp200.data).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(data[(10 * info.width + 100) * info.channels + 3]).toBe(0);
  }, 20_000);

  it('refuse une image trop petite', async () => {
    await expect(processImage(await sampleJpeg(300, 300), 'image/jpeg')).rejects.toBeInstanceOf(ImageRejectedError);
  });

  it('refuse un format inconnu et un fichier illisible', async () => {
    await expect(processImage(Buffer.from('bonjour'), 'text/plain')).rejects.toThrow(/Format non pris en charge/);
    await expect(processImage(Buffer.from('pas une image'), 'image/png')).rejects.toThrow(/illisible/);
  });

  it('accepte un SVG carré et refuse contenus actifs ou formats non carrés', async () => {
    const square = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect width="300" height="300"/></svg>');
    expect((await processImage(square, 'image/svg+xml')).kind).toBe('vector');

    const scripted = Buffer.from('<svg viewBox="0 0 10 10"><script>alert(1)</script></svg>');
    await expect(processImage(scripted, 'image/svg+xml')).rejects.toThrow(/contenus actifs/);
    const handler = Buffer.from('<svg viewBox="0 0 10 10"><rect onload="alert(1)"/></svg>');
    await expect(processImage(handler, 'image/svg+xml')).rejects.toThrow(/contenus actifs/);
    const wide = Buffer.from('<svg viewBox="0 0 300 200"></svg>');
    await expect(processImage(wide, 'image/svg+xml')).rejects.toThrow(/carré/);
  });
});
