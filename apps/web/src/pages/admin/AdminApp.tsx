import { useEffect, useState } from 'react';
import { Link, Route, Routes } from 'react-router';
import { adminApi } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { AdminAudiencePage } from './AdminAudiencePage';
import { AdminCategoriesPage } from './AdminCategoriesPage';
import { AdminCategoryPage } from './AdminCategoryPage';
import styles from './admin.module.css';

type Access = 'loading' | 'anonymous' | 'forbidden' | 'granted' | 'unreachable';

/** Back-office d'administration du contenu (EF-7), réservé au rôle administrateur (EF-7.5). */
export default function AdminApp() {
  useDocumentTitle('Back-office');
  const { user } = useAuth();
  const [access, setAccess] = useState<Access>('loading');

  useEffect(() => {
    adminApi.session().then(
      ({ authenticated, admin }) => setAccess(!authenticated ? 'anonymous' : admin ? 'granted' : 'forbidden'),
      () => setAccess('unreachable'),
    );
  }, [user]);

  if (access === 'loading') return <p role="status">Chargement…</p>;
  if (access === 'unreachable') return <p role="alert">Le serveur est injoignable.</p>;
  if (access === 'anonymous') {
    return (
      <section className={`${styles.panel} ${styles.narrow}`}>
        <h1>Back-office</h1>
        <p>Connectez-vous avec un compte administrateur.</p>
        <div className={styles.actions}>
          <Link className="btn btn-primary" to={`/connexion?retour=${encodeURIComponent('/admin')}`}>
            Se connecter
          </Link>
        </div>
      </section>
    );
  }
  if (access === 'forbidden') {
    return (
      <section className={`${styles.panel} ${styles.narrow}`}>
        <h1>Accès réservé</h1>
        <p>
          Ce compte n’a pas le rôle administrateur. Sur le serveur :{' '}
          <code>npm run user:role -- {user?.email ?? 'adresse'} admin</code>
        </p>
      </section>
    );
  }

  return (
    <div className={styles.admin}>
      <div className={styles.bar}>
        <Link to="/admin" className={styles.barTitle}>
          Back-office
        </Link>
        <Link to="/admin/audience" className="btn btn-ghost">
          Audience
        </Link>
        <Link to="/" className="btn btn-ghost">
          Retour au jeu
        </Link>
      </div>
      <Routes>
        <Route index element={<AdminCategoriesPage />} />
        <Route path="categories/:id" element={<AdminCategoryPage />} />
        <Route path="audience" element={<AdminAudiencePage />} />
      </Routes>
    </div>
  );
}
