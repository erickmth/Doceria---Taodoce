/* ── Admin Panel — Tão Doce Quanto Ella ─────────────────────────────────── */

const API = 'https://banco.pythonanywhere.com';
let authToken = sessionStorage.getItem('admin_token') || '';
let produtos = [];
let editingId = null;
let uploadFile = null;

/* ── Toast ─────────────────────────────────────────────────────────────── */
function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', '': 'ℹ' };
  el.innerHTML = `<span>${icons[type] || 'ℹ'}</span> ${msg}`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/* ── Auth headers ───────────────────────────────────────────────────────── */
function authHeaders() {
  return { 'X-Admin-Password': authToken };
}

/* ── Login ──────────────────────────────────────────────────────────────── */
async function doLogin() {
  const pw = document.getElementById('login-pw').value;
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';

  try {
    const r = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw })
    });
    const data = await r.json();
    if (r.ok && data.success) {
      authToken = data.token;
      sessionStorage.setItem('admin_token', authToken);
      showApp();
    } else {
      errEl.textContent = data.error || 'Senha incorreta.';
      errEl.style.display = 'block';
    }
  } catch {
    errEl.textContent = 'Erro de conexão. Verifique o servidor.';
    errEl.style.display = 'block';
  }
}

function doLogout() {
  authToken = '';
  sessionStorage.removeItem('admin_token');
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-pw').value = '';
}

function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  loadDashboard();
}

/* ── Navigation ─────────────────────────────────────────────────────────── */
function navTo(panel) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById(`panel-${panel}`)?.classList.add('active');
  document.querySelector(`.nav-item[data-panel="${panel}"]`)?.classList.add('active');

  const titles = { dashboard: 'Dashboard', produtos: 'Produtos', configuracoes: 'Configurações' };
  document.getElementById('page-title').textContent = titles[panel] || '';

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');

  if (panel === 'dashboard') loadDashboard();
  if (panel === 'produtos') loadProdutos();
  if (panel === 'configuracoes') loadConfig();
}

/* ── Dashboard ──────────────────────────────────────────────────────────── */
async function loadDashboard() {
  try {
    const r = await fetch(`${API}/api/stats`, { headers: authHeaders() });
    if (!r.ok) throw new Error();
    const data = await r.json();
    document.getElementById('stat-total').textContent = data.total;
    document.getElementById('stat-ativos').textContent = data.ativos;
    document.getElementById('stat-inativos').textContent = data.inativos;
  } catch {
    toast('Erro ao carregar estatísticas.', 'error');
  }
}

/* ── Produtos ───────────────────────────────────────────────────────────── */
async function loadProdutos() {
  const tbody = document.getElementById('produtos-tbody');
  tbody.innerHTML = `<tr class="loading-row"><td colspan="6"><div class="spinner"></div><p>Carregando…</p></td></tr>`;

  try {
    const r = await fetch(`${API}/api/produtos`, { headers: authHeaders() });
    produtos = await r.json();
    renderTabela();
  } catch {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--texto-sec)">Erro ao carregar produtos.</td></tr>`;
    toast('Erro ao carregar produtos.', 'error');
  }
}

function emojiPorCat(cat = '') {
  const map = { 'brigadeiros': '🍫', 'bolos de pote': '🍮', 'bolos': '🎂', 'trufas': '🍬', 'caixas': '🎁', 'docinhos': '🍭' };
  return map[cat.toLowerCase()] || '🍰';
}

