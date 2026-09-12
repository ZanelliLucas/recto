/** Accès à localStorage tolérant : navigation privée, stockage plein ou bloqué ne font jamais échouer le jeu. */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Stockage indisponible : le record ne sera simplement pas conservé.
  }
}
