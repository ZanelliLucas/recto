import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { authApi } from '../../api/client';
import { safeReturn, useAuth } from '../../auth/AuthContext';
import { t } from '../../i18n';
import { errorText } from '../../lib/errors';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import styles from './account.module.css';
import { PasswordField } from './PasswordField';

export function LoginPage() {
  useDocumentTitle(t('auth.login.title'));
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const back = safeReturn(params.get('retour'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      setUser(await authApi.login({ email, password }));
      navigate(back ?? '/profil', { replace: true });
    } catch (caught) {
      setError(errorText(caught));
      setPending(false);
    }
  };

  const withReturn = (path: string) => (back ? `${path}?retour=${encodeURIComponent(back)}` : path);

  return (
    <section className={styles.page}>
      <form className={styles.panel} onSubmit={submit}>
        <h1>{t('auth.login.title')}</h1>
        <label className={styles.field}>
          <span>{t('auth.email')}</span>
          <input
            className={styles.input}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            maxLength={254}
          />
        </label>
        <PasswordField label={t('auth.password')} value={password} onChange={setPassword} autoComplete="current-password" />
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {t('auth.login.submit')}
          </button>
        </div>
        <div className={styles.links}>
          <Link to="/mot-de-passe-oublie">{t('auth.login.forgot')}</Link>
          <Link to={withReturn('/inscription')}>{t('auth.login.register')}</Link>
        </div>
      </form>
    </section>
  );
}
