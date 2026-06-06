/* ── Tão Doce Quanto Ella — app.js ──────────────────────────────────────── */

const API = 'https://banco.pythonanywhere.com';

let produtos = [];
let cart = [];
let configStore = {};

/* ── Toast ─────────────────────────────────────────────────────────────── */
function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', '': 'ℹ' };
  el.innerHTML = `<span>${icons[type] || 'ℹ'}</span> ${msg}`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

/* ── API ────────────────────────────────────────────────────────────────── */
async function fetchProdutos() {
  try {
    const r = await fetch(`${API}/api/produtos`);
    if (!r.ok) throw new Error();
    produtos = await r.json();
    return produtos;
  } catch {
    return [];
  }
}

async function fetchConfig() {
  try {
    const r = await fetch(`${API}/api/configuracoes`);
    if (!r.ok) throw new Error();
    configStore = await r.json();
  } catch {
    configStore = {};
  }
}

/* ── Image helper ───────────────────────────────────────────────────────── */
function imgSrc(imagem) {
  if (!imagem) return null;
  return `${API}/uploads/${imagem}`;
}

function emojiPorCategoria(cat = '') {
  const map = {
    'brigadeiros': '🍫', 'bolos de pote': '🍮', 'bolos': '🎂',
    'trufas': '🍬', 'caixas': '🎁', 'docinhos': '🍭',
    'tortas': '🥧', 'cookies': '🍪'
  };
  return map[cat.toLowerCase()] || '🍰';
}

function produtoImgHtml(p, cls = 'produto-img') {
  const src = imgSrc(p.imagem);
  if (src) {
    return `<div class="${cls}"><img src="${src}" alt="${p.nome}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'produto-img-placeholder\\'>${emojiPorCategoria(p.categoria)}</div>'"></div>`;
  }
  return `<div class="${cls}"><div class="produto-img-placeholder">${emojiPorCategoria(p.categoria)}</div></div>`;
}

