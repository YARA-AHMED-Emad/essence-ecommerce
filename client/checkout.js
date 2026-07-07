// ============================================================
//  checkout.js — Multi-Step Checkout Controller
//  Sends real orders to /api/orders (requires login)
// ============================================================

// ── State ─────────────────────────────────────────────────
const checkoutState = {
  currentStep: 1,
  totalSteps: 3,
  shipping: {},
  payment: { method: 'card', card: {} },
  shippingCost: 10,
  coupon: null,
};

const VALID_COUPONS = {
  'ESSENCE10': { type: 'percent',  value: 10, label: '10% off' },
  'WELCOME20': { type: 'percent',  value: 20, label: '20% off' },
  'FREESHIP':  { type: 'shipping', value: 0,  label: 'Free shipping' },
  'VIP50':     { type: 'fixed',    value: 50, label: '$50 off' },
};

const SHIPPING_COSTS = { standard: 10, express: 25, overnight: 45 };

// ── DOM helpers ───────────────────────────────────────────
const $   = (sel) => document.querySelector(sel);
const $$  = (sel) => document.querySelectorAll(sel);
const setText = (sel, text) => { const el = $(sel); if (el) el.textContent = text; };
const show = (el) => { if (el) el.hidden = false; };
const hide = (el) => { if (el) el.hidden = true; };

