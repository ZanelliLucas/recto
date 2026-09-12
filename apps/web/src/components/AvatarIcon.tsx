import type { Avatar } from '@recto/shared';
import type { ReactNode } from 'react';

/** Teintes froides, en accord avec la direction artistique (§ 6.1). */
const HUES: Record<Avatar, number> = {
  orbite: 195,
  prisme: 265,
  onde: 175,
  spirale: 215,
  damier: 185,
  eclat: 245,
  lune: 225,
  delta: 170,
  cible: 205,
  vague: 190,
  hexagone: 255,
  noeud: 235,
};

const SHAPES: Record<Avatar, (color: string) => ReactNode> = {
  orbite: (c) => (
    <>
      <circle cx="24" cy="24" r="10" />
      <circle cx="35" cy="13" r="3.5" fill={c} stroke="none" />
    </>
  ),
  prisme: () => <path d="M24 11 L37 35 H11 Z" />,
  onde: () => (
    <>
      <path d="M9 19 q7.5 -8 15 0 t15 0" />
      <path d="M9 30 q7.5 -8 15 0 t15 0" />
    </>
  ),
  spirale: () => <path d="M24 24 m2 0 a2 2 0 1 1 -4 0 a5 5 0 0 1 10 0 a8 8 0 0 1 -16 0 a11 11 0 0 1 22 0" />,
  damier: (c) => (
    <>
      <rect x="12" y="12" width="24" height="24" rx="3" />
      <rect x="12" y="12" width="12" height="12" fill={c} stroke="none" />
      <rect x="24" y="24" width="12" height="12" fill={c} stroke="none" />
    </>
  ),
  eclat: () => <path d="M24 9 V16 M24 32 V39 M9 24 H16 M32 24 H39 M13.5 13.5 L18.5 18.5 M29.5 29.5 L34.5 34.5 M34.5 13.5 L29.5 18.5 M18.5 29.5 L13.5 34.5" />,
  // Arc extérieur de rayon 13, arc intérieur plus ouvert (rayon 16) : un croissant d'épaisseur visible.
  lune: (c) => <path d="M27 11 A13 13 0 1 0 27 37 A16 16 0 0 1 27 11 Z" fill={c} stroke="none" />,
  delta: () => (
    <>
      <path d="M11 35 L24 13 L37 35 Z" />
      <path d="M18 35 L24 25 L30 35" />
    </>
  ),
  cible: (c) => (
    <>
      <circle cx="24" cy="24" r="13" />
      <circle cx="24" cy="24" r="7.5" />
      <circle cx="24" cy="24" r="2.5" fill={c} stroke="none" />
    </>
  ),
  vague: () => (
    <>
      <path d="M8 22 c4 -6 8 -6 12 0 s8 6 12 0 s6 -6 8 -3" />
      <path d="M8 31 c4 -6 8 -6 12 0 s8 6 12 0 s6 -6 8 -3" />
    </>
  ),
  hexagone: () => <path d="M24 10 L36 17 V31 L24 38 L12 31 V17 Z" />,
  noeud: () => (
    <>
      <circle cx="19" cy="24" r="9" />
      <circle cx="29" cy="24" r="9" />
    </>
  ),
};

interface AvatarIconProps {
  avatar: Avatar;
  size?: number;
  /** Nom accessible ; sans titre, l'avatar est décoratif. */
  title?: string;
}

/** EF-4.5 — avatar choisi dans une bibliothèque de motifs géométriques. */
export function AvatarIcon({ avatar, size = 40, title }: AvatarIconProps) {
  const hue = HUES[avatar];
  const color = `hsl(${hue} 85% 72%)`;
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ flex: 'none', display: 'block' }}
    >
      <rect width="48" height="48" rx="14" fill={`hsl(${hue} 40% 17%)`} />
      <g fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {SHAPES[avatar](color)}
      </g>
    </svg>
  );
}
