import { useId, useState } from 'react';
import { t } from '../../i18n';
import styles from './account.module.css';

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  hint?: string;
  minLength?: number;
}

/** Champ de mot de passe avec bouton d'affichage, pour relire sa saisie sans la confirmer deux fois. */
export function PasswordField({ label, value, onChange, autoComplete, hint, minLength }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  const hintId = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.passwordRow}>
        <input
          id={id}
          className={styles.input}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={128}
          required
          aria-describedby={hint ? hintId : undefined}
        />
        <button type="button" className="btn btn-ghost" onClick={() => setVisible((v) => !v)} aria-pressed={visible}>
          {visible ? t('auth.hide') : t('auth.show')}
        </button>
      </div>
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
    </div>
  );
}
