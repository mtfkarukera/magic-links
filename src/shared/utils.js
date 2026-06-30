// utils.js : Fonctions utilitaires partagées — MTF Karukera

/**
 * Résout une clé i18n en chaîne traduite via browser.i18n.
 *
 * @param  {string}              key            - Clé de traduction.
 * @param  {string|Array<string>} [substitutions=null] - Substitutions optionnelles.
 * @returns {string} - Chaîne traduite, ou la clé elle-même si introuvable.
 */
export function t(key, substitutions = null) {
  const msg = browser.i18n.getMessage(key, substitutions);
  if (!msg) {
    console.warn('[ML] Clé i18n manquante :', key);
    return key;
  }
  return msg;
}

/**
 * Applique les traductions aux éléments HTML du DOM disposant de l'attribut data-i18n.
 */
export function applyI18n() {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    const message = t(key);
    
    // Si un attribut cible est défini (ex: data-i18n-attr="placeholder")
    const targetAttr = el.getAttribute('data-i18n-attr');
    if (targetAttr) {
      el.setAttribute(targetAttr, message);
    } else {
      el.textContent = message;
    }
  });
}

/**
 * Extrait le nom de domaine à partir d'une URL.
 *
 * @param {string} url - URL à parser.
 * @returns {string} - Nom de domaine ou 'inconnu'.
 */
export function getDomain(url) {
  try {
    const urlObj = new URL(url);
    // Nettoyage éventuel du 'www.' pour une meilleure lisibilité
    return urlObj.hostname.replace(/^www\./i, '');
  } catch (e) {
    return 'inconnu';
  }
}

/**
 * Échappe une chaîne de caractères pour un champ de fichier CSV.
 *
 * @param {string|number|boolean} val - Valeur à échapper.
 * @returns {string} - Valeur formatée pour le CSV.
 */
export function escapeCSV(val) {
  if (val === undefined || val === null) return '';
  let str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes(';') || str.includes('\n') || str.includes('\r')) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Échappe le texte pour éviter de corrompre la structure d'un lien Markdown [Text](URL).
 *
 * @param {string} text - Texte du lien.
 * @returns {string} - Texte nettoyé.
 */
export function escapeMarkdownText(text) {
  if (!text) return '';
  // Échappe les caractères Markdown actifs : [, ], (, ), `, *, _, <, >, \
  return text.replace(/[\[\]\`\*\_<>\(\)\\]/g, '\\$&');
}

// Fin des utilitaires partagés — MTF Karukera
