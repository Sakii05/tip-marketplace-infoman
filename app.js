/* ═══════════════════════════════════════════════════════════════
   TIP Student Marketplace — app.js (Final Production Version)
   ═══════════════════════════════════════════════════════════════ */

'use strict';

const DB_KEYS = {
  users: 'tip_users',
  products: 'tip_products',
  messages: 'tip_messages',
  session: 'tip_session',
  wishlist: 'tip_wishlist',
};

/* ════════════════════════════════════════════════════════════════
   1. DB LAYER — Cloudflare D1 API
   ════════════════════════════════════════════════════════════════ */

const DB = {
  // Fetching from Cloudflare Functions
  async getUsers() { return await fetch('/api/users').then(r => r.json()); },
  async getProducts() { return await fetch('/api/listings').then(r => r.json()); },
  async getMessages() { return await fetch('/api/messages').then(r => r.json()); },

  // Local state management
  getSession() { return JSON.parse(localStorage.getItem(DB_KEYS.session) || 'null'); },
  getWishlist() { return JSON.parse(localStorage.getItem(DB_KEYS.wishlist) || '[]'); },
  saveSession(data) { localStorage.setItem(DB_KEYS.session, JSON.stringify(data)); },
  saveWishlist(data) { localStorage.setItem(DB_KEYS.wishlist, JSON.stringify(data)); },

  async createUser(name, email, password, course = '') {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, course })
    });
    return await res.json();
  },

  async createProduct(productData) {
    const res = await fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    return await res.json();
  },

  async sendMessage(msgData) {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msgData)
    });
    return await res.json();
  },

  async getThread(userAId, userBId) {
    const messages = await this.getMessages();
    return messages.filter(m =>
      (m.senderId === userAId && m.receiverId === userBId) ||
      (m.senderId === userBId && m.receiverId === userAId)
    ).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
};

/* ════════════════════════════════════════════════════════════════
   2. UI & STATE
   ════════════════════════════════════════════════════════════════ */

let currentPage = 'home', activeCategory = 'All', activeChatId = null;

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function showToast(msg, type = 'info') {
  const container = $('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/* ════════════════════════════════════════════════════════════════
   3. NAVIGATION & RENDERING (Async)
   ════════════════════════════════════════════════════════════════ */

async function navigateTo(page) {
  const session = DB.getSession();
  if (['upload', 'profile', 'chat'].includes(page) && !session) {
    openModal('auth-modal');
    return;
  }

  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  const target = $(`page-${page}`);
  if (target) target.classList.add('active');
  currentPage = page;

  if (page === 'home') await renderProducts();
  if (page === 'chat') await renderChat();
  if (page === 'profile') await renderProfilePage();
}

async function renderProducts() {
  const grid = $('products-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="empty-state"><h3>Loading Listings...</h3></div>';

  try {
    const products = await DB.getProducts();
    const filtered = activeCategory === 'All' ? products : products.filter(p => p.category === activeCategory);

    if (!filtered.length) {
      grid.innerHTML = '<div class="empty-state"><h3>No items found.</h3></div>';
      return;
    }

    grid.innerHTML = filtered.map(p => `
      <div class="product-card" onclick="openProductModal('${p.id}')">
        <div class="card-body">
          <div class="card-title">${esc(p.title)}</div>
          <div class="card-price">₱${p.price}</div>
        </div>
      </div>`).join('');
  } catch (err) {
    grid.innerHTML = '<div class="empty-state"><h3>Error loading data.</h3></div>';
  }
}

/* ════════════════════════════════════════════════════════════════
   4. EVENT HANDLERS
   ════════════════════════════════════════════════════════════════ */

function setupEventListeners() {
  // Navigation
  document.addEventListener('click', e => {
    const target = e.target.closest('[data-page]');
    if (target) navigateTo(target.dataset.page);
  });

  // Login Form
  $('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('login-email').value;
    const pass = $('login-password').value;

    try {
      const users = await DB.getUsers();
      // Temporary check until you write a proper login endpoint
      const user = users.find(u => u.email === email && u.password_hash === btoa(pass));

      if (user) {
        DB.saveSession(user);
        closeModal('auth-modal');
        navigateTo('home');
        showToast('Successfully logged in!', 'success');
      } else {
        showToast('Invalid credentials', 'error');
      }
    } catch (err) {
      showToast('Database connection error', 'error');
    }
  });

  // Registration Form (THE FIX IS HERE)
  $('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('reg-name').value;
    const email = $('reg-email').value;
    const course = $('reg-course').value;
    const password = $('reg-password').value;

    try {
      const data = await DB.createUser(name, email, password, course);

      if (data && data.user) {
        showToast(`Account created! Welcome, ${data.user.full_name}`, 'success');
        e.target.reset();

        // Auto-switch to the login tab so they can sign in
        setTimeout(() => {
          document.querySelector('[data-tab="login"]').click();
        }, 1500);
      } else {
        showToast(data.error || 'Registration failed. Email might exist.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Server connection error.', 'error');
    }
  });
}

/* ════════════════════════════════════════════════════════════════
   5. INIT 
   ════════════════════════════════════════════════════════════════ */

function init() {
  setupEventListeners();
  navigateTo('home');
}

document.addEventListener('DOMContentLoaded', init);

// Modal Helpers
function openModal(id) { $(id).classList.add('active'); }
function closeModal(id) { $(id).classList.remove('active'); }
window.closeModal = closeModal;