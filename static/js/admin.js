/* ── Admin Panel — Tão Doce Quanto Ella ─────────────────────────────────── */

const API = 'https://banco.pythonanywhere.com';
let authToken = sessionStorage.getItem('admin_token') || '';
let produtos = [];
let editingId = null;
let uploadFile = null;
let deleteTargetId = null;

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
  loadProdutos();
  loadConfig();
}

/* ── Navigation ─────────────────────────────────────────────────────────── */
window.navTo = function(panel) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById(`panel-${panel}`)?.classList.add('active');
  document.querySelector(`.nav-item[data-panel="${panel}"]`)?.classList.add('active');

  const titles = { dashboard: 'Dashboard', produtos: 'Produtos', configuracoes: 'Configurações' };
  document.getElementById('page-title').textContent = titles[panel] || '';

  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('open');

  if (panel === 'dashboard') loadDashboard();
  if (panel === 'produtos') loadProdutos();
  if (panel === 'configuracoes') loadConfig();
};

/* ── Dashboard ──────────────────────────────────────────────────────────── */
async function loadDashboard() {
  try {
    const r = await fetch(`${API}/api/stats`, { headers: authHeaders() });
    if (!r.ok) throw new Error();
    const data = await r.json();
    document.getElementById('stat-total').textContent = data.total || 0;
    document.getElementById('stat-ativos').textContent = data.ativos || 0;
    document.getElementById('stat-inativos').textContent = data.inativos || 0;
  } catch {
    toast('Erro ao carregar estatísticas.', 'error');
  }
}

/* ── Produtos ───────────────────────────────────────────────────────────── */
async function loadProdutos() {
  const tbody = document.getElementById('produtos-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr class="loading-row"><td colspan="6"><div class="spinner"></div><p>Carregando…</p></td></tr>`;

  try {
    const r = await fetch(`${API}/api/produtos`, { headers: authHeaders() });
    if (!r.ok) throw new Error();
    produtos = await r.json();
    renderTabela();
  } catch {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--texto-sec)">Erro ao carregar produtos.</td></tr>`;
    toast('Erro ao carregar produtos.', 'error');
  }
}

