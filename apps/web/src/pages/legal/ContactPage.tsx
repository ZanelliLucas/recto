import { Link } from 'react-router';
import { t } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { ContactLink } from './LegalNoticePage';

/**
 * EF-8.3 — contact. Une simple adresse plutôt qu'un formulaire : aucune donnée n'est collectée
 * par le site, et l'exercice des droits se fait sans intermédiaire (ENF-6.2, ENF-6.3).
 */
export function ContactPage() {
  useDocumentTitle(t('nav.contact'));

  return (
    <article className="prose">
      <h1>Contact</h1>
      <p className="lead">
        Une question, une suggestion de catégorie, un problème rencontré en jouant : écrivez à <ContactLink />.
      </p>

      <h2>Signaler une image</h2>
      <p>
        Pour une erreur de légende ou d’attribution, ou si vous êtes titulaire de droits sur une image, indiquez son titre et sa
        catégorie tels qu’ils figurent sur la page <Link to="/credits">Crédits iconographiques</Link>.
      </p>

      <h2>Vos données</h2>
      <p>
        Nul besoin de nous écrire pour exporter ou supprimer vos données : depuis vos{' '}
        <Link to="/parametres">paramètres</Link>, l’export est immédiat et la suppression définitive. Pour toute autre demande
        relative à vos données, écrivez à <ContactLink />. Le détail figure dans la{' '}
        <Link to="/confidentialite">politique de confidentialité</Link>.
      </p>
    </article>
  );
}
