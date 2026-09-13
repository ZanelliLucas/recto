import { Link } from 'react-router';
import { site } from '../../legal/site';
import { t } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

/** EF-8.3 — mentions légales (LCEN, art. 6). Texte juridique propre à la version française. */
export function LegalNoticePage() {
  useDocumentTitle(t('nav.legal'));
  const { publisher, host } = site;

  return (
    <article className="prose">
      <h1>Mentions légales</h1>

      <h2>Éditeur</h2>
      {publisher.kind === 'professionnel' ? (
        <p>
          Le site {site.name} est édité par {publisher.name}, {publisher.address} ({publisher.legalId}).
        </p>
      ) : (
        <p>
          Le site {site.name} est édité à titre non professionnel par {publisher.name}. Conformément à l’article 6-III-2 de la
          loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie numérique, les éléments d’identification de
          l’éditeur ont été communiqués à l’hébergeur, qui les tient à la disposition des autorités.
        </p>
      )}
      <p>
        Directeur ou directrice de la publication : {site.publicationDirector}. Contact : <ContactLink />.
      </p>

      <h2>Hébergement</h2>
      <p>
        {host.name}, {host.address} ({host.country}).
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Les images des cartes relèvent du domaine public ou de licences libres (Creative Commons). Leur auteur, leur licence et
        leur source sont indiqués sur la page <Link to="/credits">Crédits iconographiques</Link> ; leur réutilisation obéit à
        ces licences. Le code, la mise en page et les éléments graphiques propres au site demeurent la propriété de l’éditeur.
      </p>
      <p>
        Si vous êtes titulaire de droits sur une image et estimez son usage incorrect, écrivez à <ContactLink /> : l’image sera
        retirée ou son attribution corrigée dans les meilleurs délais.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Le traitement des données des joueurs est décrit dans la <Link to="/confidentialite">politique de confidentialité</Link>.
      </p>
    </article>
  );
}

export function ContactLink() {
  return <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>;
}