function getIconForCategory(cat = '') {
  const map = { 
    'brigadeiros': '🍫', 
    'bolos de pote': '🥤', 
    'bolos': '🎂', 
    'trufas': '🍬', 
    'caixas': '📦', 
    'docinhos': '🍭',
    'cookies': '🍪',
    'tortas': '🥧',
    'geral': '🍰'
  };
  return map[cat.toLowerCase()] || '🍰';
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function renderTabela() {
  const tbody = document.getElementById('produtos-tbody');
  if (!tbody) return;
  
  if (!produtos.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--texto-sec)">Nenhum produto cadastrado.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = produtos.map(p => {
    const src = p.imagem ? `${API}/uploads/${p.imagem}` : null;
    const thumbHtml = src
      ? `<div class="produto-thumb"><img src="${src}" alt="${escapeHtml(p.nome)}" onerror="this.parentElement.innerHTML='${getIconForCategory(p.categoria)}'"></div>`
      : `<div class="produto-thumb">${getIconForCategory(p.categoria)}</div>`;
    return `
      <tr>
        <td>${thumbHtml}</td>
        <td><strong>${escapeHtml(p.nome)}</strong></td>
        <td>${escapeHtml(p.categoria)}</td>
        <td>R$ ${Number(p.preco).toFixed(2).replace('.', ',')}</td>
        <td><span class="badge badge-${p.ativo ? 'ativo' : 'inativo'}">${p.ativo ? 'Ativo' : 'Inativo'}</span></td>
        <td>
          <div class="actions">
            <button class="btn btn-sm btn-outline" onclick="window.abrirEditar(${p.id})">Editar</button>
            <button class="btn btn-sm ${p.ativo ? 'btn-ghost' : 'btn-success'}" onclick="window.toggleProduto(${p.id})">${p.ativo ? 'Desativar' : 'Ativar'}</button>
            <button class="btn btn-sm btn-danger" onclick="window.confirmarExcluir(${p.id})">Excluir</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

/* ── Modal Produto ──────────────────────────────────────────────────────── */
window.abrirNovoProduto = function() {
  editingId = null;
  uploadFile = null;
  document.getElementById('modal-produto-titulo').textContent = 'Novo Produto';
  document.getElementById('form-produto').reset();
  document.getElementById('f-id').value = '';
  document.getElementById('preview-wrap').style.display = 'none';
  document.getElementById('preview-img').src = '';
  abrirModal('modal-produto');
};

window.abrirEditar = function(id) {
  const p = produtos.find(x => x.id === id);
  if (!p) return;
  editingId = id;
  uploadFile = null;
  document.getElementById('modal-produto-titulo').textContent = 'Editar Produto';
  document.getElementById('f-id').value = p.id;
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
};

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

window.toggleProduto = async function(id) {
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
};

/* ── Confirmar Exclusão (POPUP) ─────────────────────────────────────────── */
window.confirmarExcluir = function(id) {
  console.log('confirmarExcluir chamado com id:', id);
  const p = produtos.find(x => x.id === id);
  if (!p) {
    toast('Produto não encontrado.', 'error');
    return;
  }
  deleteTargetId = id;
  document.getElementById('confirm-nome').textContent = p.nome;
  abrirModal('modal-confirm');
};

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
    deleteTargetId = null;
  } catch {
    toast('Erro ao excluir produto.', 'error');
  }
}

function cancelarExclusao() {
  deleteTargetId = null;
  fecharModal('modal-confirm');
}

/* ── Upload ─────────────────────────────────────────────────────────────── */
function initUpload() {
  const area = document.getElementById('upload-area');
  const input = document.getElementById('upload-input');
  if (!area) return;

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

window.removePreview = function() {
  uploadFile = null;
  document.getElementById('preview-img').src = '';
  document.getElementById('preview-wrap').style.display = 'none';
  document.getElementById('upload-input').value = '';
};

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
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function fecharModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

/* ── Mobile sidebar ─────────────────────────────────────────────────────── */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

/* ── Init ───────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Login
  const btnLogin = document.getElementById('btn-login');
  const loginPw = document.getElementById('login-pw');
  if (btnLogin) btnLogin.addEventListener('click', doLogin);
  if (loginPw) loginPw.addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });

  // Nav
  document.querySelectorAll('.nav-item[data-panel]').forEach(el => {
    el.addEventListener('click', () => window.navTo(el.dataset.panel));
  });

  // Mobile
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleSidebar);

  // Logout
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) btnLogout.addEventListener('click', doLogout);

  // Produto modal
  const btnNovoProduto = document.getElementById('btn-novo-produto');
  const btnSalvarProduto = document.getElementById('btn-salvar-produto');
  const btnCancelarProduto = document.getElementById('btn-cancelar-produto');
  const closeModalProduto = document.getElementById('close-modal-produto');
  
  if (btnNovoProduto) btnNovoProduto.addEventListener('click', () => window.abrirNovoProduto());
  if (btnSalvarProduto) btnSalvarProduto.addEventListener('click', salvarProduto);
  if (btnCancelarProduto) btnCancelarProduto.addEventListener('click', () => fecharModal('modal-produto'));
  if (closeModalProduto) closeModalProduto.addEventListener('click', () => fecharModal('modal-produto'));

  // Confirm modal
  const btnConfirmarExcluir = document.getElementById('btn-confirmar-excluir');
  const btnCancelarExcluir = document.getElementById('btn-cancelar-excluir');
  const closeModalConfirm = document.getElementById('close-modal-confirm');
  
  if (btnConfirmarExcluir) btnConfirmarExcluir.addEventListener('click', excluirConfirmado);
  if (btnCancelarExcluir) btnCancelarExcluir.addEventListener('click', cancelarExclusao);
  if (closeModalConfirm) closeModalConfirm.addEventListener('click', cancelarExclusao);

  // Config
  const btnSalvarConfig = document.getElementById('btn-salvar-config');
  if (btnSalvarConfig) btnSalvarConfig.addEventListener('click', salvarConfig);

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
