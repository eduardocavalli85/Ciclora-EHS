/* Portal do Parceiro: o transportador/destinador cadastra a empresa,
   anexa os documentos e envia para análise da empresa cliente. */
function portalHeader(db) {
  if (!App.parceiroId) App.parceiroId = (db.parceiros.find(p => p.status === 'Rascunho') || db.parceiros[0])?.id;
  return `<div class="card card-pad" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
    <div style="width:42px;height:42px;border-radius:12px;background:var(--teal-soft);color:var(--deep);display:grid;place-items:center">${ICON.user}</div>
    <div style="flex:1;min-width:220px"><div class="hint">Acesso simulado do MVP — entrar como:</div>
      <select class="input" id="quem" style="max-width:420px;margin-top:4px">${options(db.parceiros.map(p => [p.id, p.razao_social]), App.parceiroId)}</select></div>
    <button class="btn" id="novoCad">${ICON.plus} Solicitar novo cadastro</button>
  </div>`;
}
function bindPortalHeader(view, db, rerender) {
  $('#quem', view).onchange = e => { App.parceiroId = +e.target.value; rerender(view, db); };
  $('#novoCad', view).onclick = () => formParceiro(null, async data => {
    const novo = await Api.create('parceiros', { ...data, status: 'Rascunho' });
    App.parceiroId = novo.id; toast('Cadastro iniciado — agora anexe seus documentos'); location.hash = '#portal-docs'; refresh();
  }, 'Solicitar cadastro como parceiro');
}
function portalSteps(db, p) {
  const docs = db.documentos.filter(d => d.parceiro_id === p.id);
  const falt = docsExigidos(p.tipo).filter(t => !docs.some(d => d.tipo === t));
  const enviado = p.status !== 'Rascunho';
  const st = [
    { t: 'Dados da empresa', s: 'Razão social, CNPJ, contato', done: !!(p.razao_social && p.cnpj) },
    { t: 'Documentos', s: falt.length ? `${falt.length} obrigatório(s) pendente(s)` : 'Todos anexados', done: !falt.length },
    { t: `Enviar para ${CLIENTE.nome.split(' ')[0]}`, s: enviado ? `Enviado em ${fmtD(p.enviado_em)}` : 'Aguardando envio', done: enviado },
    { t: 'Homologação', s: p.status === 'Homologado' ? 'Aprovado' : p.status === 'Reprovado' ? 'Reprovado' : 'Análise do cliente', done: p.status === 'Homologado' },
  ];
  const cur = st.findIndex(x => !x.done);
  return `<div class="steps">${st.map((x, i) => `<div class="step ${x.done ? 'done' : ''} ${i === cur ? 'current' : ''}"><div class="n">${x.done ? '✓' : i + 1}</div><div><strong>${x.t}</strong><small>${x.s}</small></div></div>`).join('')}</div>`;
}
function statusBanner(p) {
  const m = {
    Rascunho: ['info', ICON.info, 'Cadastro em preenchimento. Complete os dados, anexe os documentos e clique em <strong>Enviar para análise</strong>.'],
    'Em análise': ['warn', ICON.clock, `Documentação enviada em ${fmtD(p.enviado_em)}. A equipe de Meio Ambiente da ${CLIENTE.nome} está analisando.`],
    Homologado: ['ok', ICON.check, `Empresa homologada como fornecedora de serviços ambientais da ${CLIENTE.nome}. Mantenha os documentos dentro da validade.`],
    Reprovado: ['bad', ICON.alert, `Cadastro reprovado. ${p.observacao ? 'Parecer: ' + esc(p.observacao) : ''} Corrija os documentos e reenvie.`],
  }[p.status] || ['info', ICON.info, ''];
  return `<div class="banner ${m[0]}">${m[1]}<div>${m[2]}</div></div>`;
}

