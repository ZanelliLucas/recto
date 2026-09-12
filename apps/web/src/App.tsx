import { Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { CategoriesPage } from './pages/CategoriesPage';
import { GamePage } from './pages/GamePage';
import { HomePage } from './pages/HomePage';
import { LevelPage } from './pages/LevelPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ResultPage } from './pages/ResultPage';

/** Arborescence du § 3.1 ; profil, comptes, paramètres et crédits arrivent aux lots suivants. */
export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="jouer/:categorie" element={<LevelPage />} />
        <Route path="partie/:id" element={<GamePage />} />
        <Route path="partie/:id/resultat" element={<ResultPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
