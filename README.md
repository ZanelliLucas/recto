# RECTO — Retournez. Retenez.

Jeu de mémoire en ligne par catégories thématiques et niveaux de difficulté.
Le cahier des charges de référence est [docs/RECTO_Cahier-des-charges_v1.1.pdf](docs/RECTO_Cahier-des-charges_v1.1.pdf) (RECTO-CDC-001).

## Démarrage

```bash
npm install
cp apps/server/.env.example apps/server/.env   # puis renseigner AUTH_SECRET (32 caractères minimum)
npm run db:seed                                # catégorie Drapeaux
npm run content:commons:import                 # Monuments, Histoire, Faune (téléchargement depuis Commons)
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
| `npm run typecheck` | Vérification des types de tous les packages |
| `npm run build` puis `npm start` | Build de production, servi par un seul processus |
| `npm run db:seed` | Charge et publie la catégorie Drapeaux |
| `npm run content:drapeaux` | Régénère les SVG et le manifeste des drapeaux |
| `npm run content:commons:resolve` | Relève fichiers, auteurs et licences Commons, sans téléchargement d'image |
| `npm run content:commons:import` | Télécharge et traite les images des listes verrouillées |
| `npm run user:role -- <adresse> <admin\|joueur>` | Attribue un rôle à un compte existant |

## Organisation

```
packages/shared            Règles du jeu et contrats d'API (tirage, rejeu des coups, publication, formats d'image)
apps/server/src            Express : catégories, parties, back-office, crédits
apps/server/drizzle        Migrations versionnées (Drizzle, SQLite)
apps/server/content        Sources du contenu : drapeaux générés, listes Commons verrouillées (*.lock.json)
apps/server/scripts        Génération des drapeaux, amorçage, import Commons
apps/web                   React + Vite : jeu, crédits, back-office (chargé à la demande)
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

Écart assumé par rapport au § 5.2 : les colonnes `url_200`, `url_400`, `url_800` sont remplacées par un préfixe de
stockage et une nature (vectorielle ou matricielle), dont l'API dérive les six adresses.
