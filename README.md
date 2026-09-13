# RECTO — Retournez. Retenez.

Jeu de mémoire en ligne par catégories thématiques et niveaux de difficulté.
Le cahier des charges de référence est [docs/RECTO_Cahier-des-charges_v1.1.pdf](docs/RECTO_Cahier-des-charges_v1.1.pdf) (RECTO-CDC-001).

## Démarrage

```bash
npm install
cp apps/server/.env.example apps/server/.env   # puis renseigner AUTH_SECRET (32 caractères minimum)
npm run db:seed                                # catégorie Drapeaux
npm run content:commons:import                 # Monuments, Histoire, Faune, Espace (téléchargement depuis Commons)
npm run dev
```

Pour accéder au back-office, créez un compte sur le site puis donnez-lui le rôle administrateur :

```bash
npm run user:role -- votre@adresse.fr admin
```

Sans `SMTP_URL`, les courriels (vérification d'adresse, réinitialisation) ne partent pas : ils sont écrits dans
`apps/server/storage/mail/` et signalés dans la console du serveur.

- Interface : http://localhost:5173 — back-office : http://localhost:5173/admin
- API : http://localhost:4747 (variable `API_PORT` ; en production, `PORT`)

La base SQLite (`apps/server/data/`) et les images traitées (`apps/server/storage/`) sont des données locales,
non versionnées : les commandes ci-dessus les reconstruisent à partir des sources versionnées.

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur et interface en rechargement à chaud |
| `npm test` | Tests de tous les packages |
| `npm run test:e2e` | Tests de bout en bout (Playwright) sur le build de production ; `RECTO_E2E_BROWSER` = chemin d'un Chromium installé, Edge par défaut |
| `npm run typecheck` | Vérification des types de tous les packages |
| `npm run build` puis `npm start` | Build de production, servi par un seul processus |
| `npm run db:seed` | Charge et publie la catégorie Drapeaux |
| `npm run db:backup` | Sauvegarde immédiate de la base (le serveur en fait une par jour en production) |
| `npm run content:drapeaux` | Régénère les SVG et le manifeste des drapeaux |
| `npm run content:commons:resolve` | Relève fichiers, auteurs et licences Commons, sans téléchargement d'image ; `"--only=Article"` ne relève que les sujets cités |
| `npm run content:commons:import` | Télécharge et traite les images des listes verrouillées |
| `npm run content:commons:enrich` | Complète dates et lieux depuis Wikidata (métadonnées seules), sans écraser une saisie du back-office |
| `npm run user:role -- <adresse> <admin\|joueur>` | Attribue un rôle à un compte existant |
| `npm run check:launch [-- --env]` | Contrôle préalable à la mise en ligne : pages légales, puis variables d'environnement |

## Mise en ligne

L'application tient dans un seul processus Node, qui sert l'interface, l'API et les images. Base SQLite, images
traitées et sauvegardes vivent sur un même volume persistant (`/data` dans l'image). Ce choix tient dans une offre
de premier palier (§ 8.1) ; `DATABASE_URL=libsql://…` bascule vers une base libSQL distante sans changer le code.

### Avant la première mise en ligne

1. Renseigner l'identité de l'éditeur, le contact, l'hébergeur et le prestataire de courriel dans
   [apps/web/src/legal/site.ts](apps/web/src/legal/site.ts) : mentions légales, confidentialité et contact en dépendent.
2. Choisir un prestataire SMTP et réserver le nom de domaine.
3. `npm run check:launch` doit répondre « aucun point bloquant » ; sur le serveur, `npm run check:launch -- --env`.

### Serveur unique avec Docker et Caddy

[deploy/compose.yaml](deploy/compose.yaml) construit l'image ([Dockerfile](Dockerfile)) et place devant elle Caddy,
qui obtient et renouvelle le certificat HTTPS.

```bash
cp deploy/.env.example deploy/.env       # DOMAIN, APP_URL, AUTH_SECRET, SMTP_URL, MAIL_FROM
docker compose -f deploy/compose.yaml up -d --build
docker compose -f deploy/compose.yaml exec app node apps/server/dist/seed-drapeaux.js
docker compose -f deploy/compose.yaml exec app node apps/server/dist/commons-import.js
docker compose -f deploy/compose.yaml exec app node apps/server/dist/user-role.js votre@adresse.fr admin
```

Sur une plateforme d'hébergement de conteneurs, la même image suffit : monter un volume persistant sur `/data`,
définir les variables de [deploy/.env.example](deploy/.env.example), exposer le port 8080 et, si la plateforme
ajoute plusieurs mandataires, ajuster `TRUST_PROXY`.

### Environnements (§ 7.5)

- **Développement** : `npm run dev`, courriels écrits sur disque, aucune indexation.
- **Recette** : même image que la production avec `APP_ENV=recette` — le site se comporte comme en production mais
  `robots.txt` interdit tout et chaque réponse porte `X-Robots-Tag: noindex`.
- **Production** : `APP_ENV=production` (valeur par défaut quand `NODE_ENV=production`).

### Exploitation

- **Disponibilité** : `GET /api/health` répond `200 {"status":"ok"}` et vérifie la base ; à brancher sur une sonde
  externe (objectif de 99 % mensuel). L'image Docker l'utilise aussi comme `HEALTHCHECK`.
- **Journaux** : une ligne JSON par événement sur la sortie standard (erreurs serveur, erreurs remontées par les
  navigateurs, sauvegardes, purges). Ni adresse IP, ni cookie, ni paramètre d'adresse n'y figurent. Conserver
  trente jours au plus, comme l'annonce la politique de confidentialité.
- **Sauvegardes** : une copie cohérente de la base par jour dans `/data/backups`, trente jours de rétention. Elles
  partagent le volume de la base : copier régulièrement ce dossier ailleurs (instantané du volume, stockage objet).
  Restauration : arrêter le serveur, remplacer `recto.db` par la copie choisie, supprimer `recto.db-wal` et
  `recto.db-shm`, redémarrer. Les images téléversées depuis le back-office (`/data/media`) sont à sauvegarder avec
  le volume ; celles des catégories de lancement se reconstruisent à partir des sources versionnées.
- **Purges automatiques** : parties jouées sans compte après 12 mois, compteurs d'audience après 25 mois.

## Organisation

```
packages/shared            Règles du jeu et contrats d'API (tirage, rejeu des coups, publication, formats d'image)
apps/server/src            Express : catégories, parties, comptes, back-office, référencement, audience, maintenance
apps/server/drizzle        Migrations versionnées (Drizzle, SQLite)
apps/server/content        Sources du contenu : drapeaux générés, listes Commons verrouillées (*.lock.json)
apps/server/scripts        Génération des drapeaux, amorçage, import Commons, rôles, sauvegarde
apps/web                   React + Vite : jeu, comptes, pages légales, back-office (chargé à la demande)
deploy                     Composition Docker et Caddy pour un serveur unique
```

## Arbitrages retenus (§ 12)

- **A-2 / H-1** : Facile 8 paires (16 cartes), Normal 15 paires (30), Difficile 30 paires (60).
- **A-7** : sur mobile en portrait, grille recomposée verticalement avec défilement (5 colonnes en Difficile).
- **A-8** : plateforme durable ; stockages derrière des interfaces remplaçables.
- **Back-office** : réservé au rôle administrateur (EF-7.5), attribué par `npm run user:role`.
- **Reprise du mode invité (EF-4.4)** : seules les parties jouées sur le navigateur et validées par le serveur
  rejoignent le compte ; les records locaux, modifiables à volonté, ne font jamais foi (§ 5.4).
- **Authentification déléguée (A-6)** : non retenue en V1.
- **Contenu** : images principales Wikidata (P18) hébergées sur Wikimedia Commons ; seules les licences
  domaine public, CC0, CC BY et CC BY-SA sont admises, auteur obligatoire hors domaine public.
- **Mesure d'audience (ENF-6.4)** : compteurs de pages vues par jour, tenus par le serveur lui-même, sans cookie ni
  identifiant ni service tiers ; consultables dans le back-office (`/admin/audience`).

## État d'avancement

**Lot 1 — moteur de jeu** : terminé.

**Lot 2 — contenu** :

- Base de données (Drizzle, SQLite en local) : catégories, images, parties, derniers tirages.
- Chaîne d'images : recadrage carré sur la zone d'intérêt, 200 / 400 / 800 px en AVIF et WebP, budget de 25 Ko
  en 400 px (EF-3.10 à EF-3.13). Les SVG sont servis tels quels, sans contenu actif.
- Back-office `/admin` : catégories, téléversement, métadonnées pédagogiques, vignette, publication bloquée sous
  le minimum d'images et de groupes visuels de la difficulté la plus élevée (EF-7).
- Page de crédits générée à partir du contenu publié (ENF-8).
- Quatre catégories de lancement : Drapeaux (75), Monuments (70), Histoire (70), Faune (64).
- Limitation du débit : ouverture de parties (ENF-1.3), connexion au back-office (ENF-5.3).

**Lot 3 — comptes et records** :

- Inscription (adresse, pseudonyme public unique, mot de passe de 12 caractères, avatar, âge minimal de 15 ans),
  vérification de l'adresse et réinitialisation du mot de passe par liens à usage unique et durée limitée.
- Mots de passe hachés en Argon2id ; session JWT en cookie httpOnly SameSite=Lax, révocable par compte ;
  requêtes d'écriture d'une autre origine refusées ; cinq tentatives de connexion par minute et par adresse.
- Records par couple catégorie × difficulté mis à jour par le serveur à la clôture ; écran de résultat comparé au
  record du compte (EF-5.1) ; parties abandonnées comptées comme jouées, jamais dans les records (EF-1.6).
- Profil : statistiques, records, historique, reprise des parties invité ; paramètres : pseudonyme, avatar,
  mot de passe, export JSON et suppression définitive du compte (ENF-6.2, ENF-6.3).
- Proposition de compte juste après un résultat obtenu en invité (§ 3.2).

**Lot 4 — finitions et mise en ligne** :

- Réglages persistants, ouverts aux invités (EF-8.1) : sons de partie synthétisés (désactivés par défaut), thème
  sombre, clair ou selon le système (appliqué avant le premier affichage), réduction des animations — la préférence
  du système prévaut toujours —, langue (français ; dictionnaires typés prêts pour l'anglais, EF-8.4).
- Page « Comment jouer » en quatre écrans (EF-8.2) ; mentions légales, politique de confidentialité et contact
  accessibles depuis toutes les pages (EF-8.3, CA-13).
- Référencement (ENF-7) : titre, description, adresse canonique, Open Graph et données structurées servis avec chaque
  page ; contenu indexable et catégories jointes à l'accueil et aux pages de catégorie ; `robots.txt`, `sitemap.xml` ;
  image de partage 1200 × 630 composée pour chaque catégorie ; pages de compte et de partie non indexées.
- Performance (ENF-2.1) : compression, fichiers hachés mis en cache un an, catégories jointes à la page (aucun
  aller-retour avant le premier affichage), contenu lisible avant le chargement du script.
- Sécurité (ENF-5.1) : redirection HTTPS derrière mandataire, HSTS, politique de sécurité de contenu sans script en ligne.
- Exploitation (§ 7.5) : sonde `/api/health`, journaux JSON, erreurs des navigateurs remontées au serveur,
  sauvegarde quotidienne, purges aux durées annoncées, arrêt propre, image Docker et composition Caddy.

**Après le lot 4** :

- Écran de résultat : revue des cartes de la partie, avec légende, date et lieu (métadonnées complétées depuis
  Wikidata par `content:commons:enrich`).
- Cinquième catégorie, Espace (74 images de la NASA, de l'ESA et de Commons) ; images du cobra royal et de la pieuvre
  remplacées, Cité de Carcassonne ajoutée. Un sujet peut désormais imposer son fichier Commons (`file` dans
  `scripts/commons/subjects.ts`) ; l'import retire l'ancienne image une fois la nouvelle en place.
- Interface disponible en anglais depuis les paramètres (pages légales, back-office et contenu des cartes restent en
  français).
- Application installable (manifeste, icônes, service worker) avec page hors ligne ; courriels de service en HTML et en
  texte.
- Clôture de partie rejouable sur réseau instable ; pause automatique quand l'onglet est quitté.
- Tests de bout en bout Playwright (`npm run test:e2e`).

Restent à décider avant l'ouverture publique : hébergeur, prestataire SMTP, nom de domaine et identité de l'éditeur
(voir « Avant la première mise en ligne »), puis la recette des critères CA-01 à CA-13 sur l'environnement de recette
et sur des terminaux réels. Le procès-verbal de la recette locale et la liste des vérifications restantes figurent dans
[docs/recette.md](docs/recette.md).

Écart assumé par rapport au § 5.2 : les colonnes `url_200`, `url_400`, `url_800` sont remplacées par un préfixe de
stockage et une nature (vectorielle ou matricielle), dont l'API dérive les six adresses.
