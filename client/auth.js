// ============================================================
//  auth.js — Login / Register Logic
//  Communicates with /api/users/login & /api/users/register
// ============================================================

const API = 'https://essence-backend-api.onrender.com';

// ── Token helpers ─────────────────────────────────────────
const saveUser  = (data) => localStorage.setItem('essence_user', JSON.stringify(data));
const getUser   = ()     => { try { return JSON.parse(localStorage.getItem('essence_user')); } catch { return null; } };
const removeUser= ()     => localStorage.removeItem('essence_user');
const getToken  = ()     => getUser()?.token || null;

// If already logged in, send to homepage
if (getUser()) window.location.href = 'index.html';

// ── Toast (standalone, no script.js dependency) ───────────
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

// ── Tab Switching ─────────────────────────────────────────
const tabLogin    = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const formLogin   = document.getElementById('form-login');
const formReg     = document.getElementById('form-register');
const indicator   = document.getElementById('tab-indicator');

const switchTab = (tab) => {
  if (tab === 'login') {
    tabLogin.classList.add('active');    tabLogin.setAttribute('aria-selected', 'true');
    tabRegister.classList.remove('active'); tabRegister.setAttribute('aria-selected', 'false');
    formLogin.classList.add('active');   formReg.classList.remove('active');
    indicator.classList.remove('right');
  } else {
    tabRegister.classList.add('active'); tabRegister.setAttribute('aria-selected', 'true');
    tabLogin.classList.remove('active'); tabLogin.setAttribute('aria-selected', 'false');
    formReg.classList.add('active');     formLogin.classList.remove('active');
    indicator.classList.add('right');
  }
  clearErrors();
};

tabLogin.addEventListener('click',    () => switchTab('login'));
tabRegister.addEventListener('click', () => switchTab('register'));

// Switch via text links inside forms
document.querySelectorAll('.auth-switch__btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.goto));
});

// ── Validation helpers ────────────────────────────────────
const setError = (id, msg) => {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
};

const markInput = (id, valid) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('valid', valid);
  el.classList.toggle('invalid', !valid);
};

const clearErrors = () => {
  ['login-email-err', 'login-pw-err',
   'reg-name-err', 'reg-email-err', 'reg-pw-err', 'reg-confirm-err']
    .forEach(id => { const el = document.getElementById(id); if (el) el.textContent = ''; });
  ['login-email', 'login-password', 'reg-name', 'reg-email', 'reg-password', 'reg-confirm']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.classList.remove('valid', 'invalid'); }
    });
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ── Password Strength ─────────────────────────────────────
const pwInput  = document.getElementById('reg-password');
const pwFill   = document.getElementById('pw-fill');
const pwLabel  = document.getElementById('pw-label');
const pwStrBox = document.getElementById('pw-strength');

const calcStrength = (pw) => {
  let score = 0;
  if (pw.length >= 6)  score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
};

pwInput?.addEventListener('input', () => {
  const val = pwInput.value;
  if (!val) { pwStrBox.hidden = true; return; }

  pwStrBox.hidden = false;
  const score = calcStrength(val);
  const pct   = (score / 5) * 100;
  const data  = [
    { label: 'Weak',   color: '#c0392b' },
    { label: 'Weak',   color: '#c0392b' },
    { label: 'Fair',   color: '#d4a017' },
    { label: 'Good',   color: '#2980b9' },
    { label: 'Strong', color: '#2a6b3c' },
    { label: 'Strong', color: '#2a6b3c' },
  ][score];

  pwFill.style.width      = `${pct}%`;
  pwFill.style.background = data.color;
  pwLabel.textContent     = data.label;
  pwLabel.style.color     = data.color;
});

// ── Password toggle visibility ────────────────────────────
document.querySelectorAll('.auth-toggle-pw').forEach(btn => {
  btn.addEventListener('click', () => {
    const input    = document.getElementById(btn.dataset.target);
    const showIcon = btn.querySelector('.eye-icon--show');
    const hideIcon = btn.querySelector('.eye-icon--hide');
    if (!input) return;

    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    showIcon.style.display = isHidden ? 'none' : '';
    hideIcon.style.display = isHidden ? '' : 'none';
  });
});

