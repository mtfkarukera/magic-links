// popup.js : Logique et interaction utilisateur — MTF Karukera

import { t, applyI18n, escapeCSV, escapeMarkdownText } from '../shared/utils.js';


// Variables globales de l'application
let allLinks = [];
let filteredLinks = [];
let readabilityActive = false;
let activeTab = null;
let toastTimer = null;
let searchDebounceTimer = null;
let isScanning = false;

// Éléments du DOM
const modeContentRadio = document.getElementById('mode-content');
const modeFullRadio = document.getElementById('mode-full');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const groupDomainCheckbox = document.getElementById('group-domain-checkbox');
const resultsCounter = document.getElementById('results-counter');
const selectAllCheckbox = document.getElementById('select-all-checkbox');
const selectAllContainer = document.querySelector('.select-all-container');
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
  selectAllCheckbox.addEventListener('change', handleSelectAllChange);
  btnCopy.addEventListener('click', handleCopy);
  btnDownload.addEventListener('click', handleDownload);

  // 3. Scan de l'onglet actif
  await scanActiveTab();
});

/**
 * Scan de la page active et extraction des liens
 */
async function scanActiveTab() {
  if (isScanning) return;
  isScanning = true;
  showLoader();
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    activeTab = tabs[0];

    if (!activeTab || !activeTab.url) {
      showEmptyState('noLinksFound', 'fallbackSuggestion');
      return;
    }

    // Protection contre les pages système, protocoles spéciaux, fichiers PDF et le Mode Lecture (MTF Karukera)
    const isWebPage = activeTab.url.startsWith('http://') || activeTab.url.startsWith('https://');
    const isSpecialProtocol = activeTab.url.startsWith('moz-extension://') || activeTab.url.startsWith('devtools://') || activeTab.url.startsWith('blob:');
    const isPDF = activeTab.url.toLowerCase().endsWith('.pdf') || activeTab.url.includes('pdf.js/web/viewer.html');
    const isReaderMode = activeTab.url.startsWith('about:reader');
    if (!isWebPage || isSpecialProtocol || isPDF || isReaderMode) {
      showEmptyState('pageNotSupported', '');
      return;
    }

    // 1. Injection séquentielle de Readability.js
    const readabilityResult = await browser.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: ['/lib/Readability.js']
    });

    if (!readabilityResult || !readabilityResult[0]) {
      throw new Error('Readability.js non injecté correctement.');
    }

    // Vérification de sécurité anti-race-condition : l'onglet a-t-il navigué entre temps ? (MTF Karukera)
    const currentTabs = await browser.tabs.query({ active: true, currentWindow: true });
    const currentTab = currentTabs[0];
    if (!currentTab || currentTab.id !== activeTab.id || currentTab.url !== activeTab.url) {
      throw new Error("L'onglet actif a navigué ou a été modifié pendant l'analyse.");
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
      
      // Initialise l'état sélectionné par défaut sur chaque lien (MTF Karukera)
      allLinks.forEach(link => {
        link.selected = true;
      });
      
      // S'il n'y a aucun lien détecté dans le contenu de l'article,
      // on bascule automatiquement vers le mode complet pour ne pas afficher une liste vide.
      if (allLinks.filter(l => l.isContent).length === 0) {
        modeFullRadio.checked = true;
      }
      
      // Repasser isScanning à false AVANT d'exécuter handleModeOrFilterChange pour éviter
      // que le verrou isScanning ne court-circuite le premier rendu graphique (MTF Karukera)
      isScanning = false;
      handleModeOrFilterChange();
    } else {
      showEmptyState('noLinksFound', 'fallbackSuggestion');
    }
  } catch (err) {
    console.error('[ML] Erreur lors de l\'analyse de la page :', err.message);
    showEmptyState('noLinksFound', 'fallbackSuggestion');
  } finally {
    isScanning = false;
  }
}

/**
 * Gestion du changement de mode (Toggle) ou d'options (Groupement)
 */
