import { randomUUID } from 'node:crypto';
import {
  distinctGroupCount,
  publicationIssues,
  type AdminCategoryDetail,
  type AdminCategorySummary,
  type AdminImage,
  type CategoryInput,
  type CategoryPatch,
  type ImageMetadataInput,
} from '@recto/shared';
import type { SqlContentRepository } from '../content/contentRepository';
import type { ContentCategory, ContentImage } from '../content/types';
import { HttpError } from '../http/httpError';
import { processImage } from '../media/pipeline';
import { imageSources, storedKeys } from '../media/sources';
import type { MediaStorage } from '../media/storage';

const notFound = (what: 'categorie' | 'image') =>
  new HttpError(404, `${what}_introuvable`, what === 'categorie' ? 'Catégorie introuvable.' : 'Image introuvable.');

const today = () => new Date().toISOString().slice(0, 10);

/** Règles de gestion du back-office (EF-7) : aucune catégorie publiée ne passe sous son minimum. */
export class AdminService {
  constructor(
    private readonly content: SqlContentRepository,
    private readonly media: MediaStorage,
    private readonly now: () => number = Date.now,
  ) {}

  async listCategories(): Promise<AdminCategorySummary[]> {
    return (await this.content.listAll()).map((category) => this.summary(category));
  }

  async getCategory(id: string): Promise<AdminCategoryDetail> {
    const category = await this.requireCategory(id);
    return { ...this.summary(category), images: category.images.map((image) => this.adminImage(image)) };
  }

  /** EF-7.1 — une catégorie naît non publiée. */
  async createCategory(input: CategoryInput): Promise<AdminCategoryDetail> {
    if (await this.content.findBySlug(input.slug)) throw slugTaken();
    const id = randomUUID();
    const now = this.now();
    await this.content.insertCategory({
      id,
      ...input,
      published: false,
      thumbnailImageId: null,
      createdAt: now,
      updatedAt: now,
    });
    return this.getCategory(id);
  }

  async updateCategory(id: string, patch: CategoryPatch): Promise<AdminCategoryDetail> {
    const current = await this.requireCategory(id);
    if (patch.slug !== undefined && patch.slug !== current.slug && (await this.content.findBySlug(patch.slug))) {
      throw slugTaken();
    }
    if (patch.thumbnailImageId && !current.images.some((image) => image.id === patch.thumbnailImageId)) {
      throw new HttpError(400, 'vignette_invalide', 'La vignette doit être une image de la catégorie.');
    }
    const next = { ...current, ...patch };
    // EF-7.4 — publication bloquée tant que la volumétrie ne couvre pas la difficulté la plus élevée.
    if (next.published) this.assertPublishable(next.images, next);

    await this.content.updateCategory(id, { ...patch, updatedAt: this.now() });
    return this.getCategory(id);
  }

  /** EF-7.2 — téléversement, recadrage, trois résolutions ; source et licence obligatoires. */
  async addImage(categoryId: string, data: Buffer, mimeType: string, metadata: ImageMetadataInput): Promise<AdminImage> {
    await this.requireCategory(categoryId);
    const processed = await processImage(data, mimeType);
    const id = randomUUID();
    const storageKey = `img/${id}`;
    await Promise.all(processed.files.map((file) => this.media.put(storageKey + file.suffix, file.data)));

    const image: ContentImage = {
      id,
      categoryId,
      kind: processed.kind,
      storageKey,
      title: metadata.title,
      caption: metadata.caption ?? null,
      date: metadata.date ?? null,
      place: metadata.place ?? null,
      author: metadata.author,
      sourceUrl: metadata.sourceUrl,
      licence: metadata.licence,
      licenceUrl: metadata.licenceUrl ?? null,
      retrievedAt: metadata.retrievedAt ?? today(),
      visualGroup: metadata.visualGroup ?? null,
      createdAt: this.now(),
    };
    try {
      await this.content.insertImage(image);
    } catch (error) {
      await this.media.remove(storedKeys(image.kind, storageKey));
      throw error;
    }
    return this.adminImage(image);
  }

  async updateImage(id: string, patch: Partial<ImageMetadataInput>): Promise<AdminImage> {
    const image = await this.content.findImage(id);
    if (!image) throw notFound('image');
    if (patch.visualGroup !== undefined) {
      const category = await this.requireCategory(image.categoryId);
      if (category.published) {
        const images = category.images.map((other) => (other.id === id ? { ...other, visualGroup: patch.visualGroup ?? null } : other));
        this.assertPublishable(images, category);
      }
    }
    await this.content.updateImage(id, patch);
    return this.adminImage({ ...image, ...(await this.content.findImage(id))! });
  }

  async deleteImage(id: string): Promise<void> {
    const image = await this.content.findImage(id);
    if (!image) throw notFound('image');
    const category = await this.requireCategory(image.categoryId);
    if (category.published) {
      const remaining = category.images.filter((other) => other.id !== id);
      if (publicationIssues(remaining, category.maxDifficulty).length > 0) {
        throw new HttpError(
          409,
          'suppression_impossible',
          'Supprimer cette image ferait passer la catégorie publiée sous son minimum. Dépubliez-la d’abord.',
        );
      }
    }
    await this.content.deleteImage(id);
    if (category.thumbnailImageId === id) await this.content.updateCategory(category.id, { thumbnailImageId: null, updatedAt: this.now() });
    await this.media.remove(storedKeys(image.kind, image.storageKey));
  }

  private assertPublishable(images: readonly ContentImage[], category: Pick<ContentCategory, 'maxDifficulty'>): void {
    const issues = publicationIssues(images, category.maxDifficulty);
    if (issues.length > 0) {
      throw new HttpError(422, 'publication_impossible', 'Volumétrie insuffisante pour les niveaux proposés (EF-3.8).', issues);
    }
  }

  private async requireCategory(id: string): Promise<ContentCategory> {
    const category = await this.content.findById(id);
    if (!category) throw notFound('categorie');
    return category;
  }

  private summary(category: ContentCategory): AdminCategorySummary {
    const thumbnail = category.images.find((image) => image.id === category.thumbnailImageId) ?? category.images[0];
    return {
      id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description,
      sortOrder: category.sortOrder,
      maxDifficulty: category.maxDifficulty,
      published: category.published,
      thumbnailImageId: category.thumbnailImageId,
      thumbnail: thumbnail ? imageSources(this.media, thumbnail.kind, thumbnail.storageKey) : null,
      imageCount: category.images.length,
      groupCount: distinctGroupCount(category.images),
      issues: publicationIssues(category.images, category.maxDifficulty),
    };
  }

  private adminImage(image: ContentImage): AdminImage {
    return {
      id: image.id,
      title: image.title,
      caption: image.caption,
      date: image.date,
      place: image.place,
      author: image.author,
      sourceUrl: image.sourceUrl,
      licence: image.licence,
      licenceUrl: image.licenceUrl,
      retrievedAt: image.retrievedAt,
      visualGroup: image.visualGroup,
      sources: imageSources(this.media, image.kind, image.storageKey),
    };
  }
}

function slugTaken(): HttpError {
  return new HttpError(409, 'slug_existant', 'Une catégorie utilise déjà cet identifiant d’adresse.');
}