function renderTabela() {
  const tbody = document.getElementById('produtos-tbody');
  if (!produtos.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--texto-sec)">Nenhum produto cadastrado.</td></tr>`;
    return;
  }
  tbody.innerHTML = produtos.map(p => {
    const src = p.imagem ? `${API}/uploads/${p.imagem}` : null;
    const thumbHtml = src
      ? `<div class="produto-thumb"><img src="${src}" alt="${p.nome}" onerror="this.parentElement.innerHTML='${emojiPorCat(p.categoria)}'"></div>`
      : `<div class="produto-thumb">${emojiPorCat(p.categoria)}</div>`;
    return `
      <tr>
        <td>${thumbHtml}</td>
        <td><strong>${p.nome}</strong></td>
        <td>${p.categoria}</td>
        <td>R$ ${Number(p.preco).toFixed(2).replace('.', ',')}</td>
        <td><span class="badge badge-${p.ativo ? 'ativo' : 'inativo'}">${p.ativo ? 'Ativo' : 'Inativo'}</span></td>
        <td>
          <div class="actions">
            <button class="btn btn-sm btn-outline" onclick="abrirEditar(${p.id})">Editar</button>
            <button class="btn btn-sm ${p.ativo ? 'btn-ghost' : 'btn-success'}" onclick="toggleProduto(${p.id})">${p.ativo ? 'Desativar' : 'Ativar'}</button>
            <button class="btn btn-sm btn-danger" onclick="confirmarExcluir(${p.id})">Excluir</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

/* ── Modal Produto ──────────────────────────────────────────────────────── */
function abrirNovoProduto() {
  editingId = null;
  uploadFile = null;
  document.getElementById('modal-produto-titulo').textContent = 'Novo Produto';
  document.getElementById('form-produto').reset();
  document.getElementById('preview-wrap').style.display = 'none';
  document.getElementById('preview-img').src = '';
  abrirModal('modal-produto');
}

function abrirEditar(id) {
  const p = produtos.find(x => x.id === id);
  if (!p) return;
  editingId = id;
  uploadFile = null;
  document.getElementById('modal-produto-titulo').textContent = 'Editar Produto';
  document.getElementById('f-nome').value = p.nome;
  document.getElementById('f-descricao').value = p.descricao || '';
  document.getElementById('f-preco').value = Number(p.preco).toFixed(2);
  document.getElementById('f-categoria').value = p.categoria;
  document.getElementById('f-ativo').value = p.ativo;

  const previewWrap = document.getElementById('preview-wrap');
  const previewImg = document.getElementById('preview-img');
  if (p.imagem) {
    previewImg.src = `${API}/uploads/${p.imagem}`;
    previewWrap.style.display = 'block';
  } else {
    previewWrap.style.display = 'none';
  }
  abrirModal('modal-produto');
}

async function salvarProduto() {
  const nome = document.getElementById('f-nome').value.trim();
  const descricao = document.getElementById('f-descricao').value.trim();
  const preco = document.getElementById('f-preco').value;
  const categoria = document.getElementById('f-categoria').value;
  const ativo = document.getElementById('f-ativo').value;

  if (!nome || !preco) {
    toast('Nome e preço são obrigatórios.', 'error');
    return;
  }

  const fd = new FormData();
  fd.append('nome', nome);
  fd.append('descricao', descricao);
  fd.append('preco', preco);
  fd.append('categoria', categoria);
  fd.append('ativo', ativo);
  if (uploadFile) fd.append('imagem', uploadFile);

  const url = editingId ? `${API}/api/produtos/${editingId}` : `${API}/api/produtos`;
  const method = editingId ? 'PUT' : 'POST';

  try {
    const r = await fetch(url, { method, headers: authHeaders(), body: fd });
    if (!r.ok) {
      const e = await r.json();
      throw new Error(e.error || 'Erro');
    }
    fecharModal('modal-produto');
    toast(editingId ? 'Produto atualizado!' : 'Produto criado!', 'success');
    loadProdutos();
    loadDashboard();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function toggleProduto(id) {
  try {
    const r = await fetch(`${API}/api/produtos/${id}/toggle`, {
      method: 'POST',
      headers: authHeaders()
    });
    if (!r.ok) throw new Error();
    const data = await r.json();
    const p = produtos.find(x => x.id === id);
    if (p) p.ativo = data.ativo;
    renderTabela();
    loadDashboard();
    toast(data.ativo ? 'Produto ativado.' : 'Produto desativado.', 'success');
  } catch {
    toast('Erro ao atualizar produto.', 'error');
  }
}

let deleteTargetId = null;
function confirmarExcluir(id) {
  deleteTargetId = id;
  const p = produtos.find(x => x.id === id);
  document.getElementById('confirm-nome').textContent = p ? p.nome : '';
  abrirModal('modal-confirm');
}

async function excluirConfirmado() {
  if (!deleteTargetId) return;
  try {
    const r = await fetch(`${API}/api/produtos/${deleteTargetId}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!r.ok) throw new Error();
    fecharModal('modal-confirm');
    toast('Produto excluído.', 'success');
    loadProdutos();
    loadDashboard();
  } catch {
    toast('Erro ao excluir produto.', 'error');
  }
}

