/* Gestão de parceiros (visão do cliente): homologação e controle de documentos. */
const TIPOS_PARCEIRO = ['Transportador', 'Destinador', 'Transportador e Destinador'];
const DOCS_EXIGIDOS = {
  Destinador: ['Licença de Operação (LO)', 'CTF/APP IBAMA', 'Alvará de Funcionamento'],
  Transportador: ['Licença Ambiental de Transporte', 'CTF/APP IBAMA', 'Registro ANTT', 'Apólice de seguro RCTR-C'],
};
const docsExigidos = tipo => [...new Set([...(tipo.includes('Destinador') ? DOCS_EXIGIDOS.Destinador : []), ...(tipo.includes('Transportador') ? DOCS_EXIGIDOS.Transportador : [])])];
let parcFiltro = 'Todos';

function docResumo(db, p) {
  const docs = db.documentos.filter(d => d.parceiro_id === p.id);
  const venc = docs.filter(d => d.validade && daysUntil(d.validade) < 0).length;
  const prox = docs.filter(d => d.validade && daysUntil(d.validade) >= 0 && daysUntil(d.validade) <= 30).length;
  const aprov = docs.filter(d => d.status === 'Aprovado').length;
  return { docs, venc, prox, aprov, exig: docsExigidos(p.tipo).length };
}

function renderParceiros(view, db) {
  const lista = db.parceiros.filter(p => parcFiltro === 'Todos' || p.status === parcFiltro);
  const cont = s => db.parceiros.filter(p => p.status === s).length;
  view.innerHTML = `
    <div class="grid g-4">
      <div class="card kpi"><div class="label">Homologados</div><div class="value">${cont('Homologado')}</div><div class="foot">Aptos a receber MTR</div></div>
      <div class="card kpi"><div class="label">Em análise</div><div class="value">${cont('Em análise')}</div><div class="foot">Documentação enviada pelo parceiro</div></div>
      <div class="card kpi"><div class="label">Em preenchimento</div><div class="value">${cont('Rascunho')}</div><div class="foot">Cadastro iniciado no portal</div></div>
      <div class="card kpi"><div class="label">Documentos com alerta</div><div class="value">${db.parceiros.reduce((s, p) => { const r = docResumo(db, p); return s + r.venc + r.prox; }, 0)}</div><div class="foot">Vencidos ou vencendo em 30 dias</div></div>
    </div>
    <div class="card">
      <div class="card-head">
        <div class="seg" id="filtro">${['Todos', 'Homologado', 'Em análise', 'Rascunho', 'Reprovado'].map(s => `<button class="${parcFiltro === s ? 'on' : ''}" data-s="${s}">${s}</button>`).join('')}</div>
        <div class="toolbar"><a class="btn" href="#portal">${ICON.user} Abrir Portal do Parceiro</a><button class="btn primary" id="novo">${ICON.plus} Novo parceiro</button></div>
      </div>
      <div class="table-wrap" style="margin-top:14px"><table class="t">
        <thead><tr><th>Razão social</th><th>CNPJ</th><th>Tipo</th><th>Atividade</th><th>Documentos</th><th>Status</th><th></th></tr></thead>
        <tbody>${lista.map(p => {
          const r = docResumo(db, p);
          const alert = r.venc ? `<span class="badge b-bad">${r.venc} vencido(s)</span>` : r.prox ? `<span class="badge b-warn">${r.prox} a vencer</span>` : '';
          return `<tr><td class="strong">${esc(p.razao_social)}<div class="muted" style="font-weight:400">${esc(p.cidade || '')}${p.uf ? '/' + esc(p.uf) : ''}</div></td>
            <td class="muted nowrap">${esc(p.cnpj)}</td><td>${esc(p.tipo)}</td><td>${esc(p.atividade || '—')}</td>
            <td>${r.aprov}/${r.exig} aprovados ${alert}</td><td>${badge(p.status)}</td>
            <td><div class="row-actions"><button class="btn sm" data-ver="${p.id}">Analisar</button></div></td></tr>`;
        }).join('') || '<tr><td colspan="7" class="empty">Nenhum parceiro neste filtro.</td></tr>'}</tbody>
      </table></div>
    </div>`;
  $$('#filtro button', view).forEach(b => b.onclick = () => { parcFiltro = b.dataset.s; renderParceiros(view, db); });
  $$('[data-ver]', view).forEach(b => b.onclick = () => abrirParceiro(db, +b.dataset.ver));
  $('#novo', view).onclick = () => formParceiro(null, async data => { await Api.create('parceiros', data); toast('Parceiro cadastrado'); refresh(); });
}