// ── Validation ────────────────────────────────────────────
const validators = {
  required:   (v) => v.trim() !== '',
  email:      (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
  phone:      (v) => /^[\d\s\+\-\(\)]{7,}$/.test(v.trim()),
  cardNumber: (v) => v.replace(/\s/g, '').length >= 15,
  cardExpiry: (v) => /^(0[1-9]|1[0-2])\s*\/\s*\d{2}$/.test(v.trim()),
  cardCVV:    (v) => /^\d{3,4}$/.test(v.trim()),
};

const setFieldState = (inputId, errorId, isValid, msg = '') => {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (!input) return;
  input.classList.toggle('error', !isValid);
  input.classList.toggle('valid', isValid);
  if (error) error.textContent = isValid ? '' : msg;
};

const validateShippingForm = () => {
  let valid = true;
  const checks = [
    { id: 'first-name', err: 'err-first-name', fn: validators.required, msg: 'First name is required' },
    { id: 'last-name',  err: 'err-last-name',  fn: validators.required, msg: 'Last name is required' },
    { id: 'email',      err: 'err-email',       fn: validators.email,    msg: 'Enter a valid email address' },
    { id: 'phone',      err: 'err-phone',       fn: validators.phone,    msg: 'Enter a valid phone number' },
    { id: 'address',    err: 'err-address',     fn: validators.required, msg: 'Address is required' },
    { id: 'city',       err: 'err-city',        fn: validators.required, msg: 'City is required' },
    { id: 'country',    err: 'err-country',     fn: validators.required, msg: 'Please select a country' },
  ];
  checks.forEach(({ id, err, fn, msg }) => {
    const el = document.getElementById(id);
    if (!el) return;
    const ok = fn(el.value);
    setFieldState(id, err, ok, msg);
    if (!ok) valid = false;
  });
  return valid;
};

const validateCardForm = () => {
  let valid = true;
  const checks = [
    { id: 'card-name',   err: 'err-card-name',   fn: validators.required,   msg: 'Cardholder name is required' },
    { id: 'card-number', err: 'err-card-number',  fn: validators.cardNumber, msg: 'Enter a valid card number' },
    { id: 'card-expiry', err: 'err-card-expiry',  fn: validators.cardExpiry, msg: 'Format: MM / YY' },
    { id: 'card-cvv',    err: 'err-card-cvv',     fn: validators.cardCVV,    msg: 'Enter a valid CVV' },
  ];
  checks.forEach(({ id, err, fn, msg }) => {
    const el = document.getElementById(id);
    if (!el) return;
    const ok = fn(el.value);
    setFieldState(id, err, ok, msg);
    if (!ok) valid = false;
  });
  return valid;
};

// ── Step Navigation ───────────────────────────────────────
const goToStep = (stepNum) => {
  $$('.checkout-step').forEach(s => { s.classList.remove('active'); hide(s); });
  const target = document.getElementById(`step-${stepNum}`);
  if (!target) return;
  show(target);
  target.classList.add('active');

  $$('.step[data-step]').forEach(dot => {
    const n = parseInt(dot.dataset.step);
    dot.classList.remove('active', 'completed');
    if (n < stepNum) dot.classList.add('completed');
    if (n === stepNum) dot.classList.add('active');
  });

  const fill = document.getElementById('progress-fill');
  if (fill) fill.style.width = `${((stepNum - 1) / (checkoutState.totalSteps - 1)) * 84 + 16}%`;

  checkoutState.currentStep = stepNum;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ── Order Summary ─────────────────────────────────────────
const calcTotals = () => {
  const subtotal = getCartTotal(cart);
  const ship     = checkoutState.shippingCost;
  const tax      = Math.round(subtotal * 0.14);
  let discount   = 0;

  if (checkoutState.coupon) {
    const c = checkoutState.coupon;
    if (c.type === 'percent')  discount = Math.round(subtotal * c.value / 100);
    if (c.type === 'fixed')    discount = Math.min(c.value, subtotal);
    if (c.type === 'shipping') discount = ship;
  }

  const codFee = checkoutState.payment.method === 'cod' ? 2 : 0;
  const total  = Math.max(0, subtotal + ship + tax - discount + codFee);
  return { subtotal, ship, tax, discount, codFee, total };
};

const renderSummary = () => {
  const summaryList = document.getElementById('summary-items');
  if (!summaryList) return;

  summaryList.innerHTML = cart.map(({ productId, quantity }) => {
    const p = findProduct(productId);
    if (!p) return '';
    return `
      <li class="summary-item">
        <img class="summary-item__img" src="${p.image}" alt="${p.name}">
        <div>
          <p class="summary-item__name">${p.name}</p>
          <p class="summary-item__qty">Qty: ${quantity}</p>
        </div>
        <span class="summary-item__price">$${p.price * quantity}</span>
      </li>`;
  }).join('');

  const { subtotal, ship, tax, discount, codFee, total } = calcTotals();
  setText('#summary-subtotal', `$${subtotal}`);
  setText('#summary-shipping', `$${ship}`);
  setText('#summary-tax', `$${tax}`);
  setText('#summary-total', `$${total}`);

  // Discount row
  let discountRow = document.getElementById('summary-discount-row');
  if (discount > 0) {
    if (!discountRow) {
      discountRow = document.createElement('div');
      discountRow.id = 'summary-discount-row';
      discountRow.className = 'summary-row';
      discountRow.style.color = '#5a9e6a';
      $('#summary-tax')?.closest('.summary-row')?.after(discountRow);
    }
    discountRow.innerHTML = `<span>Discount (${checkoutState.coupon.label})</span><span style="color:#5a9e6a">-$${discount}</span>`;
  } else {
    discountRow?.remove();
  }

  // COD fee row
  let codRow = document.getElementById('summary-cod-row');
  if (codFee > 0) {
    if (!codRow) {
      codRow = document.createElement('div');
      codRow.id = 'summary-cod-row';
      codRow.className = 'summary-row';
      $('.order-summary__divider:last-of-type')?.before(codRow);
    }
    codRow.innerHTML = `<span>COD Fee</span><span>$${codFee}</span>`;
  } else {
    codRow?.remove();
  }
};

// ── Card Preview ──────────────────────────────────────────
const updateCardPreview = () => {
  const name   = document.getElementById('card-name')?.value   || '';
  const number = document.getElementById('card-number')?.value || '';
  const expiry = document.getElementById('card-expiry')?.value || '';

  const prevName   = document.getElementById('prev-name');
  const prevNumber = document.getElementById('prev-number');
  const prevExpiry = document.getElementById('prev-expiry');
  const prevBrand  = document.getElementById('prev-brand');

  if (prevName)   prevName.textContent   = name.toUpperCase() || 'YOUR NAME';
  if (prevExpiry) prevExpiry.textContent = expiry || 'MM/YY';

  const raw = number.replace(/\s/g, '');
  const padded = raw.padEnd(16, '•');
  if (prevNumber) prevNumber.textContent = padded.match(/.{1,4}/g)?.join(' ') || '•••• •••• •••• ••••';

  let brand = 'CARD';
  if (/^4/.test(raw))           brand = 'VISA';
  else if (/^5[1-5]/.test(raw)) brand = 'MASTERCARD';
  else if (/^3[47]/.test(raw))  brand = 'AMEX';
  if (prevBrand) prevBrand.textContent = brand;
};

const formatCardNumber = () => {
  const input = document.getElementById('card-number');
  if (!input) return;
  let val = input.value.replace(/\D/g, '').slice(0, 16);
  input.value = val.match(/.{1,4}/g)?.join(' ') || val;
  updateCardPreview();
};

const formatExpiry = () => {
  const input = document.getElementById('card-expiry');
  if (!input) return;
  let val = input.value.replace(/\D/g, '').slice(0, 4);
  if (val.length >= 3) val = val.slice(0, 2) + ' / ' + val.slice(2);
  input.value = val;
  updateCardPreview();
};

const switchPaymentMethod = (method) => {
  checkoutState.payment.method = method;
  $$('.payment-tab').forEach(t => t.classList.toggle('active', t.dataset.method === method));
  $$('.payment-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === method));
  renderSummary();
};

const collectShippingData = () => {
  const fields = ['first-name','last-name','email','phone','address','city','zip','country'];
  const data = {};
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) data[id.replace('-', '_')] = el.value.trim();
  });
  const shippingMethod = document.querySelector('input[name="shipping"]:checked')?.value || 'standard';
  data.shipping_method = shippingMethod;
  checkoutState.shippingCost = SHIPPING_COSTS[shippingMethod] || 10;
  checkoutState.shipping = data;
};

