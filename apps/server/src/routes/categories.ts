import { playableDifficulties, type CategorySummary, type CreditsCategory } from '@recto/shared';
import { Router } from 'express';
import type { CategoryRepository, ContentCategory } from '../content/types';
import { imageSources } from '../media/sources';
import type { MediaStorage } from '../media/storage';

function toSummary(category: ContentCategory, media: MediaStorage): CategorySummary {
  const thumbnail = category.images.find((image) => image.id === category.thumbnailImageId) ?? category.images[0];
  return {
    slug: category.slug,
    name: category.name,
    description: category.description,
    imageCount: category.images.length,
    thumbnail: thumbnail ? imageSources(media, thumbnail.kind, thumbnail.storageKey) : null,
    difficulties: playableDifficulties(category.images, category.maxDifficulty),
  };
}

export function categoriesRouter(categories: CategoryRepository, media: MediaStorage): Router {
  const router = Router();

  // Une catégorie trop pauvre pour la moindre difficulté n'est pas proposée (EF-3.8).
  router.get('/', async (_req, res) => {
    const summaries = (await categories.listPublished())
      .map((category) => toSummary(category, media))
      .filter((category) => category.difficulties.length > 0);
    res.json(summaries);
  });

  return router;
}

/** ENF-8 — crédits de chaque image publiée, générés à partir du contenu. */
export function creditsRouter(categories: CategoryRepository): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    const credits: CreditsCategory[] = (await categories.listPublished()).map((category) => ({
      slug: category.slug,
      name: category.name,
      images: category.images
        .map(({ id, title, author, licence, licenceUrl, sourceUrl, retrievedAt }) => ({
          id,
          title,
          author,
          licence,
          licenceUrl,
          sourceUrl,
          retrievedAt,
        }))
        .sort((a, b) => a.title.localeCompare(b.title, 'fr')),
    }));
    res.json(credits);
  });

  return router;
}
