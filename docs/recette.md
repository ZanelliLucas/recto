# Recette de la version 1 — critères d'acceptation (§ 11)

Recette menée le 13 septembre 2026 sur le build de production servi en local (`NODE_ENV=production`), avec la base
de développement (quatre catégories publiées), et par la suite de tests automatisés (`npm test` : 110 tests).

| Critère | Résultat | Méthode et constat |
| --- | --- | --- |
| CA-01 — partie lancée en trois clics au plus depuis l'accueil | Conforme | Navigateur : les cartes de catégorie de l'accueil portent les boutons de niveau ; **un clic** ouvre la partie. |
| CA-02 — quatre catégories d'au moins 60 images sourcées et créditées | Conforme | Base : Monuments 70, Histoire 70, Drapeaux 75, Faune 64, et Espace 74 ajoutée depuis ; aucun auteur, source ou licence manquant. Test `content.test.ts`. |
| CA-03 — trois niveaux jouables et lisibles sur mobile et écran large | Conforme en émulation | Difficile (60 cartes) : 110 px à 1366 × 900, grille entière visible (90–120 px exigés) ; 70 px à 820 px (tablette, 70–90 px) ; 69 px à 375 px, 5 colonnes, défilement vertical seul (56 px minimum, A-7). **Reste : essais sur terminaux réels** (risque R-2). |
| CA-04 — record enregistré, restitué et retrouvé depuis un autre terminal | Conforme | Test `me.test.ts` : record établi, déconnexion, connexion depuis un second client, record restitué et partie suivante comparée à lui. |
| CA-05 — jamais deux tirages identiques consécutifs | Conforme | Test `games.test.ts` (EF-1.8). |
| CA-06 — temps mesuré côté serveur, résultat invraisemblable rejeté | Conforme | Tests `games.test.ts` : durée serveur hors décompte et pauses, rejet sous 300 ms par paire, clôture unique, coups recomptés par rejeu. En navigateur, partie validée par le serveur (8 coups, 100 %). |
| CA-07 — partie complète au clavier | Conforme | Test de bout en bout (Playwright, frappes réelles) : Tab atteint la grille (tabulation itinérante), Origine et flèches déplacent le focus, Entrée et Espace retournent les cartes ; la partie est validée par le serveur et l'écran de résultat s'affiche. |
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

## Tests de bout en bout

`npm run test:e2e` (Playwright) rejoue sur le build de production, en format bureau et mobile : une partie complète au
clavier jusqu'à l'écran de résultat et la revue des cartes, l'abandon confirmé dans la page, la pause automatique quand
l'onglet est quitté, la grille Difficile sur mobile (cartes de 56 px au moins, sans défilement horizontal), la galerie
des cartes d'une catégorie, le passage à l'anglais, l'installation de l'application, la présence des liens légaux sur
toutes les pages, et un audit axe-core sans aucune violation WCAG 2.1 A/AA sur les pages principales. Aucun navigateur n'est téléchargé : `RECTO_E2E_BROWSER` désigne un
Chromium installé, Microsoft Edge à défaut.

## Vérifications complémentaires

- **Contrastes (WCAG 2.1 AA)** : texte courant ≥ 4,5:1 et contours de composants ≥ 3:1 dans les deux thèmes, après
  correction des bordures de champs, du contour du dos des cartes et des liserés « trouvée » et « erreur ».
- **Réduction des animations** : préférence système détectée et appliquée ; réglage du site disponible.
- **Référencement** : titres, descriptions, adresses canoniques, Open Graph, `robots.txt`, `sitemap.xml` (11 adresses),
  images de partage 1200 × 630 contrôlées visuellement ; 404 réelles pour les adresses inconnues.
- **Accessibilité automatisée (axe-core, WCAG 2.1 A/AA et bonnes pratiques)** : aucune violation sur l'accueil, les
  catégories, le choix du niveau, la partie (en cours, en pause, panneau d'abandon), l'aide, les paramètres, la connexion,
  l'inscription, les crédits, les pages légales, le contact et la page 404, après correction de trois défauts : ordre des
  titres de la page Catégories, tableau défilant de la politique de confidentialité inatteignable au clavier, titre de
  niveau 1 absent de la partie.
- **Performance** : environ 100 Ko de script compressé au premier affichage (script principal, dictionnaire, client
  d'API), feuille de style de 5 Ko ; les écrans hors parcours de jeu (comptes, aide, crédits, pages légales,
  back-office) sont chargés à la demande. Catégories jointes à la page et contenu lisible avant le chargement du script.
- **Réseau instable** : la clôture d'une partie est rejouable côté serveur (même réponse, rien n'est recompté) ; le
  client la retente sur coupure ou panne passagère, puis propose « Réessayer la validation » sans perdre la partie.
- **Équité du chronomètre** : la partie ne démarre côté serveur qu'une fois l'onglet visible, et se met en pause
  d'elle-même si le joueur quitte l'onglet en cours de partie.
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

## Défi du jour

- Ouvrir l'accueil : le panneau annonce une catégorie et propose quinze paires.
- Ouvrir la même page dans une seconde fenêtre privée : la catégorie annoncée doit être la même.
- Lancer le défi depuis les deux fenêtres : les deux grilles portent les mêmes images aux mêmes places.
- Terminer une partie avec un compte : le pseudonyme apparaît au classement, temps et coups à l'appui.
- Rejouer le défi avec ce compte : le classement ne bouge pas, seule la première partie du jour compte.
- Terminer le défi sans compte : la partie se joue, mais aucune ligne n'apparaît au classement.
