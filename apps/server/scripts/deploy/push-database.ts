/**
 * Copie le contenu éditorial — catégories et images — de la base locale vers la base libSQL
 * distante de l'hébergement. Les comptes, parties et records restent locaux : la base distante
 * démarre vierge de toute donnée personnelle.
 *
 * Relançable : une catégorie ou une image déjà présente est mise à jour, jamais dupliquée.
 *
 * Usage : DEPLOY_DATABASE_URL=libsql://… DEPLOY_DATABASE_AUTH_TOKEN=… npm run deploy:database
 */
import { eq } from 'drizzle-orm';
import { config } from '../../src/config';
import { openDatabase } from '../../src/db/client';
import { categories, images } from '../../src/db/schema';

const url = process.env.DEPLOY_DATABASE_URL;
const authToken = process.env.DEPLOY_DATABASE_AUTH_TOKEN;
if (!url) {
  console.error('DEPLOY_DATABASE_URL manquant : adresse libSQL de la base distante.');
  process.exit(1);
}

const source = await openDatabase(config.databaseUrl, config.migrationsDir);
// Les migrations sont appliquées à la base distante au passage : elle peut être toute neuve.
const target = await openDatabase(url, config.migrationsDir, authToken);

const sourceCategories = await source.select().from(categories);
const sourceImages = await source.select().from(images);
console.log(`Local : ${sourceCategories.length} catégorie(s), ${sourceImages.length} image(s).`);

// La vignette référence une image : on pose les catégories sans elle, puis on la rattache.
for (const category of sourceCategories) {
  await target
    .insert(categories)
    .values({ ...category, thumbnailImageId: null })
    .onConflictDoUpdate({ target: categories.id, set: { ...category, thumbnailImageId: null } });
}
for (const image of sourceImages) {
  await target.insert(images).values(image).onConflictDoUpdate({ target: images.id, set: image });
}
for (const category of sourceCategories) {
  if (category.thumbnailImageId) {
    await target
      .update(categories)
      .set({ thumbnailImageId: category.thumbnailImageId })
      .where(eq(categories.id, category.id));
  }
}

const [remoteCategories, remoteImages] = [await target.select().from(categories), await target.select().from(images)];
console.log(`Distant : ${remoteCategories.length} catégorie(s), ${remoteImages.length} image(s).`);
