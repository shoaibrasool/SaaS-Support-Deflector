(function () {
  'use strict';

  const DEBOUNCE_MS = 200;

  /* ---- DOM refs ---- */
  const sidebar = $('#sidebar');
  const overlay = $('#sidebar-overlay');
  const toggleBtn = $('#sidebar-toggle');
  const input = $('#search-input');
  const categoriesList = $('#categories-list');
  const resultsEl = $('#results');
  const resultsTitle = $('#results-title');
  const resultsSubtitle = $('#results-subtitle');
  const stateEmpty = $('#state-empty');
  const stateLoading = $('#state-loading');
  const stateNoResults = $('#state-no-results');
  const noResultsMsg = $('#no-results-message');
  const searchSection = $('#search-section');
  const themeToggle = $('#theme-toggle');

  /* ---- state ---- */
  let currentQuery = '';
  let currentCategory = '';
  let allCategories = [];
  let selectedIndex = -1;

  /* ---- helpers ---- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }
  function esc(str) { var d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

  function readUrlParams() {
    var p = new URLSearchParams(window.location.search);
    return { query: p.get('q') || '', category: p.get('category') || '' };
  }

  function syncUrl(query, category) {
    var p = new URLSearchParams();
    if (query) p.set('q', query);
    if (category) p.set('category', category);
    var url = p.toString() ? '/?' + p.toString() : '/';
    window.history.pushState({ query: query, category: category }, '', url);
  }

  /* ---- dark mode ---- */
  function getPreferredTheme() {
    var stored = localStorage.getItem('theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }

  themeToggle.addEventListener('click', function () {
    var current = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
  });

  setTheme(getPreferredTheme());

  /* ---- SVG icons for categories ---- */
  var icons = {
    'new-to-notion':       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    'write-edit-and-customize': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>',
    'databases':            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
    'database-views':       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
    'notion-ai':            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4m0 10v4M3 12h4m10 0h4"/><path d="m5.64 5.64 2.83 2.83m7.07 7.07 2.83 2.83"/><path d="m18.36 5.64-2.83 2.83m-7.07 7.07-2.83 2.83"/></svg>',
    'notion-ai-connectors': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"/><line x1="12" y1="22" x2="12" y2="15.5"/><polyline points="22 8.5 12 15.5 2 8.5"/></svg>',
    'notion-ai-security':   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    'custom-agents':        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    'external-agents':      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="21.17" y1="8" x2="12" y2="8"/><line x1="3.95" y1="6.06" x2="8.54" y2="14"/><line x1="10.88" y1="21.94" x2="15.46" y2="14"/></svg>',
    'notion-calendar':      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    'notion-mail':          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
    'notion-sites':         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    'notion-apps':          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    'sharing-and-collaboration': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    'account-settings-and-privacy': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
    'meet-your-workspace':  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    'enterprise-admin':     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    'security-and-privacy': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    'sidebar-navigation':   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="15" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="15" y2="18"/></svg>',
    'troubleshooting':      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    'automations':          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    'connections':          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    'developer-platform':   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    'import-export-and-integrate': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    'template-gallery':     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>',
    'plans-billing-and-payment': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    'notion-credits':       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
  };

  function getIcon(slug) {
    return icons[slug] || icons['new-to-notion'];
  }

  /* ---- category grouping ---- */
  var categoryGroups = [
    { name: 'Getting Started', slugs: ['new-to-notion'] },
    { name: 'Content', slugs: ['write-edit-and-customize', 'databases', 'database-views', 'sidebar-navigation'] },
    { name: 'AI & Intelligence', slugs: ['notion-ai', 'notion-ai-connectors', 'notion-ai-security', 'custom-agents', 'external-agents'] },
    { name: 'Products', slugs: ['notion-calendar', 'notion-mail', 'notion-sites', 'notion-apps'] },
    { name: 'Workspace', slugs: ['meet-your-workspace', 'enterprise-admin', 'account-settings-and-privacy', 'security-and-privacy', 'sharing-and-collaboration'] },
    { name: 'Account', slugs: ['plans-billing-and-payment', 'notion-credits'] },
    { name: 'Integrations', slugs: ['connections', 'developer-platform', 'import-export-and-integrate', 'automations', 'template-gallery'] },
    { name: 'Support', slugs: ['troubleshooting'] },
  ];

  /* ---- render categories ---- */
  function renderCategories(categories) {
    allCategories = categories;
    var catBySlug = {};
    categories.forEach(function (c) { catBySlug[c.slug] = c; });

    var html = '';
    categoryGroups.forEach(function (group) {
      var items = group.slugs
        .map(function (s) { return catBySlug[s]; })
        .filter(Boolean);
      if (items.length === 0) return;

      var groupId = 'grp-' + group.name.toLowerCase().replace(/\s+/g, '-');
      html += '<div class="categories-group">';
      html += '<button class="category-group-toggle" data-target="' + groupId + '" aria-expanded="true">';
      html += '<svg class="group-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
      html += esc(group.name);
      html += '</button>';
      html += '<div class="category-items" id="' + groupId + '">';
      items.forEach(function (cat) {
        html += '<button class="category-item" data-slug="' + esc(cat.slug) + '">';
        html += '<span class="category-item-icon">' + getIcon(cat.slug) + '</span>';
        html += '<span class="category-item-name">' + esc(cat.name) + '</span>';
        html += '</button>';
      });
      html += '</div>';
      html += '</div>';
    });

    categoriesList.innerHTML = html;

    // group toggles
    $$('.category-group-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = $(('#' + btn.getAttribute('data-target')));
        var chevron = btn.querySelector('.group-chevron');
        var expanded = btn.getAttribute('aria-expanded') === 'true';
        if (expanded) {
          target.classList.add('collapsed');
          chevron.classList.add('collapsed');
          btn.setAttribute('aria-expanded', 'false');
        } else {
          target.classList.remove('collapsed');
          chevron.classList.remove('collapsed');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });

    // category clicks
    $$('.category-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var slug = btn.getAttribute('data-slug');
        var previouslyActive = slug === currentCategory;
        currentCategory = previouslyActive ? '' : slug;
        setActiveCategory(currentCategory);
        if (!currentCategory && !input.value.trim()) {
          setIdle();
          syncUrl('', '');
          return;
        }
        performSearch(input.value.trim(), currentCategory || null, true);
      });
    });
  }

  function setActiveCategory(slug) {
    $$('.category-item').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-slug') === slug);
    });
  }

  /* ---- search section state (hero vs active) ---- */
  function setActive() {
    searchSection.classList.add('active');
  }

  function setIdle() {
    searchSection.classList.remove('active');
  }

  /* ---- search ---- */
  function showOnly(id) {
    [stateEmpty, stateLoading, stateNoResults, resultsEl].forEach(function (el) {
      el.classList.add('hidden');
    });
    var map = { empty: stateEmpty, loading: stateLoading, noresults: stateNoResults, results: resultsEl };
    if (map[id]) map[id].classList.remove('hidden');
  }

  function renderResults(results) {
    if (results.length === 0) {
      showOnly('noresults');
      var msg = currentQuery
        ? 'No results for "<strong>' + esc(currentQuery) + '</strong>". Try a different query.'
        : 'No articles in this category. Try another category.';
      noResultsMsg.innerHTML = msg;
      resultsSubtitle.textContent = currentQuery
        ? '0 results for "' + currentQuery + '"'
        : '0 articles found';
      return;
    }

    showOnly('results');

    var count = results.length;
    var suffix = count !== 1 ? 's' : '';
    var queryPart = currentQuery ? ' for "<strong>' + esc(currentQuery) + '"</strong>' : '';
    resultsTitle.textContent = count + ' result' + suffix;
    resultsSubtitle.innerHTML = count + ' article' + suffix + ' found' + queryPart;

    var html = '';
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      html += '<a href="' + esc(r.url) + '" target="_blank" rel="noopener" class="result-card" data-index="' + i + '">';
      html += '<div class="result-card-header">';
      html += '<h3 class="result-card-title">' + esc(r.title) + '</h3>';
      html += '<span class="result-card-badge">' + esc(r.category) + '</span>';
      html += '</div>';
      if (r.heading) {
        html += '<p class="result-card-heading">' + esc(r.heading) + '</p>';
      }
      html += '<p class="result-card-preview">' + esc(r.body_preview) + '</p>';
      html += '<div class="result-card-footer">';
      html += '<div class="result-card-tags">';
      html += '<span class="result-card-tag">' + esc(r.category) + '</span>';
      html += '</div>';
      html += '<span class="result-card-score">Score: <strong>' + r.score.toFixed(2) + '</strong></span>';
      html += '</div>';
      html += '</a>';
    }
    resultsEl.innerHTML = html;
    selectedIndex = -1;
  }

  async function performSearch(query, category, updateUrl) {
    currentQuery = (query || '').trim();
    currentCategory = category || '';

    if (!currentQuery && !currentCategory) {
      setIdle();
      showOnly('empty');
      resultsTitle.textContent = 'Search';
      resultsSubtitle.textContent = 'Browse knowledge base articles';
      if (updateUrl) syncUrl('', '');
      return;
    }

    setActive();

    if (currentQuery && currentQuery.length < 2) {
      showOnly('empty');
      return;
    }

    showOnly('loading');

    var body = { query: currentQuery || '', top_k: 10 };
    if (currentCategory) body.category = currentCategory;

    try {
      var res = await fetch('/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Search failed (' + res.status + ')');

      var results = await res.json();
      renderResults(results);
      if (updateUrl) syncUrl(currentQuery, currentCategory);
    } catch (err) {
      showOnly('noresults');
      noResultsMsg.textContent = 'Search failed. Is the server running?';
      if (updateUrl) syncUrl(currentQuery, currentCategory);
    }
  }

  /* ---- debounced instant search ---- */
  var searchTimer;
  function onInputChange() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      performSearch(input.value, currentCategory, true);
    }, DEBOUNCE_MS);
  }

  /* ---- keyboard navigation ---- */
  function getResultCards() {
    return $$('.result-card', resultsEl);
  }

  function selectCard(index) {
    var cards = getResultCards();
    if (cards.length === 0) return;
    if (index < 0) index = 0;
    if (index >= cards.length) index = cards.length - 1;
    selectedIndex = index;
    cards.forEach(function (c, i) {
      c.style.outline = i === index ? '2px solid var(--accent)' : '';
      c.style.outlineOffset = i === index ? '2px' : '';
    });
    cards[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      input.focus();
      return;
    }

    if (e.key === 'Escape') {
      if (input.value) {
        input.value = '';
        currentCategory = '';
        setActiveCategory('');
        onInputChange();
      }
      input.blur();
      return;
    }

    if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
      var cards = getResultCards();
      if (cards.length === 0) return;
      e.preventDefault();
      if (e.key === 'ArrowDown') {
        selectCard(selectedIndex + 1);
      } else {
        selectCard(selectedIndex - 1);
      }
    }

    if (e.key === 'Enter' && selectedIndex >= 0) {
      var cards = getResultCards();
      if (cards[selectedIndex]) {
        cards[selectedIndex].click();
      }
    }
  });

  /* ---- sidebar toggle (mobile) ---- */
  function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  toggleBtn.addEventListener('click', function () {
    if (sidebar.classList.contains('open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  overlay.addEventListener('click', closeSidebar);

  document.addEventListener('click', function (e) {
    if (e.target.closest('.category-item') && window.innerWidth <= 767) {
      closeSidebar();
    }
  });

  /* ---- init ---- */
  async function init() {
    // fetch categories
    try {
      var res = await fetch('/categories');
      if (res.ok) {
        var data = await res.json();
        renderCategories(data.categories || []);
      }
    } catch (_) { /* ignore */ }

    // URL params
    var params = readUrlParams();
    if (params.query || params.category) {
      input.value = params.query;
      if (params.category) {
        currentCategory = params.category;
        setActiveCategory(params.category);
      }
      performSearch(params.query, params.category || null, false);
    }

    // input events
    input.addEventListener('input', onInputChange);

    // browser back/forward
    window.addEventListener('popstate', function () {
      var params = readUrlParams();
      input.value = params.query;
      currentCategory = params.category || '';
      setActiveCategory(currentCategory);
      if (params.query || params.category) {
        performSearch(params.query, params.category || null, false);
      } else {
        setIdle();
        showOnly('empty');
        resultsTitle.textContent = 'Search';
        resultsSubtitle.textContent = 'Browse knowledge base articles';
      }
    });
  }

  init();
})();
