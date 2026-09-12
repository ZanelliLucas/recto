import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Port distinct de 4000, déjà pris par d'autres projets du poste ; 127.0.0.1 évite
// qu'un autre service écoutant en IPv4 capte les requêtes destinées à l'API.
const api = `http://127.0.0.1:${process.env.API_PORT ?? 4747}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': api,
      '/media': api,
    },
  },
});