function renderPortal(view, db) {
  const head = portalHeader(db);
  const p = db.byId('parceiros', App.parceiroId);
  view.innerHTML = `${head}${statusBanner(p)}${portalSteps(db, p)}
    <div class="card">
      <div class="card-head"><div><h2>Dados da empresa</h2><p>Informações usadas na emissão das MTRs e na homologação</p></div></div>
      <form class="form card-pad" id="fdados">
        <div class="field full"><label>Razão social <span class="req">*</span></label><input class="input" name="razao_social" required value="${esc(p.razao_social)}"></div>
        <div class="field"><label>CNPJ <span class="req">*</span></label><input class="input" name="cnpj" required value="${esc(p.cnpj)}"></div>
        <div class="field"><label>Tipo de parceiro</label><select class="input" name="tipo">${options(TIPOS_PARCEIRO, p.tipo)}</select></div>
        <div class="field"><label>Atividade / tecnologia de tratamento</label><input class="input" name="atividade" value="${esc(p.atividade)}"></div>
        <div class="field"><label>Cidade / UF</label><div style="display:flex;gap:8px"><input class="input" name="cidade" value="${esc(p.cidade)}"><input class="input" name="uf" maxlength="2" style="width:70px" value="${esc(p.uf)}"></div></div>
        <div class="field"><label>Contato responsável</label><input class="input" name="contato_nome" value="${esc(p.contato_nome)}"></div>
        <div class="field"><label>E-mail</label><input class="input" name="email" type="email" value="${esc(p.email)}"></div>
        <div class="field"><label>Telefone</label><input class="input" name="telefone" value="${esc(p.telefone)}"></div>
        <div class="full toolbar"><span class="spacer"></span><button type="button" class="btn" id="salvar">Salvar dados</button><a class="btn primary" href="#portal-docs">Próximo: documentos →</a></div>
      </form>
    </div>`;
  bindPortalHeader(view, db, renderPortal);
  $('#salvar', view).onclick = async () => {
    const f = $('#fdados', view); if (!f.reportValidity()) return;
    await Api.update('parceiros', p.id, formData(f)); toast('Dados salvos'); refresh();
  };
}

