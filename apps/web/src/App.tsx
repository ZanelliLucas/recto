import { lazy, type ComponentType } from 'react';
import { Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { CategoriesPage } from './pages/CategoriesPage';
import { GamePage } from './pages/GamePage';
import { HomePage } from './pages/HomePage';
import { LevelPage } from './pages/LevelPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ResultPage } from './pages/ResultPage';

/**
 * ENF-2.1 — le parcours de jeu (accueil, catégories, niveau, partie, résultat) est dans le script
 * initial ; les autres écrans sont chargés à la demande. Layout les attend sous un seul Suspense.
 */
const page = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) =>
  lazy(() => load().then((module) => ({ default: module[name] })));

const LoginPage = page(() => import('./pages/account/LoginPage'), 'LoginPage');
const RegisterPage = page(() => import('./pages/account/RegisterPage'), 'RegisterPage');
const VerifyEmailPage = page(() => import('./pages/account/VerifyEmailPage'), 'VerifyEmailPage');
const ForgotPasswordPage = page(() => import('./pages/account/ForgotPasswordPage'), 'ForgotPasswordPage');
const ResetPasswordPage = page(() => import('./pages/account/ResetPasswordPage'), 'ResetPasswordPage');
const ProfilePage = page(() => import('./pages/account/ProfilePage'), 'ProfilePage');
const SettingsPage = page(() => import('./pages/account/SettingsPage'), 'SettingsPage');
const HowToPlayPage = page(() => import('./pages/HowToPlayPage'), 'HowToPlayPage');
const CreditsPage = page(() => import('./pages/CreditsPage'), 'CreditsPage');
const LegalNoticePage = page(() => import('./pages/legal/LegalNoticePage'), 'LegalNoticePage');
const PrivacyPage = page(() => import('./pages/legal/PrivacyPage'), 'PrivacyPage');
const ContactPage = page(() => import('./pages/legal/ContactPage'), 'ContactPage');
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
        <Route path="admin/*" element={<AdminApp />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
