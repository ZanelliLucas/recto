# Recette de la version 1 — critères d'acceptation (§ 11)

Recette menée le 13 septembre 2026 sur le build de production servi en local (`NODE_ENV=production`), avec la base
de développement (quatre catégories publiées), et par la suite de tests automatisés (`npm test` : 110 tests).

| Critère | Résultat | Méthode et constat |
| --- | --- | --- |
| CA-01 — partie lancée en trois clics au plus depuis l'accueil | Conforme | Navigateur : les cartes de catégorie de l'accueil portent les boutons de niveau ; **un clic** ouvre la partie. |
| CA-02 — quatre catégories d'au moins 60 images sourcées et créditées | Conforme | Base : Monuments 69, Histoire 70, Drapeaux 75, Faune 64 ; aucun auteur, source ou licence manquant. Test `content.test.ts`. |
| CA-03 — trois niveaux jouables et lisibles sur mobile et écran large | Conforme en émulation | Difficile (60 cartes) : 110 px à 1366 × 900, grille entière visible (90–120 px exigés) ; 70 px à 820 px (tablette, 70–90 px) ; 69 px à 375 px, 5 colonnes, défilement vertical seul (56 px minimum, A-7). **Reste : essais sur terminaux réels** (risque R-2). |
| CA-04 — record enregistré, restitué et retrouvé depuis un autre terminal | Conforme | Test `me.test.ts` : record établi, déconnexion, connexion depuis un second client, record restitué et partie suivante comparée à lui. |
| CA-05 — jamais deux tirages identiques consécutifs | Conforme | Test `games.test.ts` (EF-1.8). |
| CA-06 — temps mesuré côté serveur, résultat invraisemblable rejeté | Conforme | Tests `games.test.ts` : durée serveur hors décompte et pauses, rejet sous 300 ms par paire, clôture unique, coups recomptés par rejeu. En navigateur, partie validée par le serveur (8 coups, 100 %). |
| CA-07 — partie complète au clavier | Conforme en partie | Navigateur : Tab atteint la grille (tabulation itinérante, une seule carte dans l'ordre de tabulation), flèches, Origine et Fin déplacent le focus, libellés « Carte 1, face cachée » annoncés. Les cartes sont des `<button>` natifs : Entrée et Espace les activent, mais l'outil d'automatisation ne produit pas cette activation native. **Reste : une partie jouée au clavier réel.** |
| CA-08 — aucune image chargée après le démarrage du chronomètre | Conforme | Navigateur, trafic relevé : 12 images avant le départ (4 vignettes de l'accueil, 8 images du tirage), **aucune** après. |
| CA-09 — aucun décalage de la grille en cours de partie | Conforme | Navigateur : aucun `layout-shift` relevé par `PerformanceObserver` du départ à la dernière paire. |
| CA-10 — export et suppression du compte depuis l'interface | Conforme | Tests `me.test.ts` (export JSON, suppression définitive) ; commandes présentes dans `/parametres`. |
| CA-11 — publication impossible sous la volumétrie minimale | Conforme | Test `admin.test.ts` (publication et suppression d'image bloquées sous le minimum). |
| CA-12 — crédits : auteur, source et licence de chaque image publiée | Conforme | Base et test `games.test.ts`. Libellés de licence harmonisés en français (migration `0003_licences`). |
| CA-13 — mentions légales et confidentialité accessibles depuis toutes les pages | Conforme sur la forme | Pied de page commun à toutes les routes, y compris la page 404 et la partie. **Reste : identité de l'éditeur, contact, hébergeur et prestataire de courriel** à renseigner dans `apps/web/src/legal/site.ts` (`npm run check:launch` bloque d'ici là). |

## Essais de jeu

Parties jouées au pointeur dans le navigateur, sur le build de production.

| Essai | Constat |
| --- | --- |
| Drapeaux, Normal (15 paires), écran large | Terminée en 16 coups, précision 94 % (15/16), temps serveur 1:33, pause de 0,5 s déduite. |
| Appariement incorrect | Coup compté, cartes marquées et annoncées (« Pas de paire : Seychelles et Pologne »), refermées après 900 ms ; un clic sur une troisième carte pendant ce délai est ignoré. |
| Même carte cliquée deux fois | Aucun coup compté (EF-1.4). |
| Pause et reprise | La pause masque la grille et donne le focus à « Reprendre » ; la touche P reprend la partie. |
| Rejouer | Nouvelle partie immédiate ; 3 images en commun seulement avec le tirage précédent (CA-05). |
| Rechargement en cours de partie | Message « Cette partie a été interrompue… » : la partie ne reprend pas. |
| Accueil après une partie | Raccourci « Rejouer · Drapeaux · Normal » avec le record de l'invité (§ 3.3). |
| Histoire, Facile, mobile 375 px | Cartes de 87 px, aucun défilement horizontal ; terminée en 8 coups, 100 %. |
| Abandon | Panneau de confirmation dans la page : partie suspendue, focus sur « Continuer la partie », Échap annule et reprend ; la confirmation ramène au choix du niveau, partie enregistrée « abandonnée ». |

Défaut corrigé à cette occasion : l'abandon passait par la boîte de dialogue native du navigateur, qui laissait courir le
chronomètre pendant l'hésitation du joueur.

## Vérifications complémentaires

- **Contrastes (WCAG 2.1 AA)** : texte courant ≥ 4,5:1 et contours de composants ≥ 3:1 dans les deux thèmes, après
  correction des bordures de champs, du contour du dos des cartes et des liserés « trouvée » et « erreur ».
- **Réduction des animations** : préférence système détectée et appliquée ; réglage du site disponible.
- **Référencement** : titres, descriptions, adresses canoniques, Open Graph, `robots.txt`, `sitemap.xml` (11 adresses),
  images de partage 1200 × 630 contrôlées visuellement ; 404 réelles pour les adresses inconnues.
- **Performance** : script principal de 106 Ko compressé, feuille de style de 6 Ko ; catégories jointes à la page et
  contenu lisible avant le chargement du script.
- **Audience** : vues comptées par gabarit de page, sans cookie ; aucune n'est comptée pour le back-office ni les robots.

## Reste à faire avant l'ouverture publique

1. Renseigner `apps/web/src/legal/site.ts`, puis `npm run check:launch`.
2. Choisir l'hébergeur, le prestataire SMTP et le nom de domaine ; construire l'image Docker et la déployer en recette
   (`APP_ENV=recette`).
3. Sur la recette : parcours d'inscription avec de vrais courriels (confirmation, réinitialisation), une partie au
   clavier réel, un passage au lecteur d'écran (NVDA ou VoiceOver), les trois niveaux sur un téléphone iOS et un Android.
4. Remplacer depuis le back-office les deux images jugées faibles lors de l'import : Cobra royal (serpent trop petit dans
   le cadre) et Pieuvre (gravure parmi des photographies).
5. Brancher une sonde de disponibilité externe sur `/api/health` et vérifier la première sauvegarde quotidienne.
