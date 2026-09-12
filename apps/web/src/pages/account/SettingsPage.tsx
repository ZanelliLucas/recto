import { PASSWORD_MIN_LENGTH, type Avatar, type PublicUser } from '@recto/shared';
import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { meApi } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { AvatarPicker } from '../../components/AvatarPicker';
import { t } from '../../i18n';
import { errorText } from '../../lib/errors';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import styles from './account.module.css';
import { PasswordField } from './PasswordField';

/** § 3.1 /parametres — profil public, mot de passe, export et suppression des données (EF-4.5, ENF-6). */
export function SettingsPage() {
  useDocumentTitle(t('settings.title'));
  const { ready, user, setUser } = useAuth();
  const navigate = useNavigate();

  if (!ready) return <p role="status">{t('profile.loading')}</p>;
  if (!user) return <Navigate to={`/connexion?retour=${encodeURIComponent('/parametres')}`} replace />;

  return (
    <div className={`${styles.page} ${styles.wide}`}>
      <h1>{t('settings.title')}</h1>
      <ProfileForm user={user} onSaved={setUser} />
      <PasswordForm />
      <section className={styles.panel}>
        <h2>{t('settings.data')}</h2>
        <p className={styles.intro}>{t('settings.exportText')}</p>
        <div className={styles.actions}>
          <a className="btn" href={meApi.exportUrl} download>
            {t('settings.export')}
          </a>
        </div>
      </section>
      <DeleteAccount
        onDeleted={() => {
          setUser(null);
          navigate('/', { replace: true });
        }}
      />
    </div>
  );
}

function ProfileForm({ user, onSaved }: { user: PublicUser; onSaved: (user: PublicUser) => void }) {
  const [pseudo, setPseudo] = useState(user.pseudo);
  const [avatar, setAvatar] = useState<Avatar>(user.avatar);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      onSaved(await meApi.updateProfile({ pseudo, avatar }));
      setMessage({ ok: true, text: t('settings.saved') });
    } catch (caught) {
      setMessage({ ok: false, text: errorText(caught) });
    }
  };

  return (
    <form className={styles.panel} onSubmit={submit}>
      <h2>{t('settings.profile')}</h2>
      <label className={styles.field}>
        <span>{t('auth.pseudo')}</span>
        <input
          className={styles.input}
          value={pseudo}
          onChange={(event) => setPseudo(event.target.value)}
          required
          minLength={3}
          maxLength={20}
          pattern="[\p{L}\p{N}_\-]{3,20}"
        />
        <span className={styles.hint}>{t('auth.pseudoHint')}</span>
      </label>
      <AvatarPicker value={avatar} onChange={setAvatar} />
      <Feedback message={message} />
      <div className={styles.actions}>
        <button type="submit" className="btn btn-primary">
          {t('settings.save')}
        </button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await meApi.changePassword(current, next);
      setCurrent('');
      setNext('');
      setMessage({ ok: true, text: t('settings.passwordChanged') });
    } catch (caught) {
      setMessage({ ok: false, text: errorText(caught) });
    }
  };

  return (
    <form className={styles.panel} onSubmit={submit}>
      <h2>{t('settings.password')}</h2>
      <PasswordField label={t('settings.currentPassword')} value={current} onChange={setCurrent} autoComplete="current-password" />
      <PasswordField
        label={t('auth.reset.new')}
        value={next}
        onChange={setNext}
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        hint={t('auth.passwordHint')}
      />
      <Feedback message={message} />
      <div className={styles.actions}>
        <button type="submit" className="btn btn-primary">
          {t('settings.passwordSubmit')}
        </button>
      </div>
    </form>
  );
}

function DeleteAccount({ onDeleted }: { onDeleted: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await meApi.deleteAccount(password);
      onDeleted();
    } catch (caught) {
      setError(errorText(caught));
    }
  };

  return (
    <form className={`${styles.panel} ${styles.danger}`} onSubmit={submit}>
      <h2>{t('settings.delete')}</h2>
      <p className={styles.intro}>{t('settings.deleteText')}</p>
      <PasswordField label={t('auth.password')} value={password} onChange={setPassword} autoComplete="current-password" />
      <label className={styles.check}>
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} required />
        <span>{t('settings.deleteConfirm')}</span>
      </label>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <button type="submit" className={`btn ${styles.dangerButton}`} disabled={!confirmed}>
          {t('settings.deleteSubmit')}
        </button>
      </div>
    </form>
  );
}

function Feedback({ message }: { message: { ok: boolean; text: string } | null }) {
  if (!message) return null;
  return (
    <p className={message.ok ? styles.success : styles.error} role={message.ok ? 'status' : 'alert'}>
      {message.text}
    </p>
  );
}
