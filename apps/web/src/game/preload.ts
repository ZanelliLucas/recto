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
      try {
        await image.decode();
      } catch {
        // Certains navigateurs refusent le décodage anticipé d'une image pourtant chargée :
        // seule une image réellement illisible fait échouer la partie.
        if (!image.complete || image.naturalWidth === 0) throw new Error(`Image illisible : ${url}`);
      }
      onProgress?.(++loaded);
      return image;
    }),
  );
}

/**
 * Résolue dès que la page est visible. Le chronomètre du serveur ne doit pas partir pendant que
 * l'onglet est en arrière-plan : le décompte affiché y serait figé et le joueur absent.
 */
export function whenVisible(): Promise<void> {
  if (!document.hidden) return Promise.resolve();
  return new Promise((resolve) => {
    const onChange = () => {
      if (document.hidden) return;
      document.removeEventListener('visibilitychange', onChange);
      resolve();
    };
    document.addEventListener('visibilitychange', onChange);
  });
}