/* ── Render catálogo ────────────────────────────────────────────────────── */
function renderCatalogo(filtro = 'todos') {
  const grid = document.getElementById('produtos-grid');
  if (!grid) return;

  const lista = filtro === 'todos' ? produtos : produtos.filter(p => p.categoria === filtro);

  if (lista.length === 0) {
    grid.innerHTML = `<div class="empty-state"><span>🍰</span><p>Nenhum produto encontrado.</p></div>`;
    return;
  }

  grid.innerHTML = lista.map(p => `
    <div class="produto-card" data-id="${p.id}">
      ${produtoImgHtml(p)}
      <div class="produto-body">
        <div class="produto-cat">${p.categoria}</div>
        <div class="produto-nome">${p.nome}</div>
        <div class="produto-desc">${p.descricao || ''}</div>
        <div class="produto-footer">
          <div class="produto-preco"><span>R$</span>${Number(p.preco).toFixed(2).replace('.', ',')}</div>
          <button class="add-btn" onclick="addToCart(${p.id})" title="Adicionar ao carrinho">+</button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderDestaques() {
  const grid = document.getElementById('destaques-grid');
  if (!grid) return;
  const top = produtos.slice(0, 3);
  if (top.length === 0) return;

  grid.innerHTML = top.map(p => `
    <div class="produto-card destaque-item">
      ${produtoImgHtml(p)}
      <div class="produto-body">
        <div class="produto-cat">${p.categoria}</div>
        <div class="produto-nome">${p.nome}</div>
        <div class="produto-desc">${p.descricao || ''}</div>
        <div class="produto-footer">
          <div class="produto-preco"><span>R$</span>${Number(p.preco).toFixed(2).replace('.', ',')}</div>
          <button class="add-btn" onclick="addToCart(${p.id})" title="Adicionar ao carrinho">+</button>
        </div>
      </div>
    </div>
  `).join('');
}

/* ── Filtros ────────────────────────────────────────────────────────────── */
function buildFiltros() {
  const wrap = document.getElementById('categorias-filtro');
  if (!wrap) return;
  const cats = [...new Set(produtos.map(p => p.categoria).filter(Boolean))];

  const btns = [
    `<button class="cat-btn ativo" data-cat="todos" onclick="filtrar(this, 'todos')">Todos</button>`,
    ...cats.map(c => `<button class="cat-btn" data-cat="${c}" onclick="filtrar(this, '${c}')">${capitalizar(c)}</button>`)
  ];
  wrap.innerHTML = btns.join('');
}

function filtrar(btn, cat) {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('ativo'));
  btn.classList.add('ativo');
  renderCatalogo(cat);
}

function capitalizar(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ── Cart ───────────────────────────────────────────────────────────────── */
function addToCart(id) {
  const p = produtos.find(x => x.id === id);
  if (!p) return;
  const existing = cart.find(x => x.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ ...p, qty: 1 });
  }
  updateCartUI();
  animateCartBtn();
  toast(`${p.nome} adicionado!`, 'success');
}

function removeFromCart(id) {
  cart = cart.filter(x => x.id !== id);
  updateCartUI();
}

function changeQty(id, delta) {
  const item = cart.find(x => x.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(x => x.id !== id);
  }
  updateCartUI();
}

function getTotal() {
  return cart.reduce((s, i) => s + i.preco * i.qty, 0);
}

function updateCartUI() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  document.getElementById('cart-count').textContent = count;

  const itemsEl = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');

  if (cart.length === 0) {
    itemsEl.innerHTML = `
      <div class="cart-empty">
        <span>🛒</span>
        <p>Seu carrinho está vazio.<br>Adicione itens deliciosos!</p>
      </div>`;
    if (totalEl) totalEl.textContent = 'R$ 0,00';
    return;
  }

  itemsEl.innerHTML = cart.map(item => {
    const src = imgSrc(item.imagem);
    const imgHtml = src
      ? `<div class="cart-item-img"><img src="${src}" alt="${item.nome}" onerror="this.parentElement.innerHTML='${emojiPorCategoria(item.categoria)}'"></div>`
      : `<div class="cart-item-img">${emojiPorCategoria(item.categoria)}</div>`;
    return `
      <div class="cart-item">
        ${imgHtml}
        <div class="cart-item-info">
          <div class="cart-item-nome">${item.nome}</div>
          <div class="cart-item-preco">R$ ${Number(item.preco).toFixed(2).replace('.', ',')} cada</div>
        </div>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
          <span class="qty-val">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
          <button class="remove-btn" onclick="removeFromCart(${item.id})" title="Remover">✕</button>
        </div>
      </div>`;
  }).join('');

  if (totalEl) totalEl.textContent = `R$ ${getTotal().toFixed(2).replace('.', ',')}`;
}

function animateCartBtn() {
  const btn = document.getElementById('cart-btn');
  btn.style.transform = 'scale(1.1)';
  setTimeout(() => btn.style.transform = '', 200);
}

/* ── Cart drawer ────────────────────────────────────────────────────────── */
function openCart() {
  document.getElementById('cart-overlay').classList.add('open');
  document.getElementById('cart-drawer').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  document.getElementById('cart-overlay').classList.remove('open');
  document.getElementById('cart-drawer').classList.remove('open');
  document.body.style.overflow = '';
}

/* ── WhatsApp ───────────────────────────────────────────────────────────── */
function enviarPedido() {
  if (cart.length === 0) {
    toast('Adicione itens ao carrinho primeiro!', 'error');
    return;
  }
  const nome = document.getElementById('cliente-nome').value.trim();
  const obs = document.getElementById('cliente-obs').value.trim();
  if (!nome) {
    document.getElementById('cliente-nome').focus();
    toast('Por favor, informe seu nome.', 'error');
    return;
  }

  const itens = cart.map(i => `• ${i.qty}x ${i.nome} — R$ ${(i.preco * i.qty).toFixed(2).replace('.', ',')}`).join('\n');
  const total = `R$ ${getTotal().toFixed(2).replace('.', ',')}`;

  let msg = `Olá! Gostaria de fazer o seguinte pedido:\n\n${itens}\n\n*Total: ${total}*\n*Cliente:* ${nome}`;
  if (obs) msg += `\n*Observações:* ${obs}`;

  const numero = (configStore.whatsapp || '').replace(/\D/g, '');
  if (!numero) {
    toast('WhatsApp não configurado. Entre em contato diretamente.', 'error');
    return;
  }

  const url = `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

/* ── Navbar ─────────────────────────────────────────────────────────────── */
function initNavbar() {
  const nb = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    nb.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobile-nav');
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      mobileNav.classList.toggle('open');
    });
    mobileNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => mobileNav.classList.remove('open'));
    });
  }
}

/* ── Config info ────────────────────────────────────────────────────────── */
function updateContactInfo() {
  const map = {
    'info-whatsapp': configStore.whatsapp || '—',
    'info-instagram': configStore.instagram || '—',
    'info-endereco': configStore.endereco || '—',
    'info-horario': configStore.horario_funcionamento || '—',
  };
  Object.entries(map).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });
}

/* ── Scroll reveal ──────────────────────────────────────────────────────── */
function initReveal() {
  const els = document.querySelectorAll('[data-reveal]');
  if (!els.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  els.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    obs.observe(el);
  });
}

/* ── Init ───────────────────────────────────────────────────────────────── */
async function init() {
  initNavbar();

  // Listeners
  document.getElementById('cart-btn')?.addEventListener('click', openCart);
  document.getElementById('cart-close')?.addEventListener('click', closeCart);
  document.getElementById('cart-overlay')?.addEventListener('click', closeCart);
  document.getElementById('btn-pedido')?.addEventListener('click', enviarPedido);

  // Hero scroll
  document.getElementById('hero-cta')?.addEventListener('click', () => {
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
  });

  // Load data
  const [, ] = await Promise.all([fetchProdutos(), fetchConfig()]);

  renderDestaques();
  buildFiltros();
  renderCatalogo();
  updateContactInfo();
  updateCartUI();

  // Loading screen
  const loadingEl = document.getElementById('loading-produtos');
  if (loadingEl) loadingEl.remove();

  initReveal();
}

document.addEventListener('DOMContentLoaded', init);
