// ============================================================
//  product.js — Product Detail Page
//  Fix: fetches product from API using MongoDB _id
// ============================================================

const PRODUCT_DETAILS = {
  'Midnight Rose':  { description: 'An intoxicating blend of Bulgarian rose, dark oud, and warm amber.', notes: ['Bulgarian Rose', 'Dark Oud', 'Amber', 'Musk', 'Sandalwood'], reviewCount: 142 },
  'Golden Oud':     { description: 'A majestic composition built around precious oud, gilded with saffron and warmed by golden vanilla.', notes: ['Oud', 'Saffron', 'Golden Vanilla', 'Benzoin', 'Cedarwood'], reviewCount: 98 },
  'Velvet Musk':    { description: 'Silky white musk layered over velvet-soft iris and a whisper of cashmere wood.', notes: ['White Musk', 'Iris', 'Cashmere Wood', 'Violet', 'Tonka Bean'], reviewCount: 76 },
  'Silver Sage':    { description: 'Crisp silver sage and cool juniper dancing over a base of white cedar and fresh earth.', notes: ['Silver Sage', 'Juniper Berry', 'White Cedar', 'Vetiver', 'Green Tea'], reviewCount: 55 },
  'Ocean Breeze':   { description: 'A breath of the open sea — marine accord, sea salt, and driftwood with white jasmine.', notes: ['Marine Accord', 'Sea Salt', 'White Jasmine', 'Driftwood', 'Bergamot'], reviewCount: 63 },
  'Amber Night':    { description: 'Warm amber resin, dark honey, and benzoin wrapped in a cloak of night-blooming tuberose.', notes: ['Amber Resin', 'Dark Honey', 'Tuberose', 'Benzoin', 'Labdanum'], reviewCount: 189 },
  'Floral Bloom':   { description: 'Peony, freesia, and magnolia swirling above a base of soft woods and white musk.', notes: ['Peony', 'Freesia', 'Magnolia', 'Lily of the Valley', 'White Musk'], reviewCount: 44 },
  'Desert Sand':    { description: 'Sun-baked sand, warm spices, and camel leather at dusk.', notes: ['Desert Sand', 'Warm Spices', 'Leather', 'Cardamom', 'Oud'], reviewCount: 117 },
  'Mystic Wood':    { description: 'Ancient cedarwood, dark vetiver, and a trace of smoky incense.', notes: ['Cedarwood', 'Vetiver', 'Smoky Incense', 'Patchouli', 'Black Pepper'], reviewCount: 82 },
};

let currentQty = 1;
let currentProduct = null;

const getIdFromURL = () => new URLSearchParams(window.location.search).get('id');

const buildStarsHTML = (rating, max = 5) =>
  Array.from({ length: max }, (_, i) =>
    `<span class="${i < rating ? 'star--filled' : 'star--empty'}">★</span>`
  ).join('');

const fetchProductById = async (id) => {
  try {
    const res = await fetch(`https://essence-backend-api.onrender.com/api/products/${id}`);
    if (!res.ok) throw new Error('not found');
    const p = await res.json();
    return { id: p._id, name: p.title, price: p.price, image: p.image, rating: p.rating, badge: p.badge, stock: p.stock };
  } catch {
    return PRODUCTS?.find(p => String(p.id) === String(id)) || null;
  }
};

const renderProduct = (product) => {
  const details = PRODUCT_DETAILS[product.name] || {};
  document.title = `Essence — ${product.name}`;

  const breadcrumbName = document.getElementById('breadcrumb-name');
  if (breadcrumbName) breadcrumbName.textContent = product.name;

  const mainImg = document.getElementById('product-main-img');
  if (mainImg) { mainImg.src = product.image; mainImg.alt = product.name; }

  const badge = document.getElementById('product-badge');
  if (badge) {
    if (product.badge) { badge.textContent = product.badge; badge.style.display = ''; }
    else badge.style.display = 'none';
  }

  const thumbsContainer = document.getElementById('gallery-thumbs');
  if (thumbsContainer) {
    thumbsContainer.innerHTML = [product.image, product.image, product.image]
      .map((src, i) => `<div class="thumb ${i === 0 ? 'active' : ''}" data-thumb="${i}"><img src="${src}" alt="${product.name} view ${i + 1}"></div>`).join('');
    thumbsContainer.addEventListener('click', (e) => {
      const thumb = e.target.closest('.thumb');
      if (!thumb) return;
      thumbsContainer.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      if (mainImg) {
        mainImg.style.opacity = '0';
        setTimeout(() => { mainImg.src = thumb.querySelector('img').src; mainImg.style.opacity = '1'; }, 150);
        mainImg.style.transition = 'opacity 0.15s';
      }
    });
  }

  const nameEl = document.getElementById('product-name');
  if (nameEl) nameEl.textContent = product.name;

  const starsEl = document.getElementById('product-stars');
  if (starsEl) starsEl.innerHTML = buildStarsHTML(product.rating);

  const reviewEl = document.getElementById('product-review-count');
  if (reviewEl) reviewEl.textContent = `(${details.reviewCount || 0} reviews)`;

  const priceEl = document.getElementById('product-price');
  if (priceEl) priceEl.textContent = `$${product.price}`;

  const descEl = document.getElementById('product-desc');
  if (descEl) descEl.textContent = details.description || 'A sophisticated fragrance crafted from the finest ingredients.';

  const notesGrid = document.getElementById('notes-grid');
  if (notesGrid && details.notes) {
    notesGrid.innerHTML = details.notes.map(n => `<span class="note-pill">${n}</span>`).join('');
  }

  document.getElementById('product-loading').style.display = 'none';
  document.getElementById('product-content').hidden = false;
  document.getElementById('related-section').hidden = false;

  renderRelated(product.id);
};