function handleModeOrFilterChange() {
  if (isScanning) return;
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

  // Gestion du bandeau d'avertissement limite de liens (MTF Karukera - Sprint B)
  const warningBanner = document.getElementById('warning-banner');
  if (warningBanner) {
    warningBanner.hidden = filteredLinks.length <= 200;
  }

  // 3. Mise à jour du compteur
  updateCounter(filteredLinks.length, mode);
  
  // Synchronisation de la checkbox globale
  syncSelectAllCheckbox();

  // 4. Rendu visuel
  if (filteredLinks.length === 0) {
    showEmptyState(
      'noLinksFound',
      mode === 'content' ? 'fallbackSuggestion' : ''
    );
    btnCopy.disabled = true;
    btnDownload.disabled = true;
  } else {
    hideEmptyState();
    renderLinksPreview();
    updateExportButtonsState();
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
  const selectedCount = filteredLinks.filter(l => l.selected).length;
  const renderedText = count > 200 ? ' (affichage des 200 premiers)' : '';
  let baseText = '';
  
  if (mode === 'content') {
    baseText = t('contentLinksFoundCount', String(count));
  } else {
    baseText = t('linksFoundCount', String(count));
  }
  
  resultsCounter.textContent = `${selectedCount} / ${baseText}${renderedText}`;
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
      const groupDiv = document.createElement('details');
      groupDiv.className = 'domain-group';
      groupDiv.open = true; // Ouvert par défaut (MTF Karukera)

      const domainLinks = groups[domain];

      const groupHeaderWrapper = document.createElement('summary');
      groupHeaderWrapper.className = 'domain-group-header-wrapper';
      
      // Accessibilité et état de l'accordéon (MTF Karukera - WCAG AA)
      groupHeaderWrapper.setAttribute('aria-label', `${domain}, ${domainLinks.length} liens, développé`);
      groupDiv.addEventListener('toggle', () => {
        const stateText = groupDiv.open ? 'développé' : 'réduit';
        groupHeaderWrapper.setAttribute('aria-label', `${domain}, ${domainLinks.length} liens, ${stateText}`);
      });

      const checkboxLabel = document.createElement('label');
      checkboxLabel.className = 'checkbox-container domain-checkbox-container';

      // Intercepte le clic sur le label pour ne pas plier/déplier l'accordéon (MTF Karukera)
      checkboxLabel.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      const checkboxInput = document.createElement('input');
      checkboxInput.type = 'checkbox';
      checkboxInput.className = 'domain-checkbox';
      checkboxInput.setAttribute('aria-label', `Sélectionner tous les liens de ${domain}`);

      const allChecked = domainLinks.every(link => link.selected);
      const someChecked = domainLinks.some(link => link.selected);
      checkboxInput.checked = allChecked;
      checkboxInput.indeterminate = someChecked && !allChecked;
      
      // Indiquer l'état mixte pour les lecteurs d'écran
      if (checkboxInput.indeterminate) {
        checkboxInput.setAttribute('aria-checked', 'mixed');
      }

      checkboxInput.addEventListener('change', () => {
        const checked = checkboxInput.checked;
        domainLinks.forEach(link => link.selected = checked);
        
        // Mettre à jour visuellement les items sous ce domaine
        const groupItems = groupDiv.querySelectorAll('.link-item');
        groupItems.forEach((item, index) => {
          const cb = item.querySelector('.link-checkbox');
          if (cb) cb.checked = checked;
          if (checked) {
            item.classList.remove('is-unselected');
            item.setAttribute('aria-checked', 'true');
          } else {
            item.classList.add('is-unselected');
            item.setAttribute('aria-checked', 'false');
          }
        });

        checkboxInput.removeAttribute('aria-checked');

        syncSelectAllCheckbox();
        updateCounter(filteredLinks.length, document.querySelector('input[name="capture-mode"]:checked').value);
        updateExportButtonsState();
      });

      const checkmarkSpan = document.createElement('span');
      checkmarkSpan.className = 'checkmark';

      checkboxLabel.appendChild(checkboxInput);
      checkboxLabel.appendChild(checkmarkSpan);
      groupHeaderWrapper.appendChild(checkboxLabel);

      const groupHeader = document.createElement('span'); // Span neutre au lieu de H3 pour respect sémantique W3C
      groupHeader.className = 'domain-group-header';
      groupHeader.textContent = `${domain} (${domainLinks.length})`;
      groupHeaderWrapper.appendChild(groupHeader);

      // Flèche rotative d'accordéon (MTF Karukera)
      const arrow = document.createElement('span');
      arrow.className = 'collapse-arrow';
      arrow.textContent = '▼';
      arrow.setAttribute('aria-hidden', 'true');
      groupHeaderWrapper.appendChild(arrow);

      groupDiv.appendChild(groupHeaderWrapper);

      // Conteneur de liste pour l'accordéondetails (MTF Karukera)
      const linksList = document.createElement('div');
      linksList.className = 'domain-links-list';

      domainLinks.forEach(link => {
        linksList.appendChild(createLinkItemElement(link));
      });

      groupDiv.appendChild(linksList);
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
  if (!link.selected) {
    item.classList.add('is-unselected');
  }
  item.setAttribute('role', 'checkbox');
  item.setAttribute('aria-checked', link.selected ? 'true' : 'false');
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

  // Checkbox du lien
  const checkboxLabel = document.createElement('label');
  checkboxLabel.className = 'checkbox-container link-checkbox-container';

  const checkboxInput = document.createElement('input');
  checkboxInput.type = 'checkbox';
  checkboxInput.className = 'link-checkbox';
  checkboxInput.checked = link.selected;

  // Intercepte le clic sur le label pour ne pas propager au conteneur parent et ainsi éviter d'ouvrir l'onglet (MTF Karukera)
  checkboxLabel.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  checkboxInput.addEventListener('change', () => {
    link.selected = checkboxInput.checked;
    if (link.selected) {
      item.classList.remove('is-unselected');
      item.setAttribute('aria-checked', 'true');
    } else {
      item.classList.add('is-unselected');
      item.setAttribute('aria-checked', 'false');
    }

    // Synchroniser l'en-tête du groupe de domaine si présent (MTF Karukera)
    const domainGroup = item.closest('.domain-group');
    if (domainGroup) {
      const domainCheckbox = domainGroup.querySelector('.domain-checkbox');
      const siblingCheckboxes = Array.from(domainGroup.querySelectorAll('.link-checkbox'));
      const allSiblingsChecked = siblingCheckboxes.every(cb => cb.checked);
      const someSiblingsChecked = siblingCheckboxes.some(cb => cb.checked);
      if (domainCheckbox) {
        domainCheckbox.checked = allSiblingsChecked;
        domainCheckbox.indeterminate = someSiblingsChecked && !allSiblingsChecked;
        
        // Mettre à jour l'annonce de l'état mixte
        if (domainCheckbox.indeterminate) {
          domainCheckbox.setAttribute('aria-checked', 'mixed');
        } else {
          domainCheckbox.removeAttribute('aria-checked');
        }
      }
    }

    syncSelectAllCheckbox();
    updateCounter(filteredLinks.length, document.querySelector('input[name="capture-mode"]:checked').value);
    updateExportButtonsState();
  });

  const checkmarkSpan = document.createElement('span');
  checkmarkSpan.className = 'checkmark';

  checkboxLabel.appendChild(checkboxInput);
  checkboxLabel.appendChild(checkmarkSpan);
  item.appendChild(checkboxLabel);

  // Wrapper pour le contenu textuel du lien
  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'link-content-wrapper';

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

  contentWrapper.appendChild(header);

  const url = document.createElement('span');
  url.className = 'link-url';
  url.textContent = link.url;
  contentWrapper.appendChild(url);

  item.appendChild(contentWrapper);

  return item;
}

/**
 * Prépare et structure les données d'export dans le format cible
 */
function generateExportData(format) {
  const groupDomain = groupDomainCheckbox.checked;
  const exportableLinks = filteredLinks.filter(link => link.selected);

  if (exportableLinks.length === 0) {
    return '';
  }

  switch (format) {
    case 'notebooklm':
      // Format optimisé pour NotebookLM : une URL par ligne, prête à coller (MTF Karukera)
      return exportableLinks.map(link => link.url).join('\n');

    case 'markdown':
      if (groupDomain) {
        // Groupé par domaine avec des titres
        const groups = {};
        exportableLinks.forEach(link => {
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
        return exportableLinks
          .map(link => {
            const safeUrl = link.url.replace(/\(/g, '%28').replace(/\)/g, '%29');
            return `- [${escapeMarkdownText(link.title)}](${safeUrl})`;
          })
          .join('\n');
      }

    case 'text':
      // Une URL par ligne (optimisé IA)
      return exportableLinks.map(link => link.url).join('\n');

    case 'csv':
      // Titre, URL, Domaine, Score, Corps principal
      const headers = 'Title,URL,Domain,Score,IsContent';
      const rows = exportableLinks.map(link => {
        return `${escapeCSV(link.title)},${escapeCSV(link.url)},${escapeCSV(link.domain)},${link.score},${link.isContent}`;
      });
      return [headers, ...rows].join('\n');

    case 'json':
      if (groupDomain) {
        // Objet indexé par domaine
        const groups = {};
        exportableLinks.forEach(link => {
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
        return JSON.stringify(exportableLinks, null, 2);
      }

    default:
      return '';
  }
}

/**
 * Gère le changement d'état de la checkbox de sélection globale
 */
function handleSelectAllChange() {
  const isChecked = selectAllCheckbox.checked;
  filteredLinks.forEach(link => {
    link.selected = isChecked;
  });

  // Rafraîchir les éléments visuels de la liste
  const items = resultsList.querySelectorAll('.link-item');
  items.forEach(item => {
    const cb = item.querySelector('.link-checkbox');
    if (cb) cb.checked = isChecked;
    if (isChecked) {
      item.classList.remove('is-unselected');
      item.setAttribute('aria-checked', 'true');
    } else {
      item.classList.add('is-unselected');
      item.setAttribute('aria-checked', 'false');
    }
  });

  // Rafraîchir également les checkboxes de domaine si le groupement est actif
  if (groupDomainCheckbox.checked) {
    const domainCbs = resultsList.querySelectorAll('.domain-checkbox');
    domainCbs.forEach(cb => {
      cb.checked = isChecked;
      cb.indeterminate = false;
    });
  }

  updateCounter(filteredLinks.length, document.querySelector('input[name="capture-mode"]:checked').value);
  updateExportButtonsState();
}

/**
 * Synchronise l'état de la checkbox de sélection globale en fonction des liens visibles
 */
function syncSelectAllCheckbox() {
  if (filteredLinks.length === 0) {
    selectAllContainer.style.display = 'none';
    return;
  }
  selectAllContainer.style.display = 'inline-flex';
  const allChecked = filteredLinks.every(link => link.selected);
  const someChecked = filteredLinks.some(link => link.selected);
  selectAllCheckbox.checked = allChecked;
  selectAllCheckbox.indeterminate = someChecked && !allChecked;

  // Annonce AT de l'état indeterminate (MTF Karukera - WCAG AA)
  if (selectAllCheckbox.indeterminate) {
    selectAllCheckbox.setAttribute('aria-checked', 'mixed');
  } else {
    selectAllCheckbox.removeAttribute('aria-checked');
  }
}

/**
 * Active ou désactive les boutons d'export selon qu'il y a des liens sélectionnés ou non
 */
function updateExportButtonsState() {
  const selectedCount = filteredLinks.filter(l => l.selected).length;
  const isDisabled = selectedCount === 0;
  btnCopy.disabled = isDisabled;
  btnDownload.disabled = isDisabled;
}

/**
 * Action de copie dans le presse-papiers
 */
async function handleCopy() {
  const format = exportFormatSelect.value;
  const exportText = generateExportData(format);
  if (!exportText) return;

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
  const format = exportFormatSelect.value;
  const exportText = generateExportData(format);
  if (!exportText) return;

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
  }, 100);
}

function showToast(message) {
  // Annuler le timer existant pour éviter les conflits (MTF Karukera)
  if (toastTimer) {
    clearTimeout(toastTimer);
  }
  toastEl.textContent = message;
  toastEl.hidden = false;

  // Réinitialisation de l'animation par reflow (MTF Karukera - Audit robustesse)
  toastEl.style.animation = 'none';
  void toastEl.offsetWidth; // Reflow forcé
  toastEl.style.animation = '';

  // Masquer après 2 secondes (durée de l'animation)
  toastTimer = setTimeout(() => {
    toastEl.hidden = true;
  }, 2000);
}