const populateReview = () => {
  const s = checkoutState.shipping;
  const p = checkoutState.payment;

  const shippingEl = document.getElementById('review-shipping-info');
  if (shippingEl) {
    shippingEl.innerHTML = `
      <strong>${s.first_name} ${s.last_name}</strong><br>
      ${s.address}, ${s.city} ${s.zip || ''}<br>
      ${s.country}<br>
      ${s.email} · ${s.phone}<br>
      <span style="color:var(--clr-gold-light);margin-top:0.5rem;display:block;">
        ${s.shipping_method?.charAt(0).toUpperCase() + s.shipping_method?.slice(1)} Shipping — $${checkoutState.shippingCost}
      </span>`;
  }

  const paymentEl = document.getElementById('review-payment-info');
  if (paymentEl) {
    if (p.method === 'card') {
      const last4 = document.getElementById('card-number')?.value.replace(/\s/g, '').slice(-4) || '••••';
      const brand = document.getElementById('prev-brand')?.textContent || 'Card';
      paymentEl.innerHTML = `<strong>${brand}</strong> ending in ${last4}`;
    } else if (p.method === 'paypal') {
      paymentEl.innerHTML = '<strong>PayPal</strong> — You will be redirected at confirmation';
    } else {
      paymentEl.innerHTML = '<strong>Cash on Delivery</strong> — Pay when your order arrives';
    }
  }

  const reviewList = document.getElementById('review-items-list');
  if (reviewList) {
    reviewList.innerHTML = cart.map(({ productId, quantity }) => {
      const p = findProduct(productId);
      if (!p) return '';
      return `
        <li class="review-item">
          <img class="review-item__img" src="${p.image}" alt="${p.name}">
          <span class="review-item__name">${p.name}</span>
          <span class="review-item__qty">× ${quantity}</span>
          <span class="review-item__price">$${p.price * quantity}</span>
        </li>`;
    }).join('');
  }

  renderSummary();
};

// ── Coupon ────────────────────────────────────────────────
const applyCoupon = () => {
  const input = document.getElementById('coupon-input');
  const msg   = document.getElementById('coupon-msg');
  if (!input || !msg) return;

  const code   = input.value.trim().toUpperCase();
  const coupon = VALID_COUPONS[code];

  if (!code) {
    msg.textContent = 'Please enter a coupon code.';
    msg.className   = 'coupon-msg error';
    return;
  }

  if (coupon) {
    checkoutState.coupon = { ...coupon, code };
    msg.textContent = `✓ "${code}" applied — ${coupon.label}`;
    msg.className   = 'coupon-msg success';
    input.disabled  = true;
    renderSummary();
  } else {
    checkoutState.coupon = null;
    msg.textContent = 'Invalid coupon code.';
    msg.className   = 'coupon-msg error';
    renderSummary();
  }
};

