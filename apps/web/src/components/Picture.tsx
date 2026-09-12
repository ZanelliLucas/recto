import type { ImageSize, ImageSources } from '@recto/shared';

interface PictureProps {
  sources: ImageSources | null;
  size: ImageSize;
  alt: string;
  className?: string;
}

/** Image hors partie (vignettes, back-office) : le navigateur choisit AVIF ou WebP. */
export function Picture({ sources, size, alt, className }: PictureProps) {
  if (!sources) return <span className={className} aria-hidden="true" />;
  if (sources.kind === 'vector') return <img className={className} src={sources.url} alt={alt} loading="lazy" />;
  return (
    <picture>
      <source type="image/avif" srcSet={sources.avif[size]} />
      <img className={className} src={sources.webp[size]} alt={alt} loading="lazy" />
    </picture>
  );
}
