import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Port distinct de 4000, déjà pris par d'autres projets du poste ; 127.0.0.1 évite
// qu'un autre service écoutant en IPv4 capte les requêtes destinées à l'API.
const api = `http://127.0.0.1:${process.env.API_PORT ?? 4747}`;

// PORT appartient au serveur Vite en développement ; il permet à un lanceur de choisir un
// port libre. L'API suit APP_URL de son côté, pour que le contrôle d'origine reste cohérent.
const port = Number(process.env.PORT ?? 5173);

export default defineConfig({
  plugins: [react()],
  server: {
    port,
    proxy: {
      '/api': api,
      '/media': api,
    },
  },
});
