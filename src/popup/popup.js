// popup.js : Logique et interaction utilisateur — MTF Karukera

import { t, applyI18n, escapeCSV, escapeMarkdownText } from '../shared/utils.js';

// Variables globales de l'application
let allLinks = [];
let filteredLinks = [];
let readabilityActive = false;
let activeTab = null;
let toastTimer = null;
let searchDebounceTimer = null;

// Éléments du DOM
const modeContentRadio = document.getElementById('mode-content');
const modeFullRadio = document.getElementById('mode-full');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const groupDomainCheckbox = document.getElementById('group-domain-checkbox');
const resultsCounter = document.getElementById('results-counter');
const resultsList = document.getElementById('results-list');
const resultsFallback = document.getElementById('results-fallback');
const exportFormatSelect = document.getElementById('export-format');
const btnCopy = document.getElementById('btn-copy');
const btnDownload = document.getElementById('btn-download');
let toastEl = document.getElementById('toast');

/**
 * Initialisation au chargement de la popup
 */
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Traduction de l'UI
  applyI18n();

  // 2. Écouteurs d'événements
  modeContentRadio.addEventListener('change', handleModeOrFilterChange);
  modeFullRadio.addEventListener('change', handleModeOrFilterChange);
  searchInput.addEventListener('input', handleSearchInput);
  clearSearchBtn.addEventListener('click', handleClearSearch);
  groupDomainCheckbox.addEventListener('change', handleModeOrFilterChange);
  btnCopy.addEventListener('click', handleCopy);
  btnDownload.addEventListener('click', handleDownload);

  // 3. Scan de l'onglet actif
  await scanActiveTab();
});

/**
 * Scan de la page active et extraction des liens
 */
async function scanActiveTab() {
  showLoader();
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    activeTab = tabs[0];

    if (!activeTab || !activeTab.url) {
      showEmptyState('noLinksFound', 'fallbackSuggestion');
      return;
    }

    // Protection contre les pages système, fichiers PDF et le Mode Lecture (MTF Karukera)
    const isWebPage = activeTab.url.startsWith('http://') || activeTab.url.startsWith('https://');
    const isPDF = activeTab.url.toLowerCase().endsWith('.pdf') || activeTab.url.includes('viewer.html');
    const isReaderMode = activeTab.url.startsWith('about:reader');
    if (!isWebPage || isPDF || isReaderMode) {
      showEmptyState('pageNotSupported', '');
      return;
    }

    // 1. Injection séquentielle de Readability.js
    const readabilityResult = await browser.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: ['/lib/Readability.js']
    });

    if (!readabilityResult || !readabilityResult[0]) {
      console.warn('[ML] Readability.js non injecté correctement.');
    }

    // 2. Injection du scanner de liens
    const scanResults = await browser.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: ['/src/content/scanner.js']
    });

    if (scanResults && scanResults[0] && scanResults[0].result) {
      const data = scanResults[0].result;
      allLinks = data.links || [];
      readabilityActive = data.readabilityActive || false;
      
      // S'il n'y a aucun lien détecté dans le contenu de l'article,
      // on bascule automatiquement vers le mode complet pour ne pas afficher une liste vide.
      if (allLinks.filter(l => l.isContent).length === 0) {
        modeFullRadio.checked = true;
      }
      
      handleModeOrFilterChange();
    } else {
      showEmptyState('noLinksFound', 'fallbackSuggestion');
    }
  } catch (err) {
    console.error('[ML] Erreur lors de l\'analyse de la page :', err.message);
    showEmptyState('noLinksFound', 'fallbackSuggestion');
  }
}

/**
 * Gestion du changement de mode (Toggle) ou d'options (Groupement)
 */
function handleModeOrFilterChange() {
  const mode = document.querySelector('input[name="capture-mode"]:checked').value;
  const searchVal = searchInput.value.toLowerCase().trim();
  
  // 1. Filtrage par mode (Contenu principal vs Tous)
  let items = allLinks;
  if (mode === 'content') {
    items = allLinks.filter(l => l.isContent);
  }

  // 2. Filtrage par recherche textuelle (Fast Research)
  if (searchVal) {
    items = items.filter(l => 
      l.title.toLowerCase().includes(searchVal) || 
      l.url.toLowerCase().includes(searchVal) ||
      l.domain.toLowerCase().includes(searchVal)
    );
  }

  filteredLinks = items;

  // 3. Mise à jour du compteur
  updateCounter(filteredLinks.length, mode);

  // 4. Rendu visuel
  if (filteredLinks.length === 0) {
    showEmptyState(
      'noLinksFound',
      mode === 'content' ? 'fallbackSuggestion' : ''
    );
  } else {
    // Activer les boutons d'export (MTF Karukera)
    btnCopy.disabled = false;
    btnDownload.disabled = false;
    hideEmptyState();
    renderLinksPreview();
  }
}

/**
 * Gestion de la saisie dans la barre de recherche
 */