function formParceiro(p, onSave, title = 'Novo parceiro') {
  p = p || {};
  modal({
    title,
    body: `<form class="form" id="fp">
      <div class="field full"><label>Razão social <span class="req">*</span></label><input class="input" name="razao_social" required value="${esc(p.razao_social)}"></div>
      <div class="field"><label>CNPJ <span class="req">*</span></label><input class="input" name="cnpj" required placeholder="00.000.000/0000-00" value="${esc(p.cnpj)}"></div>
      <div class="field"><label>Tipo de parceiro <span class="req">*</span></label><select class="input" name="tipo" required>${options(TIPOS_PARCEIRO, p.tipo)}</select></div>
      <div class="field"><label>Atividade / tecnologia</label><input class="input" name="atividade" placeholder="Ex.: Reciclagem de metais" value="${esc(p.atividade)}"></div>
      <div class="field"><label>Cidade / UF</label><div style="display:flex;gap:8px"><input class="input" name="cidade" value="${esc(p.cidade)}"><input class="input" name="uf" maxlength="2" style="width:70px" value="${esc(p.uf)}"></div></div>
      <div class="field"><label>Contato responsável</label><input class="input" name="contato_nome" value="${esc(p.contato_nome)}"></div>
      <div class="field"><label>E-mail</label><input class="input" type="email" name="email" value="${esc(p.email)}"></div>
      <div class="field"><label>Telefone</label><input class="input" name="telefone" value="${esc(p.telefone)}"></div>
    </form>`,
    actions: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="salvar">Salvar</button>',
    onMount(el, close) {
      $('#salvar', el).onclick = async () => {
        const f = $('#fp', el);
        if (!f.reportValidity()) return;
        try { await onSave(formData(f)); close(); } catch (e) { toast(e.message, true); }
      };
    },
  });
}

function abrirParceiro(db, id) {
  const p = db.byId('parceiros', id);
  const r = docResumo(db, p);
  const faltando = docsExigidos(p.tipo).filter(t => !r.docs.some(d => d.tipo === t));
  modal({
    title: p.razao_social, wide: true,
    body: `
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:14px">${badge(p.status)}${p.enviado_em ? `<span class="hint">Documentação enviada em ${fmtD(p.enviado_em)}</span>` : ''}</div>
      <dl class="kv">
        <dt>CNPJ</dt><dd>${esc(p.cnpj)}</dd><dt>Tipo</dt><dd>${esc(p.tipo)}</dd><dt>Atividade</dt><dd>${esc(p.atividade || '—')}</dd>
        <dt>Localização</dt><dd>${esc(p.cidade || '—')}/${esc(p.uf || '')}</dd><dt>Contato</dt><dd>${esc(p.contato_nome || '—')} · ${esc(p.email || '')} · ${esc(p.telefone || '')}</dd>
      </dl>
      <h4 style="margin:20px 0 8px">Documentos</h4>
      ${faltando.length ? `<div class="banner warn" style="margin-bottom:10px">${ICON.alert}<div>Documentos obrigatórios não enviados: <strong>${faltando.map(esc).join(', ')}</strong></div></div>` : ''}
      <div class="table-wrap card" style="box-shadow:none"><table class="t"><thead><tr><th>Documento</th><th>Número</th><th>Validade</th><th>Arquivo</th><th>Análise</th><th></th></tr></thead><tbody>
      ${r.docs.map(d => `<tr><td class="strong">${esc(d.tipo)}</td><td class="muted">${esc(d.numero || '—')}</td><td>${validadeBadge(d.validade)}</td>
        <td>${d.arquivo && !Api.MOCK ? `<a href="/uploads/${encodeURIComponent(d.arquivo)}" target="_blank">${esc(d.nome_arquivo || 'arquivo')}</a>` : `<span class="muted">${esc(d.nome_arquivo || '—')}</span>`}</td>
        <td>${badge(d.status)}</td>
        <td><div class="row-actions"><button class="btn sm" data-doc="${d.id}" data-st="Aprovado">${ICON.check}Aprovar</button><button class="btn sm danger" data-doc="${d.id}" data-st="Reprovado">Reprovar</button></div></td></tr>`).join('') || '<tr><td colspan="6" class="empty">Nenhum documento enviado.</td></tr>'}
      </tbody></table></div>
      <div class="field" style="margin-top:16px"><label>Parecer / observação para o parceiro</label><textarea class="input" id="obs" rows="2">${esc(p.observacao || '')}</textarea></div>`,
    actions: `<button class="btn" id="editar">Editar dados</button><span style="flex:1"></span>
      <button class="btn danger" id="reprovar">Reprovar cadastro</button>
      <button class="btn primary" id="homologar">${ICON.check} Homologar parceiro</button>`,
    onMount(el, close) {
      $$('[data-doc]', el).forEach(b => b.onclick = async () => {
        await Api.update('documentos', +b.dataset.doc, { status: b.dataset.st });
        App.db = await Api.loadAll(); close(); abrirParceiro(App.db, id); toast(`Documento ${b.dataset.st.toLowerCase()}`);
      });
      const set = async status => {
        if (status === 'Homologado') {
          const pend = db.documentos.filter(d => d.parceiro_id === id && d.status !== 'Aprovado').length;
          if (pend || faltando.length) { toast('Aprove todos os documentos obrigatórios antes de homologar', true); return; }
        }
        await Api.update('parceiros', id, { status, observacao: $('#obs', el).value });
        close(); toast(`Parceiro ${status.toLowerCase()}`); refresh();
      };
      $('#homologar', el).onclick = () => set('Homologado');
      $('#reprovar', el).onclick = () => set('Reprovado');
      $('#editar', el).onclick = () => { close(); formParceiro(p, async data => { await Api.update('parceiros', id, data); toast('Dados atualizados'); refresh(); }, 'Editar parceiro'); };
    },
  });
}
