import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { authApi } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { t } from '../../i18n';
import { errorText } from '../../lib/errors';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import styles from './account.module.css';

/** EF-4.2 — lien de vérification reçu par courriel. */
export function VerifyEmailPage() {
  useDocumentTitle(t('auth.verify.title'));
  const [params] = useSearchParams();
  const token = params.get('jeton');
  const { refresh } = useAuth();
  const [status, setStatus] = useState<'pending' | 'done' | 'error'>(token ? 'pending' : 'error');
  const [message, setMessage] = useState(token ? '' : t('auth.verify.missing'));
  // Le jeton ne sert qu'une fois : l'appel ne doit pas être rejoué par le double rendu de développement.
  const sent = useRef(false);

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;
    authApi.verifyEmail(token).then(
      async () => {
        setStatus('done');
        await refresh();
      },
      (caught: unknown) => {
        setStatus('error');
        setMessage(errorText(caught));
      },
    );
  }, [token, refresh]);

  return (
    <section className={styles.page}>
      <div className={styles.panel}>
        <h1>{t('auth.verify.title')}</h1>
        {status === 'pending' && <p role="status">{t('auth.verify.pending')}</p>}
        {status === 'done' && <p className={styles.success}>{t('auth.verify.done')}</p>}
        {status === 'error' && (
          <p className={styles.error} role="alert">
            {message}
          </p>
        )}
        <div className={styles.actions}>
          <Link className="btn" to="/profil">
            {t('auth.toProfile')}
          </Link>
        </div>
      </div>
    </section>
  );
}