function handleSearchInput() {
  const hasText = searchInput.value.length > 0;
  clearSearchBtn.hidden = !hasText;
  
  // Debounce de 150ms pour le confort et la performance (MTF Karukera)
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(handleModeOrFilterChange, 150);
}

/**
 * Réinitialisation de la recherche
 */
function handleClearSearch() {
  searchInput.value = '';
  clearSearchBtn.hidden = true;
  searchInput.focus();
  handleModeOrFilterChange();
}

/**
 * Affiche le loader d'attente
 */
function showLoader() {
  resultsList.textContent = '';
  const container = document.createElement('div');
  container.className = 'loader-container';
  const loader = document.createElement('div');
  loader.className = 'loader';
  loader.setAttribute('role', 'status');
  loader.setAttribute('aria-label', 'Chargement des liens en cours…');
  container.appendChild(loader);
  resultsList.appendChild(container);
  resultsList.hidden = false;
  resultsFallback.hidden = true;
  resultsCounter.textContent = '...';
  
  // Désactiver les boutons export (MTF Karukera)
  btnCopy.disabled = true;
  btnDownload.disabled = true;
}

/**
 * Affiche l'état vide
 */
function showEmptyState(titleKey, descKey) {
  resultsList.hidden = true;
  resultsFallback.hidden = false;
  
  const titleEl = resultsFallback.querySelector('.fallback-title');
  const descEl = resultsFallback.querySelector('.fallback-desc');
  
  titleEl.textContent = t(titleKey);
  descEl.textContent = descKey ? t(descKey) : '';
  
  // Désactiver les boutons export (MTF Karukera)
  btnCopy.disabled = true;
  btnDownload.disabled = true;
}

/**
 * Masque l'état vide
 */
function hideEmptyState() {
  resultsList.hidden = false;
  resultsFallback.hidden = true;
}

/**
 * Met à jour le libellé du compteur dynamique de liens
 */
function updateCounter(count, mode) {
  const renderedText = count > 200 ? ' (affichage des 200 premiers)' : '';
  if (mode === 'content') {
    resultsCounter.textContent = t('contentLinksFoundCount', String(count)) + renderedText;
  } else {
    resultsCounter.textContent = t('linksFoundCount', String(count)) + renderedText;
  }
}

/**
 * Affiche la liste des liens scannés dans la popup
 */
function renderLinksPreview() {
  resultsList.textContent = '';
  const groupDomain = groupDomainCheckbox.checked;

  // Limite d'affichage à 200 éléments max (MTF Karukera)
  const MAX_RENDERED = 200;
  const linksToRender = filteredLinks.slice(0, MAX_RENDERED);

  if (groupDomain) {
    // Groupement par domaine
    const groups = {};
    linksToRender.forEach(link => {
      if (!groups[link.domain]) {
        groups[link.domain] = [];
      }
      groups[link.domain].push(link);
    });

    // Rendu des groupes triés par nom de domaine
    Object.keys(groups).sort().forEach(domain => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'domain-group';

      const groupHeader = document.createElement('h3'); // H3 pour accessibilité (MTF Karukera)
      groupHeader.className = 'domain-group-header';
      groupHeader.textContent = `${domain} (${groups[domain].length})`;
      groupDiv.appendChild(groupHeader);

      groups[domain].forEach(link => {
        groupDiv.appendChild(createLinkItemElement(link));
      });

      resultsList.appendChild(groupDiv);
    });
  } else {
    // Rendu plat direct
    linksToRender.forEach(link => {
      resultsList.appendChild(createLinkItemElement(link));
    });
  }
}

/**
 * Crée le nœud DOM d'un élément de lien
 */
function createLinkItemElement(link) {
  const item = document.createElement('div');
  item.className = 'link-item';
  item.setAttribute('role', 'link');
  item.setAttribute('tabindex', '0');
  item.setAttribute('aria-label', `${link.title} — ${link.url}`);

  // On indique si c'est un lien hautement pertinent
  if (link.score >= 50) {
    item.setAttribute('data-high-score', 'true');
  }

  const openLink = () => {
    if (link.url.startsWith('http://') || link.url.startsWith('https://')) {
      browser.tabs.create({ url: link.url });
    }
  };

  // Ouvrir le lien au clic ou touches clavier Enter/Space (MTF Karukera)
  item.addEventListener('click', openLink);
  item.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openLink();
    }
  });

  const header = document.createElement('div');
  header.className = 'link-header';

  const title = document.createElement('span');
  title.className = 'link-title';
  title.textContent = link.title;
  header.appendChild(title);

  const score = document.createElement('span');
  score.className = 'link-score';
  score.textContent = `S: ${link.score}`;
  header.appendChild(score);

  item.appendChild(header);

  const url = document.createElement('span');
  url.className = 'link-url';
  url.textContent = link.url;
  item.appendChild(url);

  return item;
}

/**
 * Prépare et structure les données d'export dans le format cible
 */
