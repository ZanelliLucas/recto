import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Le hachage Argon2id est lent à dessein (19 Mio par calcul) : sur une machine chargée,
    // les parcours qui inscrivent plusieurs comptes dépassent la limite par défaut de 5 s.
    testTimeout: 20_000,
  },
});
