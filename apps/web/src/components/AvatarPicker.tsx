import { AVATARS, type Avatar } from '@recto/shared';
import { t } from '../i18n';
import { AvatarIcon } from './AvatarIcon';
import styles from './AvatarPicker.module.css';

interface AvatarPickerProps {
  value: Avatar;
  onChange: (avatar: Avatar) => void;
}

/** Groupe de boutons radio natifs : navigation au clavier fournie par le navigateur. */
export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  return (
    <fieldset className={styles.picker}>
      <legend>{t('auth.avatar')}</legend>
      <div className={styles.options}>
        {AVATARS.map((avatar) => (
          <label key={avatar} className={styles.option}>
            <input
              type="radio"
              name="avatar"
              value={avatar}
              checked={value === avatar}
              onChange={() => onChange(avatar)}
              className="visually-hidden"
            />
            <AvatarIcon avatar={avatar} size={44} title={t(`avatar.${avatar}`)} />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