const renderRelated = (currentId) => {
  const grid = document.getElementById('related-grid');
  if (!grid || !PRODUCTS?.length) return;

  const related = PRODUCTS.filter(p => String(p.id) !== String(currentId)).slice(0, 4);
  grid.innerHTML = related.map(p => `
    <li class="card" data-product-id="${p.id}">
      <a href="product.html?id=${p.id}" class="card__img-wrapper" style="display:block;text-decoration:none;">
        <img class="card__img" src="${p.image}" alt="${p.name}" loading="lazy">
      </a>
      <div class="card__body">
        <h3 class="card__name"><a href="product.html?id=${p.id}" style="text-decoration:none;color:inherit;">${p.name}</a></h3>
        <div class="card__rating">${buildStarsHTML(p.rating)}</div>
        <div class="card__footer">
          <span class="card__price">$${p.price}</span>
          <button class="card__add-btn" data-id="${p.id}">Add</button>
        </div>
      </div>
    </li>`).join('');

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.card__add-btn');
    if (!btn) return;
    const pid = btn.dataset.id;
    const prod = PRODUCTS.find(p => String(p.id) === String(pid));
    if (!prod) return;
    addToCart(pid);
    showToast(`"${prod.name}" added to cart`);
    btn.classList.add('added'); btn.textContent = 'Added ✓';
    setTimeout(() => { btn.classList.remove('added'); btn.textContent = 'Add'; }, 1500);
  });
};

const updateQtyDisplay = () => {
  const el = document.getElementById('qty-value');
  if (el) el.textContent = currentQty;
};

const initProductPage = async () => {
  const id = getIdFromURL();
  if (!id) { window.location.href = 'index.html'; return; }

  currentProduct = await fetchProductById(id);

  if (!currentProduct) {
    document.getElementById('product-loading').innerHTML =
      '<p style="color:var(--clr-text-muted);font-family:var(--font-body);text-align:center;">Product not found. <a href="index.html" style="color:var(--clr-gold-light)">Go back</a></p>';
    return;
  }

  if (!PRODUCTS || PRODUCTS.length === 0) await fetchProducts();

  renderProduct(currentProduct);
  renderCartUI();
  renderNavAuth();

  document.getElementById('qty-minus')?.addEventListener('click', () => { if (currentQty > 1) { currentQty--; updateQtyDisplay(); } });
  document.getElementById('qty-plus')?.addEventListener('click', () => { if (currentQty < 10) { currentQty++; updateQtyDisplay(); } });

  document.getElementById('add-to-cart-btn')?.addEventListener('click', () => {
    for (let i = 0; i < currentQty; i++) addToCart(currentProduct.id);
    showToast(`"${currentProduct.name}" × ${currentQty} added to cart`);
    const btn = document.getElementById('add-to-cart-btn');
    btn.classList.add('added'); btn.textContent = 'Added ✓';
    setTimeout(() => {
      btn.classList.remove('added');
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg> Add to Cart`;
    }, 1500);
  });

  document.getElementById('buy-now-btn')?.addEventListener('click', () => {
    for (let i = 0; i < currentQty; i++) addToCart(currentProduct.id);
    window.location.href = 'checkout.html';
  });

  document.getElementById('cart-toggle-btn')?.addEventListener('click', openCartDrawer);
  document.getElementById('cart-close-btn')?.addEventListener('click', closeCartDrawer);
  document.getElementById('cart-overlay')?.addEventListener('click', closeCartDrawer);
  document.getElementById('cart-items-list')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const pid    = btn.dataset.id;
    if (action === 'increment') addToCart(pid);
    if (action === 'decrement') decrementCartItem(pid);
    if (action === 'remove')    removeFromCart(pid);
  });
  document.getElementById('clear-cart-btn')?.addEventListener('click', () => {
    if (cart.length === 0) { showToast('Cart is already empty', 'warning'); return; }
    clearCart();
  });
};

document.addEventListener('DOMContentLoaded', initProductPage);