function renderPortalDocs(view, db) {
  const head = portalHeader(db);
  const p = db.byId('parceiros', App.parceiroId);
  const docs = db.documentos.filter(d => d.parceiro_id === p.id);
  const exig = docsExigidos(p.tipo);
  const falt = exig.filter(t => !docs.some(d => d.tipo === t));
  const podeEnviar = !falt.length && (p.status === 'Rascunho' || p.status === 'Reprovado');
  view.innerHTML = `${head}${statusBanner(p)}${portalSteps(db, p)}
    <div class="grid g-2-1">
      <div class="card">
        <div class="card-head"><div><h2>Documentos anexados</h2><p>${docs.length} documento(s) · ${exig.length} obrigatório(s) para ${esc(p.tipo.toLowerCase())}</p></div></div>
        <div class="table-wrap" style="margin-top:12px"><table class="t"><thead><tr><th>Documento</th><th>Validade</th><th>Arquivo</th><th>Situação</th><th></th></tr></thead><tbody>
        ${exig.map(t => {
          const d = docs.find(x => x.tipo === t);
          return d ? `<tr><td class="strong">${esc(t)}<div class="muted" style="font-weight:400">Nº ${esc(d.numero || '—')}</div></td><td>${validadeBadge(d.validade)}</td>
            <td class="muted">${esc(d.nome_arquivo || '—')}</td><td>${badge(d.status)}</td><td><div class="row-actions"><button class="btn sm ghost" data-del="${d.id}" title="Remover">${ICON.trash}</button></div></td></tr>`
            : `<tr><td class="strong">${esc(t)}</td><td colspan="3"><span class="badge b-bad">Obrigatório · não enviado</span></td><td><div class="row-actions"><button class="btn sm" data-add="${esc(t)}">${ICON.upload}Anexar</button></div></td></tr>`;
        }).join('')}
        ${docs.filter(d => !exig.includes(d.tipo)).map(d => `<tr><td class="strong">${esc(d.tipo)}</td><td>${validadeBadge(d.validade)}</td><td class="muted">${esc(d.nome_arquivo || '—')}</td><td>${badge(d.status)}</td><td><div class="row-actions"><button class="btn sm ghost" data-del="${d.id}">${ICON.trash}</button></div></td></tr>`).join('')}
        </tbody></table></div>
        <div class="card-pad toolbar" style="border-top:1px solid var(--line)">
          <span class="hint">${falt.length ? `Faltam ${falt.length} documento(s) obrigatório(s).` : p.status === 'Rascunho' || p.status === 'Reprovado' ? 'Tudo pronto para enviar.' : 'Documentação já enviada.'}</span>
          <span class="spacer"></span>
          <button class="btn primary" id="enviar" ${podeEnviar ? '' : 'disabled'}>${ICON.send} Enviar para análise da ${CLIENTE.nome.split(' ').slice(0, 2).join(' ')}</button>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><div><h2>Anexar documento</h2><p>PDF, PNG ou JPG</p></div></div>
        <form class="card-pad" id="fdoc" style="display:flex;flex-direction:column;gap:12px">
          <div class="field"><label>Tipo de documento <span class="req">*</span></label><select class="input" name="tipo" required>${options([...exig, 'Certificado de Regularidade (outro)', 'Contrato Social'], falt[0])}</select></div>
          <div class="field"><label>Número</label><input class="input" name="numero" placeholder="Ex.: LO 12345/2026"></div>
          <div style="display:flex;gap:10px"><div class="field" style="flex:1"><label>Emissão</label><input class="input" type="date" name="emissao"></div>
          <div class="field" style="flex:1"><label>Validade <span class="req">*</span></label><input class="input" type="date" name="validade" required></div></div>
          <label class="dropzone" id="dz">${ICON.upload}<div><strong>Clique para selecionar</strong> ou arraste o arquivo aqui</div><div class="hint" id="fname">Nenhum arquivo selecionado</div>
            <input type="file" name="arquivo" accept=".pdf,.png,.jpg,.jpeg" hidden></label>
          <button class="btn dark" type="submit">${ICON.upload} Anexar documento</button>
        </form>
      </div>
    </div>`;
  bindPortalHeader(view, db, renderPortalDocs);
  const fdoc = $('#fdoc', view), file = $('input[type=file]', fdoc), dz = $('#dz', view);
  file.onchange = () => { $('#fname', view).textContent = file.files[0]?.name || 'Nenhum arquivo selecionado'; };
  ['dragover', 'dragenter'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, () => dz.classList.remove('drag')));
  dz.addEventListener('drop', e => { e.preventDefault(); file.files = e.dataTransfer.files; file.onchange(); });
  $$('[data-add]', view).forEach(b => b.onclick = () => { $('select[name=tipo]', fdoc).value = b.dataset.add; $('input[name=numero]', fdoc).focus(); });
  fdoc.onsubmit = async e => {
    e.preventDefault(); if (!fdoc.reportValidity()) return;
    const fd = new FormData(fdoc); fd.append('parceiro_id', p.id);
    try { await Api.upload(fd); toast('Documento anexado'); refresh(); } catch (err) { toast(err.message, true); }
  };
  $$('[data-del]', view).forEach(b => b.onclick = async () => { await Api.remove('documentos', +b.dataset.del); toast('Documento removido'); refresh(); });
  $('#enviar', view).onclick = async () => {
    const hoje = isoDate(TODAY);
    await Api.update('parceiros', p.id, { status: 'Em análise', enviado_em: hoje });
    await Promise.all(docs.map(d => Api.update('documentos', d.id, { enviado_em: hoje, status: d.status === 'Reprovado' ? 'Pendente' : d.status })));
    toast(`Documentação enviada para ${CLIENTE.nome}`); refresh();
  };
}
