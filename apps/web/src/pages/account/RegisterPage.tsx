import { PASSWORD_MIN_LENGTH, type Avatar } from '@recto/shared';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { authApi } from '../../api/client';
import { safeReturn, useAuth } from '../../auth/AuthContext';
import { AvatarPicker } from '../../components/AvatarPicker';
import { t } from '../../i18n';
import { errorText } from '../../lib/errors';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import styles from './account.module.css';
import { PasswordField } from './PasswordField';

/** EF-4.1 — adresse, mot de passe de 12 caractères au moins, pseudonyme public distinct de l'adresse. */
export function RegisterPage() {
  useDocumentTitle(t('auth.register.title'));
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const back = safeReturn(params.get('retour'));
  const [email, setEmail] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState<Avatar>('orbite');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ageConfirmed) return;
    setPending(true);
    setError(null);
    try {
      setUser(await authApi.register({ email, pseudo, password, avatar, ageConfirmed: true }));
      navigate(back ?? '/profil', { replace: true });
    } catch (caught) {
      setError(errorText(caught));
      setPending(false);
    }
  };

  return (
    <section className={styles.page}>
      <form className={styles.panel} onSubmit={submit}>
        <h1>{t('auth.register.title')}</h1>
        <p className={styles.intro}>{t('auth.register.intro')}</p>
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
        <label className={styles.field}>
          <span>{t('auth.pseudo')}</span>
          <input
            className={styles.input}
            autoComplete="nickname"
            value={pseudo}
            onChange={(event) => setPseudo(event.target.value)}
            required
            minLength={3}
            maxLength={20}
            pattern="[\p{L}\p{N}_\-]{3,20}"
          />
          <span className={styles.hint}>{t('auth.pseudoHint')}</span>
        </label>
        <PasswordField
          label={t('auth.password')}
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          hint={t('auth.passwordHint')}
        />
        <AvatarPicker value={avatar} onChange={setAvatar} />
        <label className={styles.check}>
          <input type="checkbox" checked={ageConfirmed} onChange={(event) => setAgeConfirmed(event.target.checked)} required />
          <span>{t('auth.register.age')}</span>
        </label>
        <p className={styles.hint}>{t('auth.register.privacy')}</p>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {t('auth.register.submit')}
          </button>
        </div>
        <div className={styles.links}>
          <Link to={back ? `/connexion?retour=${encodeURIComponent(back)}` : '/connexion'}>{t('auth.register.login')}</Link>
        </div>
      </form>
    </section>
  );
}