/* ── Upload ─────────────────────────────────────────────────────────────── */
function initUpload() {
  const area = document.getElementById('upload-area');
  const input = document.getElementById('upload-input');

  area.addEventListener('click', () => input.click());
  area.addEventListener('dragover', e => { e.preventDefault(); area.style.borderColor = 'var(--rosa)'; });
  area.addEventListener('dragleave', () => area.style.borderColor = '');
  area.addEventListener('drop', e => {
    e.preventDefault();
    area.style.borderColor = '';
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  });
  input.addEventListener('change', () => {
    if (input.files[0]) processFile(input.files[0]);
  });
}

function processFile(f) {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowed.includes(f.type)) {
    toast('Formato inválido. Use JPG, PNG ou WEBP.', 'error');
    return;
  }
  if (f.size > 10 * 1024 * 1024) {
    toast('Arquivo muito grande. Máximo 10MB.', 'error');
    return;
  }
  uploadFile = f;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('preview-img').src = e.target.result;
    document.getElementById('preview-wrap').style.display = 'block';
  };
  reader.readAsDataURL(f);
}

function removePreview() {
  uploadFile = null;
  document.getElementById('preview-img').src = '';
  document.getElementById('preview-wrap').style.display = 'none';
  document.getElementById('upload-input').value = '';
}

/* ── Config ─────────────────────────────────────────────────────────────── */
async function loadConfig() {
  try {
    const r = await fetch(`${API}/api/configuracoes`);
    const data = await r.json();
    document.getElementById('c-whatsapp').value = data.whatsapp || '';
    document.getElementById('c-instagram').value = data.instagram || '';
    document.getElementById('c-endereco').value = data.endereco || '';
    document.getElementById('c-horario').value = data.horario_funcionamento || '';
  } catch {
    toast('Erro ao carregar configurações.', 'error');
  }
}

async function salvarConfig() {
  const data = {
    whatsapp: document.getElementById('c-whatsapp').value.trim(),
    instagram: document.getElementById('c-instagram').value.trim(),
    endereco: document.getElementById('c-endereco').value.trim(),
    horario_funcionamento: document.getElementById('c-horario').value.trim()
  };
  try {
    const r = await fetch(`${API}/api/configuracoes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data)
    });
    if (!r.ok) throw new Error();
    toast('Configurações salvas!', 'success');
  } catch {
    toast('Erro ao salvar configurações.', 'error');
  }
}

/* ── Modals ─────────────────────────────────────────────────────────────── */
function abrirModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}
function fecharModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Mobile sidebar ─────────────────────────────────────────────────────── */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

/* ── Init ───────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Login
  document.getElementById('btn-login').addEventListener('click', doLogin);
  document.getElementById('login-pw').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });

  // Nav
  document.querySelectorAll('.nav-item[data-panel]').forEach(el => {
    el.addEventListener('click', () => navTo(el.dataset.panel));
  });

  // Mobile
  document.getElementById('mobile-menu-btn')?.addEventListener('click', toggleSidebar);

  // Logout
  document.getElementById('btn-logout').addEventListener('click', doLogout);

  // Produto modal
  document.getElementById('btn-novo-produto').addEventListener('click', abrirNovoProduto);
  document.getElementById('btn-salvar-produto').addEventListener('click', salvarProduto);
  document.getElementById('btn-cancelar-produto').addEventListener('click', () => fecharModal('modal-produto'));
  document.getElementById('close-modal-produto').addEventListener('click', () => fecharModal('modal-produto'));

  // Confirm modal
  document.getElementById('btn-confirmar-excluir').addEventListener('click', excluirConfirmado);
  document.getElementById('btn-cancelar-excluir').addEventListener('click', () => fecharModal('modal-confirm'));
  document.getElementById('close-modal-confirm').addEventListener('click', () => fecharModal('modal-confirm'));

  // Config
  document.getElementById('btn-salvar-config').addEventListener('click', salvarConfig);

  // Upload
  initUpload();

  // Close modal on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) fecharModal(overlay.id);
    });
  });

  // Auto-login se token salvo
  if (authToken) {
    showApp();
  }
});
