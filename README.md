# RECTO — Retournez. Retenez.

Jeu de mémoire en ligne par catégories thématiques et niveaux de difficulté.
Le cahier des charges de référence est [docs/RECTO_Cahier-des-charges_v1.1.pdf](docs/RECTO_Cahier-des-charges_v1.1.pdf) (RECTO-CDC-001).

## Démarrage

```bash
npm install
npm run dev
```

- Interface : http://localhost:5173
- API : http://localhost:4747 (variable `API_PORT` ; en production, `PORT`)

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur et interface en rechargement à chaud |
| `npm test` | Tests de tous les packages |
| `npm run typecheck` | Vérification des types de tous les packages |
| `npm run build` puis `npm start` | Build de production, servi par un seul processus |
| `npm run content:drapeaux` | Régénère les SVG et le manifeste de la catégorie Drapeaux |

## Organisation

```
packages/shared   Règles du jeu et contrats d'API communs (tirage, mélange, rejeu des coups, vraisemblance)
apps/server       Express : catégories, cycle de vie des parties, chronométrage serveur
apps/server/content   Contenu intégré au lot 1 (manifeste + images par catégorie)
apps/web          React + Vite : accueil, catégories, niveaux, plateau, résultat
```

## Arbitrages retenus (§ 12)

- **A-2 / H-1** : Facile 8 paires (16 cartes), Normal 15 paires (30), Difficile 30 paires (60).
- **A-7** : sur mobile en portrait, grille recomposée verticalement avec défilement (5 colonnes en Difficile, cartes de 56 px minimum).
- **A-8** : plateforme durable ; le stockage passe par des interfaces que le lot 2 implémentera en base.

## État d'avancement

**Lot 1 — moteur de jeu** : plateau jouable de bout en bout sur la catégorie Drapeaux (75 drapeaux, 56 groupes visuels).

- Tirage aléatoire à graine, sans deux images d'un même groupe visuel (EF-3.9) et jamais identique au précédent (EF-1.8).
- Préchargement intégral puis décompte de 3 s ; le chronomètre part à la fin du décompte (ENF-2.2).
- Temps mesuré par le serveur, pauses déduites ; le client n'envoie que ses coups, que le serveur rejoue (ENF-1.1, ENF-1.2).
- Pause avec grille masquée, abandon, avertissement avant fermeture de l'onglet (EF-1.5 à EF-1.7).
- Navigation complète au clavier, libellés d'état, réduction des animations (ENF-4).
- Records en mode invité conservés dans le navigateur, écart signé au record sur l'écran de résultat (EF-5.1).

Écart assumé par rapport au § 5.3 : `POST /api/games` prépare la partie et `POST /api/games/:id/start` pose
l'horodatage de départ une fois les images préchargées, pour que le temps de chargement ne soit jamais compté au joueur.

Les drapeaux sont des tracés vectoriels originaux des dessins officiels (domaine public), en proportions
normalisées 3:2 ; chaque image référence sa page Wikimedia Commons dans le manifeste (ENF-8).
