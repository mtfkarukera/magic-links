# 📓 Journal des Modifications (Changelog) — Magic Links

Toutes les modifications notables apportées à ce projet seront documentées dans ce fichier. Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/) et ce projet respecte le [Versionnage Sémantique](https://semver.org/lang/fr/).

---

## [1.0.4] - 2026-07-05

### Corrigé
- **Accessibilité WCAG 2.1 AA** :
  - Ajout d'un label accessible masqué pour la barre de recherche (`search-input`).
  - Ajout d'un attribut `aria-label` et de styles `:focus-visible` pour le bouton d'effacement de la recherche (`#clear-search`).
  - Ajout de styles `:focus-visible` bien visibles pour les boutons d'action d'exportation (`.action-btn`).
  - Correction de l'ordre de priorité de la propriété `font-family` dans le CSS pour charger correctement les polices *Outfit* et *Inter* embarquées à la place des polices système.
- **Robustesse & Performance** :
  - Remplacement de la méthode destructrice `cloneNode` du Toast par un reflow forcé via `offsetWidth` afin de préserver l'annonce `aria-live` pour les lecteurs d'écran et d'éliminer le bug d'affichage infini.
  - Ajout d'un verrou `isScanning` et désactivation des opérations de filtres/toggles durant le scan pour éliminer tout conflit d'affichage.
  - Correction de l'heuristique de détection PDF pour exclure les faux positifs des URLs ordinaires contenant la chaîne `viewer.html` en restreignant à `pdf.js/web/viewer.html`.
  - Sécurisation du processus d'injection asynchrone : arrêt de l'analyse avec `return` si l'injection de `Readability.js` échoue, et vérification de la cohérence de l'onglet actif (ID et URL) entre les injections pour parer aux navigations rapides de l'utilisateur.
  - Ajout de styles `:disabled` pour les boutons d'exportation.

## [1.0.3] - 2026-07-04

### Ajouté
- Accordéons de domaines (Pliage/Dépliage) :
  - Utilisation des balises HTML5 natives `<details>` et `<summary>` pour masquer ou afficher la liste de liens d'un domaine d'un clic.
  - Flèche rotative animée (`▼` vers `▶`) avec transition CSS fluide lors du pliage/dépliage.
  - Prise en charge complète de la navigation clavier native (Espace/Entrée) et styles de focus visibles pour l'accessibilité.
  - Neutralisation de la propagation du clic sur la checkbox de domaine afin d'éviter le pliage ou dépliage involontaire lors de la sélection.

## [1.0.2] - 2026-07-04

### Ajouté
- Fonctionnalité de sélection interactive de liens pour l'exportation :
  - Checkbox globale pour tout cocher ou tout décocher (avec prise en charge de l'état partiel "indeterminate" de HTML5).
  - Checkboxes par domaine pour cocher ou décocher l'ensemble des liens issus d'un même domaine en un seul clic.
  - Checkboxes individuelles sur chaque élément de lien pour personnaliser précisément le lot de liens à copier ou à télécharger.
  - Mise à jour dynamique du compteur de résultats pour refléter la sélection (ex: `12 / 87 liens trouvés`).
  - Grisement visuel des éléments désélectionnés (opacité réduite à 45%) et masquage des effets au survol pour un meilleur confort visuel.

## [1.0.1] - 2026-07-04

### Modifié
- Remplacement de l'icône de l'extension par un nouveau design flat-design premium (`icone-magic-links.png`) représentant des blocs de données textuels et une chaîne de lien sous l'action d'une baguette magique.
- Régénération de l'ensemble des déclinaisons de tailles d'icônes (`icon_16.png`, `icon_32.png`, `icon_48.png`, `icon_128.png`, `logo_full.png`).
- Agrandissement des dimensions de la popup à 380x580px (gain de 100px de hauteur utile) et densification visuelle des items de liens afin d'afficher 4 à 5 liens simultanément (au lieu d'à peine 1,5 précédemment).

### Corrigé
- Erreur de syntaxe CSS (accolade fermante de media query manquante) qui empêchait le chargement de tout le style de la popup sur les systèmes configurés en mode clair (Light Mode).

## [1.0.0] - 2026-06-30

### Ajouté
- Initialisation de la structure du projet standardisé (`README.md`, `ARCHITECTURE.md`, `AGENTS.md`, `CHANGELOG.md`, `.gitignore`).
- Déclaration du manifest de l'extension Firefox (MV3) avec les permissions minimales `activeTab`, `scripting`, `clipboardWrite`.
- Support d'internationalisation i18n pour 7 langues (`en`, `fr`, `de`, `es`, `vi`, `ja`, `pt`).
- Intégration de la bibliothèque de parsing `Readability.js` de Mozilla.
- Script de scan dynamique `scanner.js` avec scoring de pertinence et nettoyage automatique des liens.
- Interface Popup Glassmorphism (`popup.html` / `popup.css`) avec Fast Research, bouton bascule de mode et regroupement par domaine.
- Logique de contrôle `popup.js` prenant en charge l'export plat (une URL par ligne, CSV, JSON) et structuré (Markdown, JSON).

### Corrigé (Audit Sprint 2)
- Spinner CSS de chargement brisé (remplacement de `stroke` par `solid`).
- Sécurisation de l'ouverture d'onglets via `browser.tabs.create` (validation explicite HTTP/HTTPS).
- Prévention contre les fuites de fichiers internes (exclusion de `submission_kit.md`, `audit_report.md`, `walkthrough.md` et `task.md` dans `.gitignore`).
- Améliorations majeures d'accessibilité (contrôles masqués clavier-accessibles, focus-visible compatible Windows HCM, aria-live sur les compteurs et les toasts, aria-hidden sur les SVG décoratifs, fieldset/legend sémantique).
- Améliorations de robustesse (debounce de 150ms sur la recherche, limite d'affichage DOM à 200 éléments, gestion explicite des pages PDF et Mode Lecture, vérification de l'injection Readability.js, correction des timers de toast).
- Auto-hébergement local des polices premium (Outfit et Inter) via `@font-face` pour respecter la CSP et la vie privée.
