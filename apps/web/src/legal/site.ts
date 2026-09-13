/**
 * EF-8.3 — identité de l'éditeur et prestataires, repris par les mentions légales, la politique de
 * confidentialité et la page de contact. Les valeurs `A_COMPLETER` doivent être renseignées avant la
 * mise en ligne : `npm run check:launch` refuse de valider tant qu'il en reste (§ 7.3).
 */
export const A_COMPLETER = '[à compléter]';

export interface Provider {
  name: string;
  address: string;
  /** Pays de traitement des données : hors Union européenne, la politique doit le signaler. */
  country: string;
  url?: string;
}

export const site = {
  name: 'RECTO',
  publisher: {
    /**
     * `particulier` : éditeur non professionnel, qui peut ne publier que les coordonnées de
     * l'hébergeur (LCEN, art. 6-III-2) ; son identité est alors tenue à la disposition de ce dernier.
     */
    kind: 'particulier' as 'particulier' | 'professionnel',
    /** Nom publié : celui de l'éditeur, ou un pseudonyme pour un particulier. */
    name: A_COMPLETER,
    /** Professionnel uniquement, et alors obligatoires : adresse du siège, forme sociale et SIREN. */
    address: '',
    legalId: '',
  },
  /** Directeur ou directrice de la publication. */
  publicationDirector: A_COMPLETER,
  /** Adresse de contact publique : questions, exercice des droits, signalement d'une image. */
  contactEmail: A_COMPLETER,
  host: { name: A_COMPLETER, address: A_COMPLETER, country: A_COMPLETER } satisfies Provider,
  /** Prestataire d'envoi des courriels de service (vérification d'adresse, réinitialisation). */
  mailProvider: { name: A_COMPLETER, address: A_COMPLETER, country: A_COMPLETER } satisfies Provider,
  /** Date de dernière mise à jour de la politique de confidentialité (AAAA-MM-JJ). */
  privacyUpdatedAt: '2026-09-13',
};

export const isFilled = (value: string) => value !== A_COMPLETER && value.trim() !== '';
