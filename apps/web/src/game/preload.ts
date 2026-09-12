/**
 * ENF-2.2 — toutes les images sont téléchargées et décodées avant le décompte :
 * aucune ne doit apparaître en cours de partie. Les objets renvoyés doivent être
 * conservés le temps de la partie pour rester en cache mémoire.
 */
export async function preloadImages(urls: readonly string[], onProgress?: (loaded: number) => void): Promise<HTMLImageElement[]> {
  let loaded = 0;
  return Promise.all(
    urls.map(async (url) => {
      const image = new Image();
      image.src = url;
      await image.decode();
      onProgress?.(++loaded);
      return image;
    }),
  );
}
