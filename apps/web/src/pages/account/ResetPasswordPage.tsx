import { PASSWORD_MIN_LENGTH } from '@recto/shared';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { authApi } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { t } from '../../i18n';
import { errorText } from '../../lib/errors';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import styles from './account.module.css';
import { PasswordField } from './PasswordField';

/** EF-4.3 — choix d'un nouveau mot de passe depuis le lien reçu par courriel. */
export function ResetPasswordPage() {
  useDocumentTitle(t('auth.reset.title'));
  const [params] = useSearchParams();
  const token = params.get('jeton') ?? '';
  const { refresh } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(token ? null : t('auth.verify.missing'));
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      setError(t('auth.reset.mismatch'));
      return;
    }
    setPending(true);
    setError(null);
    try {
      await authApi.resetPassword(token, password);
      await refresh();
      setDone(true);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setPending(false);
    }
  };

  return (
    <section className={styles.page}>
      <form className={styles.panel} onSubmit={submit}>
        <h1>{t('auth.reset.title')}</h1>
        {done ? (
          <>
            <p className={styles.success} role="status">
              {t('auth.reset.done')}
            </p>
            <div className={styles.actions}>
              <Link className="btn btn-primary" to="/profil">
                {t('auth.toProfile')}
              </Link>
            </div>
          </>
        ) : (
          <>
            <PasswordField
              label={t('auth.reset.new')}
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              hint={t('auth.passwordHint')}
            />
            <PasswordField
              label={t('auth.reset.confirm')}
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
            />
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <div className={styles.actions}>
              <button type="submit" className="btn btn-primary" disabled={pending || !token}>
                {t('auth.reset.submit')}
              </button>
            </div>
          </>
        )}
      </form>
    </section>
  );
}
