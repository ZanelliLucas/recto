import { DIFFICULTY_ORDER, type AdminCategorySummary, type Difficulty } from '@recto/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { adminApi } from '../../api/client';
import { Picture } from '../../components/Picture';
import { difficultyLabel } from '../../i18n';
import { errorMessage, issueText, slugify } from './adminText';
import styles from './admin.module.css';

export function AdminCategoriesPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<AdminCategorySummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [maxDifficulty, setMaxDifficulty] = useState<Difficulty>('difficile');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    adminApi.categories().then(setCategories, (caught: unknown) => setError(errorMessage(caught)));
  }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const created = await adminApi.createCategory({
        name,
        slug,
        description,
        maxDifficulty,
        sortOrder: (categories?.length ?? 0) + 1,
      });
      navigate(`/admin/categories/${created.id}`);
    } catch (caught) {
      setError(errorMessage(caught));
      setPending(false);
    }
  };

  return (
    <>
      <section className={styles.panel}>
        <h1>Catégories</h1>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {categories === null ? (
          !error && <p role="status">Chargement…</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Catégorie</th>
                  <th scope="col">Images</th>
                  <th scope="col">Groupes</th>
                  <th scope="col">Jusqu’à</th>
                  <th scope="col">État</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td>
                      <Link to={`/admin/categories/${category.id}`} className={styles.rowLink}>
                        <Picture sources={category.thumbnail} size={200} alt="" className={styles.rowThumb} />
                        <span>
                          <strong>{category.name}</strong>
                          <span className={styles.meta}> /{category.slug}</span>
                        </span>
                      </Link>
                    </td>
                    <td>{category.imageCount}</td>
                    <td>{category.groupCount}</td>
                    <td>{difficultyLabel(category.maxDifficulty)}</td>
                    <td>
                      <span className={category.published ? `${styles.badge} ${styles.badgeOn}` : styles.badge}>
                        {category.published ? 'Publiée' : 'Brouillon'}
                      </span>
                      {category.issues.length > 0 && (
                        <span className={styles.meta}> {category.issues.map(issueText).join(' ; ')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <form className={styles.panel} onSubmit={create}>
        <h2>Nouvelle catégorie</h2>
        <div className={styles.grid}>
          <label className={styles.field}>
            <span>Nom</span>
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (!slugEdited) setSlug(slugify(event.target.value));
              }}
              required
              maxLength={60}
            />
          </label>
          <label className={styles.field}>
            <span>Identifiant d’adresse</span>
            <input
              value={slug}
              onChange={(event) => {
                setSlug(event.target.value);
                setSlugEdited(true);
              }}
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              maxLength={60}
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
            Créer la catégorie
          </button>
        </div>
      </form>
    </>
  );
}
