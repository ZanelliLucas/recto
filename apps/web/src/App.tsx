import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { CategoriesPage } from './pages/CategoriesPage';
import { CreditsPage } from './pages/CreditsPage';
import { GamePage } from './pages/GamePage';
import { HomePage } from './pages/HomePage';
import { LevelPage } from './pages/LevelPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ResultPage } from './pages/ResultPage';

/** Le back-office est chargé à la demande : il n'alourdit pas le jeu (ENF-2.1). */
const AdminApp = lazy(() => import('./pages/admin/AdminApp'));

/** Arborescence du § 3.1 ; profil, comptes et paramètres arrivent au lot 3. */
export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="jouer/:categorie" element={<LevelPage />} />
        <Route path="partie/:id" element={<GamePage />} />
        <Route path="partie/:id/resultat" element={<ResultPage />} />
        <Route path="credits" element={<CreditsPage />} />
        <Route
          path="admin/*"
          element={
            <Suspense fallback={<p role="status">Chargement…</p>}>
              <AdminApp />
            </Suspense>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
