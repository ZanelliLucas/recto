import { IMAGE_SIZES, type ImageSize } from '@recto/shared';
import sharp, { type Sharp } from 'sharp';
import { VECTOR_SUFFIX, variantSuffix, type ImageKind, type RasterFormat } from './sources';

export class ImageRejectedError extends Error {
  override readonly name = 'ImageRejectedError';
}

export interface ProcessedImage {
  kind: ImageKind;
  /** Fichiers à stocker, suffixés au préfixe de l'image. */
  files: { suffix: string; data: Buffer }[];
}

/** Côté minimal de l'original : en deçà, la résolution 400 px serait floue. */
export const MIN_SOURCE_SIZE = 400;

/**
 * Poids visés (EF-3.12, EF-3.13) : moins de 25 Ko en 400 px, pour qu'une partie
 * Difficile précharge ses 30 images en moins de 750 Ko. La qualité baisse par
 * paliers jusqu'à tenir le budget.
 */
const BUDGET: Record<ImageSize, number> = { 200: 10_000, 400: 25_000, 800: 90_000 };
const QUALITIES: Record<RasterFormat, number[]> = { avif: [52, 44, 36, 30], webp: [78, 68, 58, 50] };

const RASTER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/tiff']);

export async function processImage(data: Buffer, mimeType: string): Promise<ProcessedImage> {
  if (mimeType === 'image/svg+xml') return { kind: 'vector', files: [{ suffix: VECTOR_SUFFIX, data: checkSvg(data) }] };
  if (RASTER_TYPES.has(mimeType)) return { kind: 'raster', files: await processRaster(data) };
  throw new ImageRejectedError('Format non pris en charge : JPEG, PNG, WebP, AVIF ou SVG attendu.');
}

/**
 * Au-delà de ce rapport, un recadrage carré jetterait plus de la moitié de l'image : une
 * trompette de 3:1 ne laisserait qu'un morceau de tube. Ces images sont alors intégrées en
 * entier dans le carré (EF-3.10) sur un fond tiré de l'image elle-même.
 */
const LETTERBOX_RATIO = 1.8;

/** EF-3.10 et EF-3.11 — recadrage carré centré sur la zone d'intérêt, trois résolutions. */
async function processRaster(input: Buffer): Promise<ProcessedImage['files']> {
  let width = 0;
  let height = 0;
  let hasAlpha = false;
  try {
    ({ width = 0, height = 0, hasAlpha = false } = await sharp(input).metadata());
  } catch {
    throw new ImageRejectedError('Fichier image illisible.');
  }
  if (Math.min(width, height) < MIN_SOURCE_SIZE) {
    throw new ImageRejectedError(`Image trop petite (${width} × ${height} px) : ${MIN_SOURCE_SIZE} px de côté au minimum.`);
  }

  const elongated = Math.max(width, height) / Math.min(width, height) >= LETTERBOX_RATIO;
  const files: ProcessedImage['files'] = [];
  for (const size of IMAGE_SIZES) {
    const square = elongated ? sharp(await letterbox(input, size, hasAlpha)) : crop(input, size);
    for (const format of ['avif', 'webp'] as const) {
      files.push({ suffix: variantSuffix(size, format), data: await encodeWithinBudget(square, format, BUDGET[size]) });
    }
  }
  return files;
}

const crop = (input: Buffer, size: number) =>
  sharp(input).rotate().resize(size, size, { fit: 'cover', position: sharp.strategy.attention });

/**
 * Sujet entier au centre du carré. Le fond reprend l'image, floutée et assombrie, pour que la
 * carte reste pleine ; une image déjà détourée garde sa transparence et le fond de la carte.
 */
async function letterbox(input: Buffer, size: number, hasAlpha: boolean): Promise<Buffer> {
  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
  if (hasAlpha) {
    return sharp(input).rotate().resize(size, size, { fit: 'contain', background: transparent }).png().toBuffer();
  }
  const subject = await sharp(input).rotate().resize(size, size, { fit: 'inside' }).png().toBuffer();
  return crop(input, size)
    .blur(size / 24)
    .modulate({ brightness: 0.55 })
    .composite([{ input: subject, gravity: 'centre' }])
    .png()
    .toBuffer();
}

async function encodeWithinBudget(image: Sharp, format: RasterFormat, budget: number): Promise<Buffer> {
  let output = Buffer.alloc(0);
  for (const quality of QUALITIES[format]) {
    const encoder = image.clone();
    output = await (format === 'avif' ? encoder.avif({ quality, effort: 4 }) : encoder.webp({ quality })).toBuffer();
    if (output.length <= budget) break;
  }
  return output;
}

/** Un SVG est servi tel quel : on refuse tout contenu actif et on exige un format carré. */
function checkSvg(data: Buffer): Buffer {
  const text = data.toString('utf8');
  if (!/<svg[\s>]/i.test(text)) throw new ImageRejectedError('Fichier SVG invalide.');
  if (/<script|<foreignObject|<iframe|<!ENTITY|\son[a-z]+\s*=|javascript:/i.test(text)) {
    throw new ImageRejectedError('SVG refusé : scripts et contenus actifs sont interdits.');
  }
  const viewBox = /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*["']/i.exec(text);
  if (!viewBox || Math.abs(Number(viewBox[1]) - Number(viewBox[2])) > 0.5) {
    throw new ImageRejectedError('SVG refusé : un viewBox carré est exigé (EF-3.10).');
  }
  return data;
}
