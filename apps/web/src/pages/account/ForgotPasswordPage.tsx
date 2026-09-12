import { useState, type FormEvent } from 'react';
import { authApi } from '../../api/client';
import { t } from '../../i18n';
import { errorText } from '../../lib/errors';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import styles from './account.module.css';

/** EF-4.3 — demande de lien de réinitialisation ; la réponse ne révèle pas si l'adresse est inscrite. */
export function ForgotPasswordPage() {
  useDocumentTitle(t('auth.forgot.title'));
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setPending(false);
    }
  };

  return (
    <section className={styles.page}>
      <form className={styles.panel} onSubmit={submit}>
        <h1>{t('auth.forgot.title')}</h1>
        {sent ? (
          <p className={styles.success} role="status">
            {t('auth.forgot.sent')}
          </p>
        ) : (
          <>
            <p className={styles.intro}>{t('auth.forgot.intro')}</p>
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
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <div className={styles.actions}>
              <button type="submit" className="btn btn-primary" disabled={pending}>
                {t('auth.forgot.submit')}
              </button>
            </div>
          </>
        )}
      </form>
    </section>
  );
}
