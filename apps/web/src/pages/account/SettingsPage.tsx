import { PASSWORD_MIN_LENGTH, type Avatar, type PublicUser } from '@recto/shared';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { meApi } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { AvatarPicker } from '../../components/AvatarPicker';
import { LOCALES, t } from '../../i18n';
import { errorText } from '../../lib/errors';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import type { ThemePreference } from '../../settings/preferences';
import { usePreferences } from '../../settings/PreferencesContext';
import styles from './account.module.css';
import { PasswordField } from './PasswordField';

const THEMES: readonly ThemePreference[] = ['sombre', 'clair', 'systeme'];

/**
 * § 3.1 /parametres — préférences (EF-8.1), ouvertes aux invités ; pour un compte : profil public,
 * mot de passe, export et suppression des données (EF-4.5, ENF-6).
 */
export function SettingsPage() {
  useDocumentTitle(t('settings.title'));
  const { ready, user, setUser } = useAuth();
  const navigate = useNavigate();

  return (
    <div className={`${styles.page} ${styles.wide}`}>
      <h1>{t('settings.title')}</h1>
      <PreferencesForm />
      {!ready ? (
        <p role="status">{t('profile.loading')}</p>
      ) : !user ? (
        <section className={styles.panel}>
          <h2>{t('settings.account')}</h2>
          <p className={styles.intro}>{t('settings.guest')}</p>
          <div className={styles.actions}>
            <Link className="btn btn-primary" to={`/connexion?retour=${encodeURIComponent('/parametres')}`}>
              {t('nav.login')}
            </Link>
          </div>
        </section>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}

/** Chaque réglage s'applique et s'enregistre dès qu'il change : pas de bouton de validation. */
function PreferencesForm() {
  const { preferences, update, reducedMotion } = usePreferences();
  const systemForcesReduction = reducedMotion && preferences.motion !== 'reduites';

  return (
    <section className={styles.panel} aria-labelledby="settings-preferences">
      <h2 id="settings-preferences">{t('settings.preferences')}</h2>
      <p className={styles.intro}>{t('settings.preferencesIntro')}</p>

      <label className={styles.check}>
        <input type="checkbox" checked={preferences.sound} onChange={(event) => update({ sound: event.target.checked })} />
        <span>
          {t('settings.sound')}
          <span className={styles.small}>{t('settings.soundHint')}</span>
        </span>
      </label>

      <label className={styles.check}>
        <input
          type="checkbox"
          checked={preferences.motion === 'reduites' || systemForcesReduction}
          disabled={systemForcesReduction}
          onChange={(event) => update({ motion: event.target.checked ? 'reduites' : 'systeme' })}
        />
        <span>
          {t('settings.motion')}
          <span className={styles.small}>{systemForcesReduction ? t('settings.motionSystem') : t('settings.motionHint')}</span>
        </span>
      </label>

      <fieldset className={styles.fieldset}>
        <legend>{t('settings.theme')}</legend>
        <div className={styles.segmented}>
          {THEMES.map((theme) => (
            <label key={theme} className={styles.segment}>
              <input
                type="radio"
                name="theme"
                value={theme}
                checked={preferences.theme === theme}
                onChange={() => update({ theme })}
              />
              <span>{t(`settings.theme.${theme}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className={styles.field}>
        <span>{t('settings.language')}</span>
        <select className={styles.input} value={preferences.locale} onChange={() => undefined}>
          {LOCALES.map((locale) => (
            <option key={locale.code} value={locale.code} disabled={!locale.available}>
              {locale.available ? locale.label : t('settings.languageSoon', { label: locale.label })}
            </option>
          ))}
        </select>
      </label>
    </section>
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
