# Carnet de bord — guide d'installation

Application web locale (PWA) pour consigner tes activités quotidiennes
(horaires, catégorie, description libre) et les consulter dans un tableau
de bord avec histogrammes. **Toutes les données restent uniquement dans le
navigateur de ton téléphone** (`localStorage`) — rien n'est envoyé où que
ce soit, il n'y a même pas de connexion réseau utilisée par l'application.

## Option A — Installation immédiate, sans rien héberger (2 minutes)

1. Transfère tout le dossier `carnet-de-bord/` sur ton téléphone Android
   (par mail à toi-même, clé USB, Google Drive, Nextcloud… peu importe,
   du moment que les 7 fichiers restent ensemble dans le même dossier).
2. Avec un gestionnaire de fichiers Android (ou l'appli "Fichiers"), ouvre
   `index.html` avec **Chrome**.
3. Menu ⋮ de Chrome → **Ajouter à l'écran d'accueil**.
4. Une icône "Carnet de bord" apparaît sur ton écran d'accueil.

Limite de cette option : comme la page est ouverte en `file://` (pas de
serveur), Chrome ne peut pas activer le mode PWA "plein écran" complet ni
le service worker — l'appli s'ouvrira dans un onglet Chrome minimal. Ce
n'est pas gênant pour l'usage (tout fonctionne, y compris hors-ligne
puisqu'il n'y a aucun appel réseau), c'est juste un peu moins "app native"
visuellement.

## Option B — PWA installable à 100% (recommandé, ~10 minutes)

Pour obtenir l'icône plein écran + le vrai comportement "application"
(barre de statut colorée, pas de barre d'adresse), il faut que les
fichiers soient servis en `https://`. Le plus simple et gratuit sans
compétences serveur : **GitHub Pages**.

1. Crée un dépôt GitHub (public ou privé) et pousse-y le contenu du
   dossier `carnet-de-bord/` (les 7 fichiers, à la racine du dépôt).
2. Dans les paramètres du dépôt → **Pages** → source : branche
   principale, dossier `/root`. Attends 1–2 minutes.
3. Ouvre l'URL fournie (`https://ton-compte.github.io/ton-depot/`) dans
   Chrome sur ton téléphone.
4. Menu ⋮ → **Installer l'application** (ou **Ajouter à l'écran
   d'accueil**) : cette fois le mode `standalone` s'active pleinement.

Important : même hébergée, l'application n'envoie aucune donnée au
serveur. GitHub Pages ne sert que le code (HTML/CSS/JS statiques) ; tes
entrées d'activité restent exclusivement dans le stockage local de ton
navigateur, sur ton téléphone.

## Contenu du dossier

| Fichier | Rôle |
|---|---|
| `index.html` | structure de l'app (écran Saisie + écran Bord) |
| `style.css` | apparence (thème "carnet de terrain") |
| `app.js` | toute la logique : stockage, formulaire, calculs, graphique |
| `manifest.json` | déclaration PWA (nom, icônes, couleurs) |
| `sw.js` | service worker (cache offline, actif seulement en https/localhost) |
| `icon-192.png`, `icon-512.png`, `icon-180-maskable.png` | icônes |
| `fonts/` | police JetBrains Mono (heures/dates) + sa licence |

## Utilisation

- **Onglet Saisie** : date, heure de début / fin, catégorie (liste
  déroulante, avec un choix "+ Nouvelle catégorie…" pour en créer une à la
  volée), description en texte libre. Un aperçu de la durée s'affiche en
  direct.
- **Onglet Bord** : filtre par période (Aujourd'hui / 7 jours / Ce mois /
  Tout), total de temps consigné, histogramme du temps par catégorie, puis
  la liste chronologique des activités groupées par jour. Toucher une
  activité l'ouvre en modification (et permet de la supprimer). En bas,
  la carte "Données" (export/sauvegarde, voir plus bas).
- **Onglet Réglages** : gestion des catégories (renommer, changer la
  couleur — voir plus bas).

## Gérer les catégories (renommer, changer la couleur)

Dans l'onglet **Réglages**, la carte "Catégories" liste toutes les catégories
existantes. Touche-en une pour déplier son éditeur :

- **Renommer** : modifie le champ "Nom" puis "Enregistrer" — toutes les
  activités déjà saisies avec l'ancien nom basculent automatiquement sur
  le nouveau.
- **Cas particulier — fusion** : si tu renommes une catégorie avec le nom
  d'une catégorie qui existe déjà, l'appli te demande confirmation puis
  fusionne les deux (toutes les activités des deux anciennes catégories
  se retrouvent sous le nom commun).
- **Couleur** : choisis une des 16 pastilles de la palette (large éventail
  de teintes, plus vives que la version précédente), ou utilise le
  sélecteur personnalisé (dernier rond) pour une couleur totalement libre.
  Elle s'applique immédiatement au point de couleur dans la liste et à la
  barre dans l'histogramme. Le texte des étiquettes reste toujours en
  encre foncée pour rester lisible quelle que soit la couleur choisie.

## Récapitulatif journalier repliable

Dès que la période "7 jours", "Ce mois" ou "Tout" est sélectionnée dans
l'onglet Bord, chaque jour s'affiche replié par défaut (juste la date et
le total d'heures). Touche l'en-tête d'un jour pour déplier le détail des
activités de ce jour. En "Aujourd'hui", l'unique journée reste affichée
en clair, sans repli.

## Police des heures et durées

Les heures, durées et dates utilisent désormais la police **JetBrains
Mono** (chiffres alignés, bien plus lisible que la police monospace par
défaut du téléphone), intégrée au projet dans le dossier `fonts/`
(licence libre SIL Open Font License — voir `fonts/JetBrainsMono-OFL.txt`).
Elle est mise en cache par le service worker au même titre que le reste,
donc aucune connexion réseau n'est nécessaire après le premier chargement.

## Export CSV et sauvegarde JSON

Dans l'onglet **Bord**, sous la liste des activités, une carte "Données"
propose trois actions :

- **Exporter en CSV** : exporte les activités de la période actuellement
  affichée (Aujourd'hui / 7 jours / Ce mois / Tout), au format `.csv`
  compatible Excel (séparateur `;`, encodage UTF‑8 avec BOM pour que les
  accents s'affichent correctement).
- **Sauvegarder (JSON)** : télécharge une sauvegarde complète (toutes les
  activités + toutes les catégories), quelle que soit la période
  affichée. À conserver précieusement (mail à toi-même, Drive, etc.) —
  c'est le seul moyen de récupérer tes données si tu changes de
  téléphone ou vides le cache du navigateur.
- **Restaurer…** : sélectionne un fichier de sauvegarde `.json` produit
  par le bouton ci-dessus. La restauration **fusionne** avec les données
  déjà présentes : les activités dont l'identifiant existe déjà sont
  ignorées (aucune donnée n'est écrasée), les nouvelles sont ajoutées, et
  les catégories manquantes sont créées automatiquement.

## Personnalisation facile

- **Catégories par défaut** : modifiables dans `app.js`, constante
  `DEFAULT_CATS` en haut du fichier. Tu peux aussi simplement en ajouter
  depuis l'appli — pas besoin de toucher au code.
- **Couleurs** : variables CSS en haut de `style.css` (`:root { --accent:
  ... }`).
- **Export / sauvegarde des données** : voir la section "Export CSV et
  sauvegarde JSON" ci-dessus.