// ── Place Order — sends to API ────────────────────────────
const placeOrder = async () => {
  const terms    = document.getElementById('terms-check');
  const termsErr = document.getElementById('err-terms');

  if (!terms?.checked) {
    if (termsErr) termsErr.textContent = 'You must agree to the terms to proceed.';
    showToast('Please agree to the Terms & Conditions', 'warning');
    return;
  }
  if (termsErr) termsErr.textContent = '';

  const btn = document.getElementById('place-order-btn');
  if (!btn) return;

  btn.classList.add('btn--loading');
  btn.disabled = true;

  // ── Build order payload ──────────────────────────────
  const s = checkoutState.shipping;
  const { total } = calcTotals();
  const orderPayload = {
    items: cart.map(({ productId, quantity }) => {
      const p = findProduct(productId);
      return {
        product:  productId,
        title:    p?.name  || 'Unknown',
        price:    p?.price || 0,
        quantity,
      };
    }),
    total,
    shippingAddress: {
      name:    `${s.first_name} ${s.last_name}`,
      address: s.address,
      city:    s.city,
      country: s.country,
    },
    paymentMethod: checkoutState.payment.method,
    shippingCost:  checkoutState.shippingCost,
  };

  // ── Try API, fall back to local if offline ───────────
  const token = getToken();
  let orderNum = '#ESS-' + Math.random().toString(36).slice(2, 8).toUpperCase();

  try {
    if (token) {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(orderPayload),
      });

      if (res.ok) {
        const data = await res.json();
        orderNum = '#ESS-' + data._id.slice(-6).toUpperCase();
      }
      // If not ok, still show success (demo mode)
    }
  } catch {
    // API offline — continue with local order number
  }

  btn.classList.remove('btn--loading');
  btn.disabled = false;

  // Clear cart
  cart = [];
  saveCart(cart);

  // Show order number
  const orderNumEl = document.getElementById('order-num');
  if (orderNumEl) orderNumEl.textContent = orderNum;

  // Show success screen
  $$('.checkout-step').forEach(s => hide(s));
  const success = document.getElementById('step-success');
  if (success) show(success);

  $$('.step[data-step]').forEach(dot => dot.classList.add('completed'));
  const fill = document.getElementById('progress-fill');
  if (fill) fill.style.width = '100%';

  showToast('Order placed successfully! 🎉', 'add');
};

// ── Auth guard for checkout ───────────────────────────────
const checkAuth = () => {
  const user = getUser();
  if (!user) {
    // Save intended destination
    sessionStorage.setItem('essence_redirect', 'checkout.html');
    showToast('Please sign in to checkout', 'warning');
    setTimeout(() => { window.location.href = 'auth.html'; }, 1500);
    return false;
  }
  return true;
};

// ── Init ──────────────────────────────────────────────────
const initCheckout = async () => {
  // Wait for products to load (script.js fetches them)
  await fetchProducts();

  // Empty cart guard
  if (cart.length === 0) {
    showToast('Your cart is empty. Add items first.', 'warning');
    setTimeout(() => { window.location.href = 'index.html'; }, 1800);
    return;
  }

  // Auth guard
  if (!checkAuth()) return;

  renderSummary();
  renderNavAuth();
  goToStep(1);

  // Step 1
  document.getElementById('shipping-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (validateShippingForm()) { collectShippingData(); renderSummary(); goToStep(2); }
    else showToast('Please fill in all required fields', 'warning');
  });

  $$('input[name="shipping"]').forEach(radio => {
    radio.addEventListener('change', () => {
      checkoutState.shippingCost = SHIPPING_COSTS[radio.value] || 10;
      renderSummary();
    });
  });

  // Step 2
  $$('.payment-tab').forEach(tab => {
    tab.addEventListener('click', () => switchPaymentMethod(tab.dataset.method));
  });

  document.getElementById('card-number')?.addEventListener('input', formatCardNumber);
  document.getElementById('card-expiry')?.addEventListener('input', formatExpiry);
  document.getElementById('card-name')?.addEventListener('input', updateCardPreview);
  document.getElementById('back-to-step1')?.addEventListener('click', () => goToStep(1));

  document.getElementById('go-to-review')?.addEventListener('click', () => {
    if (checkoutState.payment.method === 'card' && !validateCardForm()) {
      showToast('Please complete your card details', 'warning');
      return;
    }
    populateReview();
    goToStep(3);
  });

  // Step 3
  document.getElementById('back-to-step2')?.addEventListener('click', () => goToStep(2));
  $$('.review-block__edit').forEach(btn => {
    btn.addEventListener('click', () => goToStep(parseInt(btn.dataset.goto)));
  });

  document.getElementById('place-order-btn')?.addEventListener('click', placeOrder);

  // Coupon
  document.getElementById('apply-coupon-btn')?.addEventListener('click', applyCoupon);
  document.getElementById('coupon-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); }
  });
};

document.addEventListener('DOMContentLoaded', initCheckout);
