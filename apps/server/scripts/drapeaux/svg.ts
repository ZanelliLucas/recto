/** Tracés vectoriels des drapeaux, dans un repère 300 × 200 (proportions normalisées en 3:2). */
export const W = 300;
export const H = 200;

export type Point = readonly [number, number];

const n = (value: number) => String(Math.round(value * 100) / 100);

export const rect = (x: number, y: number, w: number, h: number, fill: string) =>
  `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${fill}"/>`;

export const circle = (cx: number, cy: number, r: number, fill: string) =>
  `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${fill}"/>`;

const pointList = (points: readonly Point[]) => points.map(([x, y]) => `${n(x)},${n(y)}`).join(' ');

export const polygon = (points: readonly Point[], fill: string) => `<polygon points="${pointList(points)}" fill="${fill}"/>`;

export const outline = (points: readonly Point[], stroke: string, width: number) =>
  `<polygon points="${pointList(points)}" fill="none" stroke="${stroke}" stroke-width="${n(width)}" stroke-linejoin="miter"/>`;

export const line = (x1: number, y1: number, x2: number, y2: number, stroke: string, width: number) =>
  `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${stroke}" stroke-width="${n(width)}" stroke-linecap="square"/>`;

/** Bandes horizontales. Chaque bande mord d'un demi-pixel sur la suivante pour éviter les liserés d'anticrénelage. */
export function hStripes(colors: readonly string[], weights: readonly number[] = colors.map(() => 1)): string {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let y = 0;
  return colors
    .map((color, i) => {
      const height = (H * weights[i]!) / total;
      const out = rect(0, y, W, i === colors.length - 1 ? height : height + 0.5, color);
      y += height;
      return out;
    })
    .join('');
}

export function vStripes(colors: readonly string[], weights: readonly number[] = colors.map(() => 1)): string {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let x = 0;
  return colors
    .map((color, i) => {
      const width = (W * weights[i]!) / total;
      const out = rect(x, 0, i === colors.length - 1 ? width : width + 0.5, H, color);
      x += width;
      return out;
    })
    .join('');
}

/** Sommets d'un polygone régulier, le premier pointant vers le haut puis tourné de `rotate` degrés. */
export function regularPolygon(cx: number, cy: number, r: number, sides: number, rotate = 0): Point[] {
  return Array.from({ length: sides }, (_, i) => {
    const angle = ((-90 + rotate + (360 * i) / sides) * Math.PI) / 180;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const;
  });
}

interface StarOptions {
  points?: number;
  /** Rapport entre rayon intérieur et rayon extérieur ; 0,382 donne l'étoile à cinq branches régulière. */
  inner?: number;
  rotate?: number;
}

export function star(cx: number, cy: number, r: number, fill: string, options: StarOptions = {}): string {
  const { points = 5, inner = 0.382, rotate = 0 } = options;
  const vertices = Array.from({ length: points * 2 }, (_, i) => {
    const radius = i % 2 === 0 ? r : r * inner;
    const angle = ((-90 + rotate + (180 * i) / points) * Math.PI) / 180;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)] as const;
  });
  return polygon(vertices, fill);
}

/** Pentagramme ajouré, tracé d'un seul trait. */
export function pentagram(cx: number, cy: number, r: number, stroke: string, width: number): string {
  const p = regularPolygon(cx, cy, r, 5);
  return outline([p[0]!, p[2]!, p[4]!, p[1]!, p[3]!], stroke, width);
}

/**
 * Croissant ouvert vers la droite : disque (cx, cy, R) privé du disque de rayon r
 * décalé de d vers la droite. `rotate` oriente l'ouverture.
 */
export function crescent(cx: number, cy: number, R: number, r: number, d: number, fill: string, rotate = 0): string {
  const x = (d * d + R * R - r * r) / (2 * d);
  const y = Math.sqrt(R * R - x * x);
  const top = `${n(cx + x)} ${n(cy - y)}`;
  const bottom = `${n(cx + x)} ${n(cy + y)}`;
  const outerLarge = x > 0 ? 1 : 0;
  const innerLarge = x - d > 0 ? 1 : 0;
  const transform = rotate ? ` transform="rotate(${n(rotate)} ${n(cx)} ${n(cy)})"` : '';
  return `<path d="M${top} A${n(R)} ${n(R)} 0 ${outerLarge} 0 ${bottom} A${n(r)} ${n(r)} 0 ${innerLarge} 1 ${top} Z" fill="${fill}"${transform}/>`;
}

/** Croix scandinave, éventuellement bordée (`inner` : couleur de la croix intérieure). */
export function nordicCross(background: string, cross: string, inner?: string, width = 40): string {
  const x = 90;
  let out = rect(0, 0, W, H, background) + rect(x, 0, width, H, cross) + rect(0, H / 2 - width / 2, W, width, cross);
  if (inner) {
    const innerWidth = width / 2;
    out += rect(x + (width - innerWidth) / 2, 0, innerWidth, H, inner) + rect(0, H / 2 - innerWidth / 2, W, innerWidth, inner);
  }
  return out;
}

/**
 * Carte carrée (EF-3.10) : le drapeau est centré, son cadre fin garde lisibles les
 * drapeaux à fond blanc. Le SVG imbriqué rogne tout tracé qui déborderait.
 */
export function squareCard(inner: string, square = false): string {
  const w = square ? H : W;
  const x = (W - w) / 2;
  const y = (W - H) / 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${W}">` +
    `<svg x="${n(x)}" y="${n(y)}" width="${w}" height="${H}" viewBox="0 0 ${w} ${H}">` +
    inner +
    `<rect x="0.75" y="0.75" width="${w - 1.5}" height="${H - 1.5}" fill="none" stroke="#000" stroke-opacity="0.18" stroke-width="1.5"/>` +
    `</svg></svg>\n`
  );
}
