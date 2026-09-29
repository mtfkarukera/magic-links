// scanner.js : Script de scan du DOM et intégration Readability — MTF Karukera

(() => {
  // 1. Détection des liens du contenu principal via Readability
  const contentUrls = new Set();
  let readabilityActive = false;

  try {
    // Cloner le document pour éviter d'altérer la page active
    const docClone = document.cloneNode(true);
    // Vérification de la présence de la bibliothèque Readability
    if (typeof Readability !== 'undefined') {
      // Plafonnement du nombre d'éléments pour la sécurité mémoire (MTF Karukera - Audit v1.0.8)
      const reader = new Readability(docClone, { maxElemsToParse: 25000 });
      const article = reader.parse();
      if (article && article.content) {
        readabilityActive = true;
        // Parser le HTML extrait par Readability pour y trouver les liens
        const parser = new DOMParser();
        const tempDoc = parser.parseFromString(article.content, 'text/html');
        const aElements = tempDoc.querySelectorAll('a');
        
        aElements.forEach(a => {
          const href = a.getAttribute('href');
          if (href) {
            try {
              // Convertir en URL absolue en utilisant la base d'origine
              const absUrl = new URL(href, document.baseURI).href;
              // Validation stricte du protocole web (MTF Karukera)
              if (absUrl.startsWith('http://') || absUrl.startsWith('https://')) {
                // Retirer la partie fragment (#ancre) pour la comparaison
                const cleanUrl = absUrl.split('#')[0];
                contentUrls.add(cleanUrl);
              }
            } catch (err) {
              // URL invalide ignorée
            }
          }
        });
      }
    }
  } catch (e) {
    console.warn('[ML] Erreur lors du parsing Readability :', e);
  }

  // 2. Scan de tous les liens de la page réelle
  const rawLinks = document.querySelectorAll('a');
  const uniqueLinksMap = new Map();
  const currentHost = window.location.hostname;

  // Liste blanche stricte des protocoles web autorisés (MTF Karukera - SEC-01)
  const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

  rawLinks.forEach(link => {
    const hrefAttr = link.getAttribute('href');
    if (!hrefAttr || hrefAttr.startsWith('#')) return;

    try {
      // Utilisation stricte de l'attribut href pour parer aux éléments SVG où link.href est un SVGAnimatedString (MTF Karukera - ROB-04)
      const absUrl = new URL(hrefAttr, document.baseURI).href;
      const parsedUrl = new URL(absUrl);

      // Rejet systématique de tout protocole non web via Allowlist (MTF Karukera)
      if (!ALLOWED_PROTOCOLS.has(parsedUrl.protocol.toLowerCase())) {
        return;
      }

      // Nettoyer le fragment (#) pour le dédoublonnage
      const cleanUrl = absUrl.split('#')[0];

      // Extraction et nettoyage du titre
      let title = link.textContent ? link.textContent.trim() : '';
      // Si l'ancre est vide, on cherche un attribut title ou alt d'une image interne
      if (!title) {
        title = link.getAttribute('title') || '';
        if (!title) {
          const img = link.querySelector('img');
          if (img) {
            title = img.getAttribute('alt') || img.getAttribute('title') || '';
          }
        }
      }
      
      // Nettoyer les espaces multiples, retours à la ligne et plafonner à 500 caractères (MTF Karukera - SEC-03)
      title = title.replace(/\s+/g, ' ').trim().slice(0, 500);

      const isContent = contentUrls.has(cleanUrl);

      if (uniqueLinksMap.has(cleanUrl)) {
        // En cas de doublon, on enrichit l'entrée existante
        const existing = uniqueLinksMap.get(cleanUrl);
        // On conserve le titre le plus descriptif
        if (title && (!existing.title || title.length > existing.title.length)) {
          existing.title = title;
        }
        // Si au moins un des liens était dans le contenu principal, on le marque comme tel
        if (isContent) {
          existing.isContent = true;
        }
      } else {
        uniqueLinksMap.set(cleanUrl, {
          url: cleanUrl,
          title: title,
          domain: parsedUrl.hostname.replace(/^www\./i, ''),
          isContent: isContent,
          isExternal: parsedUrl.hostname !== currentHost
        });
      }
    } catch (err) {
      // URL invalide ignorée
    }
  });

  // 3. Fonction auxiliaire pour calculer le score de pertinence
  const countDescriptiveWords = (text) => {
    if (!text) return 0;
    // On split par espaces et compte les mots de plus de 3 lettres
    const words = text.split(/\s+/);
    let count = 0;
    for (const word of words) {
      // Exclure les mots trop courts ou purement numériques
      if (word.length > 3 && !/^\d+$/.test(word)) {
        count++;
      }
    }
    return count;
  };

  // 4. Calcul final des scores et formatage
  const finalLinks = Array.from(uniqueLinksMap.values()).map(item => {
    let score = 0;

    // Critère 1 : Présence dans le corps de l'article principal (Readability)
    if (item.isContent) {
      score += 50;
    }

    // Critère 2 : Qualité du texte d'ancre
    const isUrlText = item.title.includes('://') || item.title.startsWith('www.');
    if (!item.title || isUrlText) {
      score -= 30; // Pénalité pour les ancres vides ou contenant juste l'URL
      if (!item.title) {
        item.title = item.url; // Fallback d'affichage
      }
    } else {
      // Bonus pour le nombre de mots descriptifs (max +20 pts)
      const wordCount = countDescriptiveWords(item.title);
      score += Math.min(20, wordCount * 2);
    }

    // Critère 3 : Lien externe de référence (souvent plus intéressant pour l'analyse)
    if (item.isExternal) {
      score += 10;
    }

    return {
      url: item.url,
      title: item.title,
      domain: item.domain,
      isContent: item.isContent,
      score: score
    };
  });

  // Tri par pertinence (score décroissant) par défaut
  finalLinks.sort((a, b) => b.score - a.score);

  return {
    success: true,
    readabilityActive: readabilityActive,
    links: finalLinks
  };
})();
