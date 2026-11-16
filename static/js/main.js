/* Roteador e casca da aplicação (SPA com rotas por hash). */
const App = {
  mode: 'cliente',          // 'cliente' (gestor EHS da Kairós) | 'parceiro' (portal do fornecedor)
  parceiroId: null,         // parceiro "logado" no portal
  db: null,
};

const ROUTES = {
  cliente: [
    { id: 'dashboard', label: 'Dashboard', icon: 'dash', title: 'Dashboard de gestão de resíduos', render: renderDashboard },
    { id: 'parceiros', label: 'Parceiros', icon: 'partner', title: 'Parceiros e destinadores', render: renderParceiros },
    { id: 'residuos', label: 'Resíduos', icon: 'waste', title: 'Inventário e geração de resíduos', render: renderResiduos },
    { id: 'mtr', label: 'MTR', icon: 'truck', title: 'Manifestos de Transporte de Resíduos', render: renderMtr },
    { id: 'financeiro', label: 'Financeiro', icon: 'money', title: 'Custos e receitas com resíduos', render: renderFinanceiro },
  ],
  parceiro: [
    { id: 'portal', label: 'Meu cadastro', icon: 'partner', title: 'Portal do Parceiro', render: renderPortal },
    { id: 'portal-docs', label: 'Documentos', icon: 'doc', title: 'Portal do Parceiro · Documentos', render: renderPortalDocs },
  ],
};

function shell() {
  document.body.innerHTML = `
  <div class="app">
    <aside class="sidebar" id="sidebar">
      <div class="brand">${brandWord()}</div>
      <div class="nav-label" id="navLabel"></div>
      <nav class="nav" id="nav"></nav>
      <div class="client-card" id="clientCard"></div>
    </aside>
    <div class="main">
      <header class="topbar">
        <div style="display:flex;align-items:center;gap:12px">
          <button class="btn ghost menu-btn" id="menuBtn" aria-label="Menu">${ICON.menu}</button>
          <div><h1 id="pageTitle"></h1><div class="sub" id="pageSub"></div></div>
        </div>
        <div class="view-switch" role="tablist" aria-label="Perfil de acesso">
          <button data-mode="cliente">Gestor EHS · Kairós</button>
          <button data-mode="parceiro">Portal do Parceiro</button>
        </div>
      </header>
      <main class="content" id="view"></main>
    </div>
  </div>`;
  $$('.view-switch button').forEach(b => b.onclick = () => {
    App.mode = b.dataset.mode;
    location.hash = App.mode === 'cliente' ? '#dashboard' : '#portal';
  });
  $('#menuBtn').onclick = () => $('#sidebar').classList.toggle('open');
}

function brandWord() {
  return `<div style="display:flex;align-items:center;gap:10px">
    <div style="width:42px">${LOGO_BRANCO}</div>
    <div><div style="font-weight:800;font-size:24px;letter-spacing:-.03em;color:#fff;line-height:1">ciclora</div>
    <div style="font-size:9.5px;letter-spacing:.1em;color:var(--lime);font-weight:600;margin-top:4px">GESTÃO DE RESÍDUOS</div></div></div>`;
}

async function route() {
  let id = location.hash.replace(/^#\/?/, '').split('?')[0] || 'dashboard';
  if (id === 'residuos-semana') { App.subTab = 'semana'; id = 'residuos'; }
  App.mode = id.startsWith('portal') ? 'parceiro' : 'cliente';
  const list = ROUTES[App.mode];
  const r = list.find(x => x.id === id) || list[0];
  $$('.view-switch button').forEach(b => b.classList.toggle('on', b.dataset.mode === App.mode));
  $('#navLabel').textContent = App.mode === 'cliente' ? 'Gestão EHS' : 'Portal do fornecedor';
  $('#nav').innerHTML = list.map(x => `<a href="#${x.id}" class="${x.id === r.id ? 'active' : ''}">${ICON[x.icon]}${x.label}</a>`).join('');
  $('#clientCard').innerHTML = App.mode === 'cliente'
    ? `<strong>${CLIENTE.nome}</strong>${CLIENTE.unidade}<br>${CLIENTE.responsavel}`
    : `<strong>Acesso de parceiro</strong>Envie seus documentos para homologação na ${CLIENTE.nome}`;
  $('#pageTitle').textContent = r.title;
  $('#pageSub').textContent = App.mode === 'cliente' ? `${CLIENTE.nome} · ${CLIENTE.unidade}` : 'Cadastro de transportadores e destinadores de resíduos';
  $('#sidebar').classList.remove('open');
  $$('.modal-bg').forEach(m => m.remove());
  Tip.hide();
  const view = $('#view');
  view.innerHTML = '<div class="empty">Carregando…</div>';
  try {
    App.db = await Api.loadAll();
    await r.render(view, App.db);
    bindTips(view);
  } catch (e) {
    view.innerHTML = `<div class="banner bad">${ICON.alert}<div><strong>Não foi possível carregar os dados.</strong><br>${esc(e.message)} — verifique se o servidor (python app.py) está em execução.</div></div>`;
  }
  window.scrollTo(0, 0);
}
const refresh = () => route();

document.addEventListener('DOMContentLoaded', () => {
  shell();
  window.addEventListener('hashchange', route);
  route();
});
