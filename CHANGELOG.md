# 📓 Journal des Modifications (Changelog) — Magic Links

Toutes les modifications notables apportées à ce projet seront documentées dans ce fichier. Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/) et ce projet respecte le [Versionnage Sémantique](https://semver.org/lang/fr/).

---

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
