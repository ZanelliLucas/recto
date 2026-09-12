import { playableDifficulties, type CategorySummary } from '@recto/shared';
import { Router } from 'express';
import { mediaUrl, type CategoryRepository, type ContentCategory } from '../content/types';

function toSummary(category: ContentCategory): CategorySummary {
  const thumbnail = category.images.find((image) => image.id === category.thumbnail)!;
  return {
    slug: category.slug,
    name: category.name,
    description: category.description,
    imageCount: category.images.length,
    thumbnailUrl: mediaUrl(category.slug, thumbnail.file),
    difficulties: playableDifficulties(category.images),
  };
}

export function categoriesRouter(categories: CategoryRepository): Router {
  const router = Router();

  // Une catégorie trop pauvre pour la moindre difficulté n'est pas proposée (EF-3.8).
  router.get('/', async (_req, res) => {
    const summaries = (await categories.listPublished()).map(toSummary).filter((c) => c.difficulties.length > 0);
    res.json(summaries);
  });

  return router;
}
