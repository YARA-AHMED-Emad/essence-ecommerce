// ============================================================
//  search.js — Search, Filter & Sort for index.html
//  Fix: waits for products-ready event from script.js
// ============================================================

const buildSearchBar = () => {
  const header = document.querySelector('.collection__header');
  if (!header || document.getElementById('search-bar')) return;

  header.insertAdjacentHTML('afterend', `
    <div class="search-bar" id="search-bar">
      <div class="search-bar__input-wrap">
        <svg class="search-bar__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input class="search-bar__input" type="search" id="search-input" placeholder="Search fragrances…" autocomplete="off">
        <button class="search-bar__clear" id="search-clear" hidden>✕</button>
      </div>
      <div class="search-bar__filters">
        <select class="search-bar__select" id="sort-select">
          <option value="default">Sort: Featured</option>
          <option value="price-asc">Price: Low → High</option>
          <option value="price-desc">Price: High → Low</option>
          <option value="rating-desc">Top Rated</option>
          <option value="name-asc">Name: A → Z</option>
        </select>
        <select class="search-bar__select" id="price-filter">
          <option value="all">All Prices</option>
          <option value="0-100">Under $100</option>
          <option value="100-150">$100 – $150</option>
          <option value="150-200">$150 – $200</option>
          <option value="200-999">$200+</option>
        </select>
        <select class="search-bar__select" id="rating-filter">
          <option value="all">All Ratings</option>
          <option value="5">★★★★★ Only</option>
          <option value="4">★★★★ & Up</option>
          <option value="3">★★★ & Up</option>
        </select>
      </div>
      <p class="search-results-count" id="results-count" hidden></p>
    </div>
  `);
};

const injectSearchStyles = () => {
  if (document.getElementById('search-styles')) return;
  const style = document.createElement('style');
  style.id = 'search-styles';
  style.textContent = `
    .search-bar{max-width:900px;margin:0 auto 2.5rem;padding:0 var(--spacing-page);display:flex;flex-direction:column;gap:1rem}
    .search-bar__input-wrap{position:relative;display:flex;align-items:center}
    .search-bar__icon{position:absolute;left:1rem;color:var(--clr-text-muted);pointer-events:none}
    .search-bar__input{width:100%;background:var(--clr-card-bg);border:1px solid var(--clr-border);color:var(--clr-text-primary);font-family:var(--font-body);font-size:.88rem;letter-spacing:.04em;padding:.85rem 2.5rem .85rem 2.75rem;outline:none;transition:border-color .25s;box-sizing:border-box}
    .search-bar__input::placeholder{color:var(--clr-text-muted);opacity:.6}
    .search-bar__input:focus{border-color:var(--clr-gold-light)}
    .search-bar__clear{position:absolute;right:1rem;background:none;border:none;color:var(--clr-text-muted);cursor:pointer;font-size:.75rem;padding:.25rem}
    .search-bar__filters{display:flex;gap:.75rem;flex-wrap:wrap}
    .search-bar__select{flex:1;min-width:140px;background:var(--clr-card-bg);border:1px solid var(--clr-border);color:var(--clr-text-muted);font-family:var(--font-body);font-size:.78rem;padding:.6rem 2rem .6rem .9rem;outline:none;cursor:pointer;-webkit-appearance:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .75rem center}
    .search-bar__select:focus,.search-bar__select:hover{border-color:var(--clr-gold-light);color:var(--clr-text-primary)}
    .search-results-count{font-family:var(--font-body);font-size:.78rem;color:var(--clr-text-muted);text-align:right}
    .no-results{grid-column:1/-1;text-align:center;padding:4rem 2rem;color:var(--clr-text-muted);font-family:var(--font-body)}
    .card__img-wrapper--link{display:block;text-decoration:none}
  `;
  document.head.appendChild(style);
};

const getFilters = () => ({
  query:  (document.getElementById('search-input')?.value || '').trim().toLowerCase(),
  sort:   document.getElementById('sort-select')?.value   || 'default',
  price:  document.getElementById('price-filter')?.value  || 'all',
  rating: document.getElementById('rating-filter')?.value || 'all',
});

const filterAndSort = (products, { query, price, rating, sort }) => {
  let result = products.filter(p => {
    if (query && !p.name.toLowerCase().includes(query)) return false;
    if (price !== 'all') {
      const [min, max] = price.split('-').map(Number);
      if (p.price < min || p.price > max) return false;
    }
    if (rating !== 'all' && p.rating < parseInt(rating, 10)) return false;
    return true;
  });

  switch (sort) {
    case 'price-asc':   result.sort((a, b) => a.price - b.price); break;
    case 'price-desc':  result.sort((a, b) => b.price - a.price); break;
    case 'rating-desc': result.sort((a, b) => b.rating - a.rating); break;
    case 'name-asc':    result.sort((a, b) => a.name.localeCompare(b.name)); break;
  }
  return result;
};

const stars = (r, m = 5) =>
  Array.from({ length: m }, (_, i) =>
    `<span class="${i < r ? 'star--filled' : 'star--empty'}">★</span>`).join('');

const renderFilteredGrid = () => {
  const grid = document.getElementById('products-grid');
  if (!grid || !PRODUCTS?.length) return;

  const filters = getFilters();
  const sorted  = filterAndSort(PRODUCTS, filters);

  // Results count
  const countEl = document.getElementById('results-count');
  if (countEl) {
    countEl.hidden = false;
    countEl.textContent = `${sorted.length} ${sorted.length === 1 ? 'fragrance' : 'fragrances'} found`;
  }

  // Clear button
  const clearBtn = document.getElementById('search-clear');
  if (clearBtn) clearBtn.hidden = !filters.query;

  // No results
  if (sorted.length === 0) {
    grid.innerHTML = `<li class="no-results"><div style="font-size:2.5rem;opacity:.4;margin-bottom:1rem">◇</div><p>No fragrances match your search.</p></li>`;
    return;
  }

  // Render cards — use MongoDB _id as product id
  grid.innerHTML = sorted.map(p => `
    <li class="card" data-product-id="${p.id}">
      <a href="product.html?id=${p.id}" class="card__img-wrapper card__img-wrapper--link">
        <img class="card__img" src="${p.image}" alt="${p.name}" loading="lazy">
      </a>
      <div class="card__body">
        <h3 class="card__name">
          <a href="product.html?id=${p.id}" style="text-decoration:none;color:inherit">${p.name}</a>
        </h3>
        <div class="card__rating">${stars(p.rating)}</div>
        <div class="card__footer">
          <span class="card__price">$${p.price}</span>
          <button class="card__add-btn" data-id="${p.id}" aria-label="Add ${p.name} to cart">Add</button>
        </div>
      </div>
    </li>
  `).join('');
};

const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

const initSearch = () => {
  injectSearchStyles();
  buildSearchBar();
  renderFilteredGrid();

  const debouncedRender = debounce(renderFilteredGrid, 200);
  document.getElementById('search-input')?.addEventListener('input', debouncedRender);
  document.getElementById('sort-select')?.addEventListener('change', renderFilteredGrid);
  document.getElementById('price-filter')?.addEventListener('change', renderFilteredGrid);
  document.getElementById('rating-filter')?.addEventListener('change', renderFilteredGrid);
  document.getElementById('search-clear')?.addEventListener('click', () => {
    const el = document.getElementById('search-input');
    if (el) { el.value = ''; el.focus(); }
    renderFilteredGrid();
  });
};

// ── Wait for products-ready event fired by script.js ──────
window.addEventListener('products-ready', initSearch);
