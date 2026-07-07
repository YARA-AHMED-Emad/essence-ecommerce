// ============================================================
//  script.js — Main Frontend Logic
//  Products come from API, fallback to local data if offline
// ============================================================

const API_BASE = 'https://essence-backend-api.onrender.com';

// ── Auth helpers (shared across all pages) ────────────────
const getUser  = () => { try { return JSON.parse(localStorage.getItem('essence_user')); } catch { return null; } };
const getToken = () => getUser()?.token || null;
const removeUser = () => localStorage.removeItem('essence_user');

// ── Fallback data (if API is offline) ────────────────────
const PRODUCTS_FALLBACK = [
  { id: 1, name: 'Midnight Rose',  price: 15.000, image: 'coco.jpeg',   rating: 5 },
  { id: 2, name: 'Golden Oud',     price: 12.500, image: 'gcoco.jpeg',  rating: 5 },
  { id: 3, name: 'Velvet Musk',    price: 7.500, image: 'v.jpeg',      rating: 4 },
  { id: 4, name: 'Silver Sage',    price: 14.500,  image: 's.jpeg',      rating: 5 },
  { id: 5, name: 'Ocean Breeze',   price: 11.500, image: 'o.jpeg',      rating: 4 },
  { id: 6, name: 'Amber Night',    price: 14.500, image: 'a.jpeg',      rating: 5 },
  { id: 7, name: 'Floral Bloom',   price: 16.500, image: 'fl.jpeg',     rating: 3 },
  { id: 8, name: 'Desert Sand',    price: 800, image: 'desert.jpeg', rating: 5 },
  { id: 9, name: 'Mystic Wood',    price: 15.000, image: 'my.jpeg',     rating: 4 },
];

// ── Global products array (filled from API or fallback) ───
let PRODUCTS = [];

// ── Fetch products from API ───────────────────────────────
const fetchProducts = async () => {
  try {
    const res = await fetch(`${API_BASE}/products`);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();

    // Normalize MongoDB _id → id for compatibility
    PRODUCTS = data.map(p => ({
      id:     p._id,
      name:   p.title,
      price:  p.price,
      image:  p.image,
      rating: p.rating,
      badge:  p.badge,
      stock:  p.stock,
    }));

    window.dispatchEvent(new Event("products-ready"));
    return true;
  } catch {
    // API offline — use fallback silently
    PRODUCTS = PRODUCTS_FALLBACK;
    window.dispatchEvent(new Event("products-ready"));
    return false;
  }
};

// ============================================================
//  STATE — Cart
// ============================================================

const loadCart = () => {
  try {
    const stored = localStorage.getItem('essence_cart');
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
};

const saveCart = (cart) => {
  try { localStorage.setItem('essence_cart', JSON.stringify(cart)); } catch {}
};

let cart = loadCart();

// ============================================================
//  PURE HELPERS
// ============================================================

const findCartItem = (cart, productId) => cart.find(i => i.productId === productId);
const findProduct  = (productId) => PRODUCTS.find(p => String(p.id) === String(productId));
const getCartCount = (cart) => cart.reduce((sum, i) => sum + i.quantity, 0);
const getCartTotal = (cart) => cart.reduce((sum, i) => {
  const product = findProduct(i.productId);
  return sum + (product ? product.price * i.quantity : 0);
}, 0);

const buildRatingHTML = (rating, max = 5) =>
  Array.from({ length: max }, (_, idx) =>
    `<span class="${idx < rating ? 'star--filled' : 'star--empty'}">★</span>`
  ).join('');

// ============================================================
//  CART MUTATIONS
// ============================================================

const addToCart = (productId) => {
  const existing = findCartItem(cart, productId);
  cart = existing
    ? cart.map(i => i.productId === String(productId) ? { ...i, quantity: i.quantity + 1 } : i)
    : [...cart, { productId: String(productId), quantity: 1 }];
  saveCart(cart);
  renderCartUI();
};

const decrementCartItem = (productId) => {
  const existing = findCartItem(cart, productId);
  if (!existing) return;
  if (existing.quantity <= 1) {
    removeFromCart(productId);
  } else {
    cart = cart.map(i => i.productId === String(productId) ? { ...i, quantity: i.quantity - 1 } : i);
    saveCart(cart);
    renderCartUI();
  }
};

const removeFromCart = (productId) => {
  const product = findProduct(productId);
  cart = cart.filter(i => i.productId !== String(productId));
  saveCart(cart);
  renderCartUI();
  if (product) showToast(`"${product.name}" removed`, 'remove');
};

const clearCart = () => {
  if (cart.length === 0) return;
  cart = [];
  saveCart(cart);
  renderCartUI();
  showToast('Your cart has been cleared', 'clear');
};

// ============================================================
//  UI RENDERERS
// ============================================================

const renderCartUI = () => {
  const countEl = document.getElementById('cart-count');
  const totalEl = document.getElementById('cart-total');
  const listEl  = document.getElementById('cart-items-list');

  const count = getCartCount(cart);
  const total = getCartTotal(cart);

  if (countEl) {
    countEl.textContent = count;
    countEl.classList.remove('bump');
    void countEl.offsetWidth;
    countEl.classList.add('bump');
  }

  if (totalEl) totalEl.textContent = `₤${total}`;
  if (!listEl) return;

  if (cart.length === 0) {
    listEl.innerHTML = `
      <li class="cart-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
        <p>Your cart is empty</p>
      </li>`;
    return;
  }

  listEl.innerHTML = cart.map(({ productId, quantity }) => {
    const product = findProduct(productId);
    if (!product) return '';
    return `
      <li class="cart-item" data-cart-item="${productId}">
        <img class="cart-item__img" src="${product.image}" alt="${product.name}">
        <div class="cart-item__info">
          <p class="cart-item__name">${product.name}</p>
          <div class="cart-item__qty">
            <button class="cart-item__qty-btn" data-action="decrement" data-id="${productId}" aria-label="Decrease quantity">−</button>
            <span class="cart-item__qty-count">${quantity}</span>
            <button class="cart-item__qty-btn" data-action="increment" data-id="${productId}" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <div>
          <p class="cart-item__price">₤${product.price * quantity}</p>
          <button class="btn--icon" style="margin-top:0.5rem;font-size:0.75rem;" data-action="remove" data-id="${productId}" aria-label="Remove ${product.name}">✕</button>
        </div>
      </li>`;
  }).join('');
};

// ── Navbar: show user name or Sign In link ─────────────────
const renderNavAuth = () => {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  // Remove old auth element if exists
  navbar.querySelector('.navbar__auth')?.remove();

  const user = getUser();
  const authEl = document.createElement('div');
  authEl.className = 'navbar__auth';

  if (user) {
    authEl.innerHTML = `
      <span class="navbar__user-name">✦ ${user.name.split(' ')[0]}</span>
      <button class="navbar__logout-btn" id="logout-btn">Sign Out</button>
    `;
  } else {
    authEl.innerHTML = `
      <a href="auth.html" class="navbar__signin-btn">Sign In</a>
    `;
  }

  // Insert before cart button
  const cartBtn = navbar.querySelector('.navbar__cart-btn');
  if (cartBtn) navbar.insertBefore(authEl, cartBtn);

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    removeUser();
    showToast('Signed out successfully', 'clear');
    setTimeout(() => window.location.reload(), 800);
  });
};

