# 📋 Magic Links

**Magic Links** est une extension légère pour navigateur (conçue principalement pour Firefox en Manifest V3) qui permet d'extraire, nettoyer et structurer instantanément tous les liens utiles de la page active pour les transmettre à un assistant IA (comme ChatGPT, Gemini, Claude, NotebookLM, etc.).

Elle résout le problème du "bruit" et de la consommation inutile de tokens en filtrant les menus, publicités et barres latérales pour ne conserver que les liens pertinents.

---

## ✨ Fonctionnalités

*   **Extraction sélective (2 modes)** :
    *   **Contenu principal (par défaut)** : Utilise l'algorithme *Readability.js* pour extraire uniquement les liens présents dans le corps du texte (articles, posts de blog, documentation).
    *   **Complet** : Extrait l'intégralité des liens du DOM (`querySelectorAll('a')`).
*   **Nettoyage Intelligent** :
    *   Dédoublonnage automatique en conservant le premier titre descriptif trouvé.
    *   Exclusion automatique des ancres internes (`#`), scripts (`javascript:`), et protocoles non-web (`mailto:`, `tel:`).
*   **Tri par Pertinence (Scoring)** :
    *   Un algorithme attribue un score à chaque lien pour afficher et exporter en priorité les liens les plus descriptifs et contextuels.
*   **Filtrage & Structuration** :
    *   Recherche rapide (Fast Research) à la volée.
    *   Regroupement optionnel par nom de domaine.
*   **Exports Multi-formats** :
    *   **Texte brut** : Liste plate d'une URL par ligne (format optimisé pour le grounding dans les IA).
    *   **Markdown** : Liste à puces standard, structurée par domaines si le regroupement est activé.
    *   **CSV** : Liste structurée avec colonnes `Title, URL, Domain, Score, IsContent`.
    *   **JSON** : Format structuré plat ou hiérarchique par domaine.

---

## 🛠️ Installation (Firefox)

1. Télécharge ou clone ce dépôt sur ta machine.
2. Ouvre Firefox et saisis `about:debugging` dans la barre d'adresse.
3. Clique sur **"Ce Firefox"** dans le menu de gauche.
4. Clique sur **"Charger un module temporaire..."**.
5. Sélectionne le fichier `manifest.json` situé à la racine du dossier du projet.

---

## 📂 Structure du Projet

```text
magic-links/
├── manifest.json                  # Manifest de l'extension Firefox (MV3)
├── _locales/                      # Fichiers de localisation i18n
├── lib/
│   └── Readability.js             # Extraction du contenu principal de la page
├── src/
│   ├── content/
│   │   └── scanner.js             # Script de scan exécuté dans la page active
│   ├── popup/
│   │   ├── popup.html             # Interface utilisateur de la popup
│   │   ├── popup.css              # Design Glassmorphism
│   │   └── popup.js               # Contrôle et logique d'affichage/export
│   └── shared/
│       └── utils.js               # Fonctions utilitaires partagées
└── README.md                      # Ce document
```

---
*Développé par **MTF Karukera**. Découvre toutes les solutions logicielles et outils de productivité de la suite **magic-softs** sur [magic-clipper.mtfk.fr](https://magic-clipper.mtfk.fr/).*
