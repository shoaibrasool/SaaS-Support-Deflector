(function () {
  'use strict';

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);

  const form = $('#search-form');
  const input = $('#search-input');
  const categorySelect = $('#category-select');
  const resultsEl = $('#results');
  const countEl = $('#result-count');
  const healthDot = $('#health-dot');
  const healthLabel = $('#health-label');
  const emptyState = $('#empty-state');
  const loadingState = $('#loading-state');
  const errorState = $('#error-state');

  function showOnly(el) {
    [emptyState, loadingState, errorState, resultsEl].forEach(function (e) {
      e.classList.add('hidden');
    });
    el.classList.remove('hidden');
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function readUrlParams() {
    var params = new URLSearchParams(window.location.search);
    return {
      query: params.get('q') || '',
      category: params.get('category') || '',
    };
  }

  function syncUrl(query, category) {
    var params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    var url = params.toString() ? '/?' + params.toString() : '/';
    window.history.pushState({ query: query, category: category }, '', url);
  }

  async function fetchCategories() {
    try {
      var res = await fetch('/categories');
      if (!res.ok) return [];
      var data = await res.json();
      return data.categories || [];
    } catch (_) {
      return [];
    }
  }

  async function checkHealth() {
    var healthy = false;
    try {
      var res = await fetch('/health');
      healthy = res.ok;
    } catch (_) {
      healthy = false;
    }
    healthDot.className = 'health-dot ' + (healthy ? 'healthy' : 'unhealthy');
    healthLabel.textContent = healthy
      ? 'All systems operational'
      : 'Connection issue';
  }

  function renderResults(results) {
    if (results.length === 0) {
      showOnly(emptyState);
      emptyState.innerHTML = '<p>No matching articles found. Try a different query.</p>';
      countEl.textContent = '';
      return;
    }

    showOnly(resultsEl);
    countEl.textContent = results.length + ' result' + (results.length !== 1 ? 's' : '');

    var html = '';
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      html += '<a href="' + escapeHtml(r.url) + '" target="_blank" rel="noopener" class="result-card">';
      html += '<div class="result-card-header">';
      html += '<h3 class="result-title">' + escapeHtml(r.title) + '</h3>';
      html += '<span class="result-category-badge">' + escapeHtml(r.category) + '</span>';
      html += '</div>';
      if (r.heading) {
        html += '<p class="result-heading">' + escapeHtml(r.heading) + '</p>';
      }
      html += '<p class="result-preview">' + escapeHtml(r.body_preview) + '</p>';
      html += '<div class="result-meta">';
      html += '<span class="result-score">Score: ' + r.score.toFixed(3) + '</span>';
      html += '</div>';
      html += '</a>';
    }
    resultsEl.innerHTML = html;
  }

  async function performSearch(query, category, updateUrl) {
    if (!query.trim()) return;

    showOnly(loadingState);

    var body = { query: query.trim(), top_k: 10 };
    if (category) body.category = category;

    try {
      var res = await fetch('/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error('Search failed (' + res.status + ')');
      }

      var results = await res.json();
      renderResults(results);

      if (updateUrl) {
        syncUrl(query.trim(), category || '');
      }
    } catch (err) {
      showOnly(errorState);
      errorState.textContent = 'Search failed. Is the server running?';
      countEl.textContent = '';
    }
  }

  async function init() {
    var categories = await fetchCategories();
    for (var i = 0; i < categories.length; i++) {
      var cat = categories[i];
      var opt = document.createElement('option');
      opt.value = cat.slug;
      opt.textContent = cat.name;
      categorySelect.appendChild(opt);
    }

    await checkHealth();

    var urlParams = readUrlParams();
    if (urlParams.query) {
      input.value = urlParams.query;
      if (urlParams.category) categorySelect.value = urlParams.category;
      performSearch(urlParams.query, urlParams.category || null, false);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = input.value;
      var cat = categorySelect.value || null;
      performSearch(q, cat, true);
    });

    window.addEventListener('popstate', function () {
      var params = new URLSearchParams(window.location.search);
      var q = params.get('q') || '';
      var cat = params.get('category') || '';
      input.value = q;
      categorySelect.value = cat || '';
      if (q) {
        performSearch(q, cat || null, false);
      } else {
        showOnly(emptyState);
        emptyState.innerHTML = '<p>Enter a query above to search articles</p>';
        countEl.textContent = '';
      }
    });
  }

  init();
})();
