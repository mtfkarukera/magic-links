# 🔒 Politique de Confidentialité / Privacy Policy — Magic Links

**Dernière mise à jour** : 29 septembre 2026  
**Éditeur / Développeur** : MTF Karukera  
**Contact** : contact@mtfk.fr  

---

## Version Française

### 1. Philosophie et Respect de la Vie Privée
L'extension **Magic Links** a été conçue selon le principe du strict respect de la vie privée (*Privacy by Design*). Elle fonctionne de manière **100 % locale** dans votre navigateur Firefox. Aucune donnée personnelle, aucun historique de navigation, aucune adresse IP et aucun lien extrait ne sont collectés, stockés sur un serveur distant ou transmis à des tiers.

### 2. Données Traitées
- **URL et contenu de la page active** : Lorsque vous ouvrez la popup de l'extension, celle-ci inspecte temporairement le DOM de l'onglet actif pour en extraire les liens hypertextes (`<a>`). Cette analyse s'exécute exclusivement en mémoire vive sur votre appareil. Dès la fermeture de la popup, ces données sont immédiatement libérées.
- **Zéro télémétrie** : L'extension ne contient aucun outil de suivi, d'analyse statistique ou de télémétrie (Google Analytics, Sentry, Mixpanel, etc.).
- **Zéro serveur externe** : L'extension n'établit aucune connexion réseau sortante vers des serveurs externes.

### 3. Justification des Permissions Déclarées
L'extension utilise uniquement les permissions strictement nécessaires à son fonctionnement :
- `activeTab` : Permet d'accéder temporairement à l'onglet en cours de consultation uniquement lorsque vous cliquez sur l'icône de l'extension.
- `scripting` : Permet d'injecter localement les scripts d'analyse (`Readability.js` et `scanner.js`) dans l'onglet actif.
- `clipboardWrite` : Permet de copier la liste de liens formatée dans votre presse-papiers lorsque vous cliquez sur le bouton « Copier ».

---

## English Version

### 1. Privacy First Commitment
The **Magic Links** extension is designed with a strict *Privacy by Design* approach. It operates **100% locally** within your Firefox browser. No personal data, browsing history, IP address, or extracted link is collected, stored on remote servers, or transmitted to any third party.

### 2. Data Processing
- **Active tab URL and content**: When you open the extension popup, it temporarily inspects the DOM of the active tab to extract hyperlinks (`<a>`). This analysis runs entirely in memory on your device. Once the popup is closed, this data is immediately discarded.
- **Zero telemetry**: The extension contains no tracking, telemetry, or analytics libraries.
- **Zero remote calls**: The extension makes zero outgoing network requests to external servers.

### 3. Permission Justifications
The extension requests only the minimum permissions required:
- `activeTab`: Temporarily grants access to the current active tab only when you click the extension icon.
- `scripting`: Required to inject the local content scripts (`Readability.js` and `scanner.js`) into the active tab for link extraction.
- `clipboardWrite`: Allows copying the formatted link list directly to your clipboard upon clicking the "Copy" button.
