import { Link } from 'react-router';
import { site } from '../../legal/site';
import { t } from '../../i18n';
import { formatDay } from '../../lib/format';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { ContactLink } from './LegalNoticePage';

/**
 * EF-8.3, ENF-6 — politique de confidentialité. Les durées citées sont celles que le code applique :
 * toute modification de l'une doit se reporter ici.
 */
export function PrivacyPage() {
  useDocumentTitle('Politique de confidentialité');
  const { host, mailProvider } = site;

  return (
    <article className="prose">
      <h1>Politique de confidentialité</h1>
      <p className="lead">
        RECTO se joue sans compte, sans publicité et sans traceur. Les seules données conservées sont celles qu’exige le jeu.
      </p>

      <h2>Responsable du traitement</h2>
      <p>
        {site.publisher.name}, éditeur du site (voir les <Link to="/mentions-legales">mentions légales</Link>). Contact :{' '}
        <ContactLink />.
      </p>

      <h2>Données traitées</h2>
      {/* Zone défilante sur petit écran : atteignable au clavier pour être parcourue (WCAG 2.1.1). */}
      <div className="table-wrap" tabIndex={0} role="region" aria-label="Données traitées">
        <table>
          <thead>
            <tr>
              <th scope="col">Traitement</th>
              <th scope="col">Données</th>
              <th scope="col">Finalité et base légale</th>
              <th scope="col">Conservation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Compte (facultatif)</th>
              <td>Adresse électronique, pseudonyme, avatar, empreinte du mot de passe (Argon2id), date d’inscription</td>
              <td>Fournir le compte demandé : records et historique sur tous vos appareils (exécution du service)</td>
              <td>Jusqu’à la suppression du compte</td>
            </tr>
            <tr>
              <th scope="row">Parties</th>
              <td>Catégorie, niveau, cartes tirées, coups, durée mesurée par le serveur, dates</td>
              <td>Chronométrer la partie, établir les records, écarter les résultats falsifiés (exécution du service)</td>
              <td>Avec compte : jusqu’à sa suppression. Sans compte : 12 mois</td>
            </tr>
            <tr>
              <th scope="row">Courriels de service</th>
              <td>Adresse électronique, lien à usage unique (seule son empreinte est conservée)</td>
              <td>Confirmer l’adresse, réinitialiser le mot de passe (exécution du service)</td>
              <td>Lien valable 48 heures (confirmation) ou 1 heure (réinitialisation)</td>
            </tr>
            <tr>
              <th scope="row">Sécurité</th>
              <td>Nombre de tentatives par adresse IP ou adresse électronique</td>
              <td>Limiter les tentatives de connexion et les abus (intérêt légitime)</td>
              <td>En mémoire seulement, une minute</td>
            </tr>
            <tr>
              <th scope="row">Mesure d’audience</th>
              <td>Nombre de pages vues par jour. Ni cookie, ni adresse IP, ni identifiant</td>
              <td>Connaître la fréquentation des pages (intérêt légitime)</td>
              <td>Compteurs agrégés, 25 mois</td>
            </tr>
            <tr>
              <th scope="row">Journaux techniques</th>
              <td>Message d’erreur, page concernée, date. Ni adresse IP, ni identifiant</td>
              <td>Détecter et corriger les pannes (intérêt légitime)</td>
              <td>30 jours</td>
            </tr>
            <tr>
              <th scope="row">Sauvegardes</th>
              <td>Copie quotidienne de la base de données</td>
              <td>Restaurer le service après un incident (intérêt légitime)</td>
              <td>30 jours</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Aucune donnée n’est vendue ni utilisée à des fins publicitaires. Votre pseudonyme et votre avatar sont conçus pour être
        publics ; ils ne sont aujourd’hui affichés qu’à vous, et le seront aux autres joueurs lorsque des classements ouvriront.
      </p>

      <h2>Cookies et stockage local</h2>
      <p>
        RECTO ne dépose que des éléments strictement nécessaires au service que vous demandez, exemptés de consentement : aucun
        bandeau n’est donc affiché.
      </p>
      <ul>
        <li>
          <code>recto_session</code> — maintient votre connexion ; 30 jours, supprimé à la déconnexion.
        </li>
        <li>
          <code>recto_gid</code> — identifiant aléatoire qui rattache à ce navigateur les parties jouées sans compte, pour que
          vous puissiez les reprendre en créant un compte ; 1 an.
        </li>
        <li>
          Stockage local du navigateur (clés <code>recto.*</code>) — vos préférences, vos records en mode invité et la dernière
          partie jouée. Ces données ne quittent pas votre appareil.
        </li>
      </ul>

      <h2>Destinataires et hébergement</h2>
      <p>
        Les données ne sont accessibles qu’à l’éditeur et à ses sous-traitants techniques : l’hébergeur, {host.name} (
        {host.country}), et le prestataire d’envoi des courriels, {mailProvider.name} ({mailProvider.country}).
      </p>

      <h2>Âge minimal</h2>
      <p>
        L’inscription est ouverte dès 15 ans. En deçà, elle requiert l’accord d’un titulaire de l’autorité parentale
        (article 45 de la loi Informatique et Libertés). Le jeu sans compte est ouvert à tous.
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité.
        L’essentiel s’exerce directement depuis vos <Link to="/parametres">paramètres</Link> : modification du profil, export de
        toutes vos données au format JSON, suppression définitive du compte et des parties associées. Pour toute autre demande,
        écrivez à <ContactLink /> ; une réponse vous sera apportée sous un mois.
      </p>
      <p>
        Vous pouvez également adresser une réclamation à la CNIL (
        <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer">
          cnil.fr
        </a>
        ).
      </p>

      <h2>Sécurité</h2>
      <p>
        Connexions chiffrées (HTTPS), mots de passe conservés sous forme d’empreinte Argon2id, cookie de session inaccessible aux
        scripts, limitation des tentatives de connexion.
      </p>

      <p className="lead">Dernière mise à jour : {formatDay(site.privacyUpdatedAt)}.</p>
    </article>
  );
}
