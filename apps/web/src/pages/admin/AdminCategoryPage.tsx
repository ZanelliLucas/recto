import { DIFFICULTY_ORDER, type AdminCategoryDetail, type Difficulty } from '@recto/shared';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { adminApi } from '../../api/client';
import { Picture } from '../../components/Picture';
import { difficultyLabel } from '../../i18n';
import { errorMessage, issueText } from './adminText';
import { ImageForm, type ImageFormValues } from './ImageForm';
import styles from './admin.module.css';

export function AdminCategoryPage() {
  const { id = '' } = useParams();
  const [category, setCategory] = useState<AdminCategoryDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setCategory(await adminApi.category(id));
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Exécute une action, recharge la catégorie et renvoie vrai en cas de succès. */
  const run = async (action: () => Promise<unknown>, success: string): Promise<boolean> => {
    setError(null);
    setNotice(null);
    try {
      await action();
      await load();
      setNotice(success);
      return true;
    } catch (caught) {
      setError(errorMessage(caught));
      return false;
    }
  };

  if (!category) {
    return error ? (
      <p className={styles.error} role="alert">
        {error}
      </p>
    ) : (
      <p role="status">Chargement…</p>
    );
  }

  const upload = (values: ImageFormValues, file: File | null) =>
    run(async () => {
      const form = new FormData();
      if (file) form.append('file', file);
      for (const [key, value] of Object.entries(values)) form.append(key, value);
      await adminApi.uploadImage(id, form);
    }, 'Image ajoutée : recadrée et déclinée en trois résolutions.');

  return (
    <>
      <Link to="/admin" className={styles.back}>
        ← Toutes les catégories
      </Link>
      <div aria-live="polite">
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {notice && <p className={styles.notice}>{notice}</p>}
      </div>

      <CategorySettings category={category} onSave={(patch) => run(() => adminApi.updateCategory(id, patch), 'Catégorie enregistrée.')} />

      <section className={styles.panel}>
        <h2>Publication</h2>
        <p>
          <span className={category.published ? `${styles.badge} ${styles.badgeOn}` : styles.badge}>
            {category.published ? 'Publiée' : 'Brouillon'}
          </span>{' '}
          {category.imageCount} images, {category.groupCount} groupes visuels, niveaux jusqu’à{' '}
          {difficultyLabel(category.maxDifficulty)}.
        </p>
        {category.issues.length > 0 && (
          <ul className={styles.issues}>
            {category.issues.map((issue) => (
              <li key={issue.code}>{issueText(issue)}</li>
            ))}
          </ul>
        )}
        <div className={styles.actions}>
          <button
            type="button"
            className={category.published ? 'btn' : 'btn btn-primary'}
            disabled={!category.published && category.issues.length > 0}
            onClick={() =>
              run(
                () => adminApi.updateCategory(id, { published: !category.published }),
                category.published ? 'Catégorie dépubliée.' : 'Catégorie publiée.',
              )
            }
          >
            {category.published ? 'Dépublier' : 'Publier'}
          </button>
        </div>
      </section>

      <section className={styles.panel}>
        <h2>Ajouter une image</h2>
        <ImageForm submitLabel="Ajouter l’image" onSubmit={upload} />
      </section>

      <section className={styles.panel}>
        <h2>Images ({category.imageCount})</h2>
        <div className={styles.images}>
          {category.images.map((image) =>
            editing === image.id ? (
              <article key={image.id} className={`${styles.imageCard} ${styles.imageCardWide}`}>
                <span className={styles.imageTitle}>Modifier « {image.title} »</span>
                <ImageForm
                  image={image}
                  submitLabel="Enregistrer"
                  onCancel={() => setEditing(null)}
                  onSubmit={async (values) => {
                    const ok = await run(() => adminApi.updateImage(image.id, values), 'Image modifiée.');
                    if (ok) setEditing(null);
                    return ok;
                  }}
                />
              </article>
            ) : (
              <article key={image.id} className={styles.imageCard}>
                <Picture
                  sources={image.sources}
                  size={200}
                  alt={image.title}
                  className={image.id === category.thumbnailImageId ? styles.thumbSelected : undefined}
                />
                <span className={styles.imageTitle}>{image.title}</span>
                <span className={styles.meta}>
                  {image.author} · {image.licence}
                </span>
                {image.visualGroup && <span className={styles.meta}>Groupe : {image.visualGroup}</span>}
                <div className={styles.actions}>
                  <button type="button" className={`btn ${styles.small}`} onClick={() => setEditing(image.id)}>
                    Modifier
                  </button>
                  {image.id !== category.thumbnailImageId && (
                    <button
                      type="button"
                      className={`btn ${styles.small}`}
                      onClick={() => run(() => adminApi.updateCategory(id, { thumbnailImageId: image.id }), 'Vignette mise à jour.')}
                    >
                      Vignette
                    </button>
                  )}
                  <button
                    type="button"
                    className={`btn btn-ghost ${styles.small}`}
                    onClick={() => {
                      if (window.confirm(`Supprimer « ${image.title} » ?`)) {
                        void run(() => adminApi.deleteImage(image.id), 'Image supprimée.');
                      }
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </article>
            ),
          )}
        </div>
      </section>
    </>
  );
}

interface SettingsProps {
  category: AdminCategoryDetail;
  onSave: (patch: { name: string; slug: string; description: string; sortOrder: number; maxDifficulty: Difficulty }) => Promise<boolean>;
}

/** EF-7.1 — intitulé, description, ordre d'affichage et difficulté la plus élevée. */
function CategorySettings({ category, onSave }: SettingsProps) {
  const [name, setName] = useState(category.name);
  const [slug, setSlug] = useState(category.slug);
  const [description, setDescription] = useState(category.description);
  const [sortOrder, setSortOrder] = useState(category.sortOrder);
  const [maxDifficulty, setMaxDifficulty] = useState(category.maxDifficulty);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    await onSave({ name, slug, description, sortOrder, maxDifficulty });
    setPending(false);
  };

  return (
    <form className={styles.panel} onSubmit={submit}>
      <h1>{category.name}</h1>
      <div className={styles.grid}>
        <label className={styles.field}>
          <span>Nom</span>
          <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={60} />
        </label>
        <label className={styles.field}>
          <span>Identifiant d’adresse</span>
          <input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            maxLength={60}
          />
        </label>
        <label className={styles.field}>
          <span>Ordre d’affichage</span>
          <input
            type="number"
            min={0}
            max={999}
            value={sortOrder}
            onChange={(event) => setSortOrder(Number(event.target.value))}
            required
          />
        </label>
        <label className={styles.field}>
          <span>Difficulté la plus élevée</span>
          <select value={maxDifficulty} onChange={(event) => setMaxDifficulty(event.target.value as Difficulty)}>
            {DIFFICULTY_ORDER.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {difficultyLabel(difficulty)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={styles.field}>
        <span>Description</span>
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={400} />
      </label>
      <div className={styles.actions}>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          Enregistrer
        </button>
      </div>
    </form>
  );
}
