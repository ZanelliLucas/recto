import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { ForgotPasswordPage } from './pages/account/ForgotPasswordPage';
import { LoginPage } from './pages/account/LoginPage';
import { ProfilePage } from './pages/account/ProfilePage';
import { RegisterPage } from './pages/account/RegisterPage';
import { ResetPasswordPage } from './pages/account/ResetPasswordPage';
import { SettingsPage } from './pages/account/SettingsPage';
import { VerifyEmailPage } from './pages/account/VerifyEmailPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { CreditsPage } from './pages/CreditsPage';
import { GamePage } from './pages/GamePage';
import { HomePage } from './pages/HomePage';
import { HowToPlayPage } from './pages/HowToPlayPage';
import { ContactPage } from './pages/legal/ContactPage';
import { LegalNoticePage } from './pages/legal/LegalNoticePage';
import { PrivacyPage } from './pages/legal/PrivacyPage';
import { LevelPage } from './pages/LevelPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ResultPage } from './pages/ResultPage';

/** Le back-office est chargé à la demande : il n'alourdit pas le jeu (ENF-2.1). */
const AdminApp = lazy(() => import('./pages/admin/AdminApp'));

/** Arborescence du § 3.1, complétée des pages transverses (EF-8.2, EF-8.3). */
export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="jouer/:categorie" element={<LevelPage />} />
        <Route path="partie/:id" element={<GamePage />} />
        <Route path="partie/:id/resultat" element={<ResultPage />} />
        <Route path="connexion" element={<LoginPage />} />
        <Route path="inscription" element={<RegisterPage />} />
        <Route path="verification" element={<VerifyEmailPage />} />
        <Route path="mot-de-passe-oublie" element={<ForgotPasswordPage />} />
        <Route path="reinitialisation" element={<ResetPasswordPage />} />
        <Route path="profil" element={<ProfilePage />} />
        <Route path="parametres" element={<SettingsPage />} />
        <Route path="comment-jouer" element={<HowToPlayPage />} />
        <Route path="credits" element={<CreditsPage />} />
        <Route path="mentions-legales" element={<LegalNoticePage />} />
        <Route path="confidentialite" element={<PrivacyPage />} />
        <Route path="contact" element={<ContactPage />} />
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
