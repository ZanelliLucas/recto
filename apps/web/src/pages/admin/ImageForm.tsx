import type { AdminImage } from '@recto/shared';
import { useRef, useState, type FormEvent, type InputHTMLAttributes } from 'react';
import styles from './admin.module.css';

export interface ImageFormValues {
  title: string;
  author: string;
  sourceUrl: string;
  licence: string;
  licenceUrl: string;
  retrievedAt: string;
  caption: string;
  date: string;
  place: string;
  visualGroup: string;
  infoUrl: string;
}

const EMPTY: ImageFormValues = {
  title: '',
  author: '',
  sourceUrl: '',
  licence: '',
  licenceUrl: '',
  retrievedAt: '',
  caption: '',
  date: '',
  place: '',
  visualGroup: '',
  infoUrl: '',
};

const fromImage = (image: AdminImage): ImageFormValues => ({
  title: image.title,
  author: image.author,
  sourceUrl: image.sourceUrl,
  licence: image.licence,
  licenceUrl: image.licenceUrl ?? '',
  retrievedAt: image.retrievedAt,
  caption: image.caption ?? '',
  date: image.date ?? '',
  place: image.place ?? '',
  visualGroup: image.visualGroup ?? '',
  infoUrl: image.infoUrl ?? '',
});

interface ImageFormProps {
  /** Image modifiée ; absente pour un ajout, qui exige alors un fichier. */
  image?: AdminImage;
  submitLabel: string;
  /** Renvoie vrai en cas de succès : le formulaire d'ajout se vide alors. */
  onSubmit: (values: ImageFormValues, file: File | null) => Promise<boolean>;
  onCancel?: () => void;
}

/** EF-7.2 et EF-7.3 — source et licence obligatoires, métadonnées pédagogiques facultatives. */
export function ImageForm({ image, submitLabel, onSubmit, onCancel }: ImageFormProps) {
  const [values, setValues] = useState<ImageFormValues>(() => (image ? fromImage(image) : EMPTY));
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const field = (key: keyof ImageFormValues, label: string, props: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className={styles.field}>
      <span>{label}</span>
      <input value={values[key]} onChange={(event) => setValues((v) => ({ ...v, [key]: event.target.value }))} {...props} />
    </label>
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    const ok = await onSubmit(values, file);
    setPending(false);
    if (ok && !image) {
      setValues(EMPTY);
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <form className={styles.form} onSubmit={submit}>
      {!image && (
        <label className={styles.field}>
          <span>Fichier — JPEG, PNG, WebP ou AVIF de 400 px de côté au minimum, ou SVG carré</span>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml"
            required
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
      )}
      <div className={styles.grid}>
        {field('title', 'Titre', { required: true, maxLength: 120 })}
        {field('author', 'Auteur', { required: true, maxLength: 300 })}
        {field('sourceUrl', 'Adresse de la source', { required: true, type: 'url', maxLength: 500 })}
        {field('licence', 'Licence', { required: true, maxLength: 120, placeholder: 'Domaine public, CC BY-SA 4.0…' })}
        {field('licenceUrl', 'Adresse de la licence', { type: 'url', maxLength: 500 })}
        {field('retrievedAt', 'Date de récupération', { type: 'date' })}
        {field('visualGroup', 'Groupe visuel', { maxLength: 60, placeholder: 'ex. cathedrale-gothique' })}
        {field('date', 'Date (fiche d’information)', { maxLength: 80 })}
        {field('place', 'Lieu (fiche d’information)', { maxLength: 120 })}
        {field('infoUrl', 'Article « En savoir plus » (Wikipédia…)', { type: 'url', maxLength: 500 })}
      </div>
      <label className={styles.field}>
        <span>Légende (fiche d’information)</span>
        <textarea
          value={values.caption}
          onChange={(event) => setValues((v) => ({ ...v, caption: event.target.value }))}
          maxLength={400}
        />
      </label>
      <div className={styles.actions}>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Envoi…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}