// ── Loading state helpers ─────────────────────────────────
const setLoading = (formId, loading) => {
  const btn    = document.querySelector(`#${formId} .auth-submit`);
  const text   = btn?.querySelector('.auth-submit__text');
  const loader = btn?.querySelector('.auth-submit__loader');
  if (!btn) return;
  btn.disabled     = loading;
  text.hidden      = loading;
  loader.hidden    = !loading;
};

// ── API calls ─────────────────────────────────────────────
const apiRegister = async (name, email, password) => {
  const res  = await fetch(`${API}/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  return { ok: res.ok, data: await res.json() };
};

const apiLogin = async (email, password) => {
  const res = await fetch(`${API}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return { ok: res.ok, data: await res.json() };
};

// ── LOGIN submit ──────────────────────────────────────────
formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();

  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  let valid = true;

  if (!isValidEmail(email)) {
    setError('login-email-err', 'Please enter a valid email address');
    markInput('login-email', false);
    valid = false;
  }

  if (!password) {
    setError('login-pw-err', 'Password is required');
    markInput('login-password', false);
    valid = false;
  }

  if (!valid) return;

  setLoading('form-login', true);

  try {
    const { ok, data } = await apiLogin(email, password);

    if (!ok) {
      setError('login-pw-err', data.message || 'Invalid credentials');
      markInput('login-password', false);
      return;
    }

    saveUser(data);
    showToast(`Welcome back, ${data.name}! ✦`);
    setTimeout(() => {
      // Go to originally requested page or homepage
      const redirect = sessionStorage.getItem('essence_redirect') || 'index.html';
      sessionStorage.removeItem('essence_redirect');
      window.location.href = redirect;
    }, 800);

  } catch {
    setError('login-pw-err', 'Cannot connect to server. Is it running?');
  } finally {
    setLoading('form-login', false);
  }
});

// ── REGISTER submit ───────────────────────────────────────
formReg.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();

  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm  = document.getElementById('reg-confirm').value;
  let valid = true;

  if (name.length < 2) {
    setError('reg-name-err', 'Name must be at least 2 characters');
    markInput('reg-name', false);
    valid = false;
  }

  if (!isValidEmail(email)) {
    setError('reg-email-err', 'Please enter a valid email address');
    markInput('reg-email', false);
    valid = false;
  }

  if (password.length < 6) {
    setError('reg-pw-err', 'Password must be at least 6 characters');
    markInput('reg-password', false);
    valid = false;
  }

  if (password !== confirm) {
    setError('reg-confirm-err', 'Passwords do not match');
    markInput('reg-confirm', false);
    valid = false;
  }

  if (!valid) return;

  setLoading('form-register', true);

  try {
    const { ok, data } = await apiRegister(name, email, password);

    if (!ok) {
      setError('reg-email-err', data.message || 'Registration failed');
      markInput('reg-email', false);
      return;
    }

    saveUser(data);
    showToast(`Account created! Welcome, ${data.name} ✦`);
    setTimeout(() => { window.location.href = 'index.html'; }, 800);

  } catch {
    setError('reg-email-err', 'Cannot connect to server. Is it running?');
  } finally {
    setLoading('form-register', false);
  }
});

// ── Live validation on blur ───────────────────────────────
document.getElementById('login-email')?.addEventListener('blur', function () {
  if (this.value) markInput('login-email', isValidEmail(this.value));
});

document.getElementById('reg-email')?.addEventListener('blur', function () {
  if (this.value) markInput('reg-email', isValidEmail(this.value));
});

document.getElementById('reg-confirm')?.addEventListener('input', function () {
  const pw = document.getElementById('reg-password').value;
  if (this.value) markInput('reg-confirm', this.value === pw);
});
