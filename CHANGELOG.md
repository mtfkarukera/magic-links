# 📓 Journal des Modifications (Changelog) — Magic Links

Toutes les modifications notables apportées à ce projet seront documentées dans ce fichier. Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/) et ce projet respecte le [Versionnage Sémantique](https://semver.org/lang/fr/).

---

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
