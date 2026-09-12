import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, Route, Routes } from 'react-router';
import { adminApi } from '../../api/client';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { AdminCategoriesPage } from './AdminCategoriesPage';
import { AdminCategoryPage } from './AdminCategoryPage';
import { errorMessage } from './adminText';
import styles from './admin.module.css';

type Session = 'loading' | 'disabled' | 'anonymous' | 'authenticated' | 'unreachable';

/** Back-office d'administration du contenu (EF-7), réservé aux détenteurs du secret. */
export default function AdminApp() {
  useDocumentTitle('Back-office');
  const [session, setSession] = useState<Session>('loading');

  const refresh = useCallback(async () => {
    try {
      const { enabled, authenticated } = await adminApi.session();
      setSession(!enabled ? 'disabled' : authenticated ? 'authenticated' : 'anonymous');
    } catch {
      setSession('unreachable');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = async () => {
    await adminApi.logout().catch(() => undefined);
    setSession('anonymous');
  };

  if (session === 'loading') return <p role="status">Chargement…</p>;
  if (session === 'unreachable') return <p role="alert">Le serveur est injoignable.</p>;
  if (session === 'disabled') {
    return (
      <section className={`${styles.panel} ${styles.narrow}`}>
        <h1>Back-office désactivé</h1>
        <p>
          Définissez <code>ADMIN_SECRET</code> (16 caractères minimum) dans <code>apps/server/.env</code>, puis redémarrez
          le serveur.
        </p>
      </section>
    );
  }
  if (session === 'anonymous') return <LoginForm onSuccess={() => setSession('authenticated')} />;

  return (
    <div className={styles.admin}>
      <div className={styles.bar}>
        <Link to="/admin" className={styles.barTitle}>
          Back-office
        </Link>
        <button type="button" className="btn btn-ghost" onClick={logout}>
          Se déconnecter
        </button>
      </div>
      <Routes>
        <Route index element={<AdminCategoriesPage />} />
        <Route path="categories/:id" element={<AdminCategoryPage />} />
      </Routes>
    </div>
  );
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [secret, setSecret] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await adminApi.login(secret);
      onSuccess();
    } catch (caught) {
      setError(errorMessage(caught));
      setPending(false);
    }
  };

  return (
    <form className={`${styles.panel} ${styles.narrow}`} onSubmit={submit}>
      <h1>Back-office</h1>
      <label className={styles.field}>
        <span>Secret d’administration</span>
        <input
          type="password"
          autoComplete="current-password"
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
          required
        />
      </label>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          Se connecter
        </button>
      </div>
    </form>
  );
}