// ============================================================
//  TOAST SYSTEM
// ============================================================

const showToast = (message, type = 'add') => {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { add: '✦', remove: '✕', clear: '◇', warning: '⚠' };
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'status');
  toast.innerHTML = `<span style="color:var(--clr-gold-light)">${icons[type] || '✦'}</span> ${message}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 3000);
};

// ============================================================
//  CART DRAWER
// ============================================================

const openCartDrawer = () => {
  document.getElementById('cart-drawer')?.classList.add('open');
  document.getElementById('cart-overlay')?.classList.add('active');
  document.getElementById('cart-drawer')?.setAttribute('aria-hidden', 'false');
};

const closeCartDrawer = () => {
  document.getElementById('cart-drawer')?.classList.remove('open');
  document.getElementById('cart-overlay')?.classList.remove('active');
  document.getElementById('cart-drawer')?.setAttribute('aria-hidden', 'true');
};

// ============================================================
//  EVENT DELEGATION
// ============================================================

const onProductGridClick = (e) => {
  const btn = e.target.closest('[data-id]');
  if (!btn || !btn.classList.contains('card__add-btn')) return;

  const productId = btn.dataset.id;
  const product   = findProduct(productId);
  if (!product) return;

  addToCart(productId);
  showToast(`"${product.name}" added to cart`);

  btn.classList.add('added');
  btn.textContent = 'Added ✓';
  setTimeout(() => { btn.classList.remove('added'); btn.textContent = 'Add'; }, 1500);
};

const onCartDrawerClick = (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action    = btn.dataset.action;
  const productId = btn.dataset.id;
  if (action === 'increment') addToCart(productId);
  if (action === 'decrement') decrementCartItem(productId);
  if (action === 'remove')    removeFromCart(productId);
};

// ============================================================
//  INIT
// ============================================================

const init = async () => {
  // Fetch products first, then render everything
  await fetchProducts();

  renderCartUI();
  renderNavAuth();

  document.getElementById('products-grid')?.addEventListener('click', onProductGridClick);
  document.getElementById('cart-items-list')?.addEventListener('click', onCartDrawerClick);
  document.getElementById('cart-toggle-btn')?.addEventListener('click', openCartDrawer);
  document.getElementById('cart-close-btn')?.addEventListener('click', closeCartDrawer);
  document.getElementById('cart-overlay')?.addEventListener('click', closeCartDrawer);

  document.getElementById('clear-cart-btn')?.addEventListener('click', () => {
    if (cart.length === 0) { showToast('Cart is already empty', 'warning'); return; }
    clearCart();
  });
};

document.addEventListener('DOMContentLoaded', init);