function generateExportData(format) {
  const groupDomain = groupDomainCheckbox.checked;

  switch (format) {
    case 'notebooklm':
      // Format optimisé pour NotebookLM : une URL par ligne, prête à coller (MTF Karukera)
      return filteredLinks.map(link => link.url).join('\n');

    case 'markdown':
      if (groupDomain) {
        // Groupé par domaine avec des titres
        const groups = {};
        filteredLinks.forEach(link => {
          if (!groups[link.domain]) groups[link.domain] = [];
          groups[link.domain].push(link);
        });

        return Object.keys(groups).sort().map(domain => {
          const linksText = groups[domain]
            .map(link => {
              const safeUrl = link.url.replace(/\(/g, '%28').replace(/\)/g, '%29');
              return `- [${escapeMarkdownText(link.title)}](${safeUrl})`;
            })
            .join('\n');
          return `### ${domain}\n\n${linksText}`;
        }).join('\n\n');
      } else {
        // Liste plate
        return filteredLinks
          .map(link => {
            const safeUrl = link.url.replace(/\(/g, '%28').replace(/\)/g, '%29');
            return `- [${escapeMarkdownText(link.title)}](${safeUrl})`;
          })
          .join('\n');
      }

    case 'text':
      // Une URL par ligne (optimisé IA)
      return filteredLinks.map(link => link.url).join('\n');

    case 'csv':
      // Titre, URL, Domaine, Score, Corps principal
      const headers = 'Title,URL,Domain,Score,IsContent';
      const rows = filteredLinks.map(link => {
        return `${escapeCSV(link.title)},${escapeCSV(link.url)},${escapeCSV(link.domain)},${link.score},${link.isContent}`;
      });
      return [headers, ...rows].join('\n');

    case 'json':
      if (groupDomain) {
        // Objet indexé par domaine
        const groups = {};
        filteredLinks.forEach(link => {
          if (!groups[link.domain]) groups[link.domain] = [];
          groups[link.domain].push({
            title: link.title,
            url: link.url,
            score: link.score,
            isContent: link.isContent
          });
        });
        return JSON.stringify(groups, null, 2);
      } else {
        // Tableau plat
        return JSON.stringify(filteredLinks, null, 2);
      }

    default:
      return '';
  }
}

/**
 * Action de copie dans le presse-papiers
 */
async function handleCopy() {
  if (filteredLinks.length === 0) return;

  const format = exportFormatSelect.value;
  const exportText = generateExportData(format);

  try {
    await navigator.clipboard.writeText(exportText);
    showToast(t('copySuccess'));
  } catch (err) {
    console.error('[ML] Échec de la copie :', err);
    showToast(t('copyError'));
  }
}

/**
 * Action de téléchargement du fichier
 */
function handleDownload() {
  if (filteredLinks.length === 0) return;

  const format = exportFormatSelect.value;
  const exportText = generateExportData(format);

  let mimeType = 'text/plain';
  let extension = 'txt';

  switch (format) {
    case 'notebooklm':
      // Téléchargement NotebookLM en texte brut, une URL par ligne (MTF Karukera)
      mimeType = 'text/plain';
      extension = 'txt';
      break;
    case 'markdown':
      mimeType = 'text/markdown';
      extension = 'md';
      break;
    case 'csv':
      mimeType = 'text/csv';
      extension = 'csv';
      break;
    case 'json':
      mimeType = 'application/json';
      extension = 'json';
      break;
  }

  // Création du fichier téléchargeable (Blob)
  const blob = new Blob([exportText], { type: `${mimeType};charset=utf-8` });
  const blobUrl = URL.createObjectURL(blob);

  // Construction d'un nom de fichier daté
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const pageTitleClean = activeTab && activeTab.title
    ? activeTab.title.trim().toLowerCase().replace(/[^a-z0-9]/gi, '_').slice(0, 30)
    : 'links';
  const filename = `magic_links_${pageTitleClean}_${dateStr}.${extension}`;

  const downloadLink = document.createElement('a');
  downloadLink.href = blobUrl;
  downloadLink.download = filename;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  
  // Nettoyage du DOM et du Blob (avec délai pour compatibilité - MTF Karukera)
  document.body.removeChild(downloadLink);
  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 1000);
}

/**
 * Affiche une notification toast éphémère
 */
function showToast(message) {
  // Annuler le timer existant pour éviter les conflits (MTF Karukera)
  if (toastTimer) {
    clearTimeout(toastTimer);
  }
  toastEl.textContent = message;
  toastEl.hidden = false;

  // Clone pour relancer les animations CSS facilement
  const newToast = toastEl.cloneNode(true);
  toastEl.parentNode.replaceChild(newToast, toastEl);
  
  // Réassignation de la référence
  toastEl = newToast;

  // Masquer après 2 secondes (durée de l'animation)
  toastTimer = setTimeout(() => {
    toastEl.hidden = true;
  }, 2000);
}
