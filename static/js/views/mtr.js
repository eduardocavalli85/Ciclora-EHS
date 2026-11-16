/* MTR – Manifesto de Transporte de Resíduos: emissão, acompanhamento e baixa com CDF. */
let mtrFiltro = 'Todas';

function mtrItens(db, m) { return db.mtr_itens.filter(i => i.mtr_id === m.id); }
function mtrTotal(db, m) { return mtrItens(db, m).reduce((a, i) => a + i.quantidade, 0); }

function renderMtr(view, db) {
  const ord = db.mtrs.slice().sort((a, b) => b.data_emissao.localeCompare(a.data_emissao) || b.id - a.id);
  const lista = ord.filter(m => mtrFiltro === 'Todas' || m.status === mtrFiltro).slice(0, 30);
  const c = s => db.mtrs.filter(m => m.status === s).length;
  const mes = isoDate(TODAY).slice(0, 7);
  view.innerHTML = `
    <div class="grid g-4">
      <div class="card kpi"><div class="label">Emitidas no mês</div><div class="value">${db.mtrs.filter(m => m.data_emissao.startsWith(mes)).length}</div><div class="foot">${fmtMes(mes)}</div></div>
      <div class="card kpi"><div class="label">Aguardando coleta</div><div class="value">${c('Emitido')}</div><div class="foot">Status “Emitido”</div></div>
      <div class="card kpi"><div class="label">Em transporte</div><div class="value">${c('Em transporte')}</div><div class="foot">Aguardando recebimento</div></div>
      <div class="card kpi"><div class="label">Concluídas com CDF</div><div class="value">${c('Recebido')}</div><div class="foot">Certificado de Destinação Final</div></div>
    </div>
    <div class="card">
      <div class="card-head">
        <div class="seg" id="filtro">${['Todas', 'Emitido', 'Em transporte', 'Recebido', 'Cancelado'].map(s => `<button class="${mtrFiltro === s ? 'on' : ''}" data-s="${s}">${s}</button>`).join('')}</div>
        <button class="btn primary" id="emitir">${ICON.plus} Emitir MTR</button>
      </div>
      <div class="table-wrap" style="margin-top:14px"><table class="t">
        <thead><tr><th>Número</th><th>Emissão</th><th>Resíduo(s)</th><th class="num">Quantidade</th><th>Transportador</th><th>Destinador</th><th>Status</th><th></th></tr></thead>
        <tbody>${lista.map(m => {
          const it = mtrItens(db, m);
          return `<tr><td class="strong nowrap">${esc(m.numero)}</td><td class="nowrap">${fmtD(m.data_emissao)}</td>
            <td>${it.map(i => esc(db.byId('residuos', i.residuo_id)?.nome)).join('<br>')}</td>
            <td class="num">${fmtN(mtrTotal(db, m))} kg</td>
            <td class="muted">${esc(db.byId('parceiros', m.transportador_id)?.razao_social || '—')}</td>
            <td class="muted">${esc(db.byId('parceiros', m.destinador_id)?.razao_social || '—')}</td>
            <td>${badge(m.status)}${m.cdf_numero ? `<div class="muted" style="font-size:11.5px;margin-top:3px">${esc(m.cdf_numero)}</div>` : ''}</td>
            <td><div class="row-actions"><button class="btn sm" data-ver="${m.id}">${ICON.doc}Abrir</button>${m.status === 'Emitido' || m.status === 'Em transporte' ? `<button class="btn sm" data-st="${m.id}">Atualizar</button>` : ''}</div></td></tr>`;
        }).join('') || '<tr><td colspan="8" class="empty">Nenhuma MTR neste filtro.</td></tr>'}</tbody>
      </table></div>
      ${ord.length > 30 ? '<div class="card-pad hint">Exibindo as 30 MTRs mais recentes do filtro.</div>' : ''}
    </div>`;
  $$('#filtro button', view).forEach(b => b.onclick = () => { mtrFiltro = b.dataset.s; renderMtr(view, db); });
  $('#emitir', view).onclick = () => formMtr(db);
  $$('[data-ver]', view).forEach(b => b.onclick = () => verMtr(db, +b.dataset.ver));
  $$('[data-st]', view).forEach(b => b.onclick = () => statusMtr(db, +b.dataset.st));
}

function docsProblema(db, pid) {
  return db.documentos.filter(d => d.parceiro_id === pid && d.validade && daysUntil(d.validade) < 0);
}

function formMtr(db) {
  const homolog = db.parceiros.filter(p => p.status === 'Homologado');
  const transp = homolog.filter(p => p.tipo.includes('Transportador'));
  const dest = homolog.filter(p => p.tipo.includes('Destinador'));
  const resOpts = db.residuos.map(r => [r.id, `${r.nome} (${r.classe})`]);
  const linha = () => `<tr><td><select class="input" name="residuo_id" required>${options(resOpts, '', 'Selecione o resíduo')}</select></td>
    <td><input class="input" name="quantidade" type="number" min="1" placeholder="kg" required style="text-align:right"></td>
    <td><input class="input" name="acondicionamento" placeholder="Acondicionamento"></td>
    <td><button type="button" class="btn sm ghost" data-rm>${ICON.trash}</button></td></tr>`;
  modal({
    title: 'Emitir Manifesto de Transporte de Resíduos', wide: true,
    body: `<form id="fm">
      <div class="banner info" style="margin-bottom:16px">${ICON.info}<div><strong>Gerador:</strong> ${CLIENTE.nome} — CNPJ ${CLIENTE.cnpj}<br><span class="hint" style="color:inherit">${CLIENTE.endereco}</span></div></div>
      <div class="form">
        <div class="field"><label>Transportador <span class="req">*</span></label><select class="input" name="transportador_id" required>${options(transp.map(p => [p.id, p.razao_social]), '', 'Selecione')}</select></div>
        <div class="field"><label>Destinador <span class="req">*</span></label><select class="input" name="destinador_id" required>${options(dest.map(p => [p.id, `${p.razao_social} — ${p.atividade || ''}`]), '', 'Selecione')}</select></div>
        <div class="full" id="avisoDoc"></div>
        <div class="field"><label>Data de emissão</label><input class="input" type="date" name="data_emissao" value="${isoDate(TODAY)}"></div>
        <div class="field"><label>Placa do veículo</label><input class="input" name="placa" placeholder="ABC-1D23"></div>
        <div class="field"><label>Motorista</label><input class="input" name="motorista"></div>
        <div class="field"><label>Observação</label><input class="input" name="observacao"></div>
      </div>
      <h4 style="margin:20px 0 8px">Resíduos transportados</h4>
      <table class="t"><thead><tr><th>Resíduo</th><th style="width:140px">Quantidade (kg)</th><th>Acondicionamento</th><th></th></tr></thead><tbody id="itens">${linha()}</tbody></table>
      <button type="button" class="btn sm" id="addItem" style="margin-top:10px">${ICON.plus} Adicionar resíduo</button>
      <p class="hint" style="margin-top:14px">Somente parceiros <strong>homologados</strong> aparecem na lista. No MVP a MTR é gerada na plataforma; a integração com o SINIR/MTR nacional está prevista no roadmap.</p>
    </form>`,
    actions: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="ok">Emitir MTR</button>',
    onMount(el, close) {
      const tb = $('#itens', el);
      $('#addItem', el).onclick = () => tb.insertAdjacentHTML('beforeend', linha());
      tb.onclick = e => { if (e.target.closest('[data-rm]') && tb.rows.length > 1) e.target.closest('tr').remove(); };
      tb.onchange = e => {
        if (e.target.name === 'residuo_id') {
          const r = db.byId('residuos', e.target.value);
          const ac = e.target.closest('tr').querySelector('[name=acondicionamento]');
          if (r && !ac.value) ac.value = r.acondicionamento || '';
        }
      };
      const aviso = () => {
        const ids = ['transportador_id', 'destinador_id'].map(n => +$(`[name=${n}]`, el).value).filter(Boolean);
        const prob = ids.flatMap(id => docsProblema(db, id).map(d => `${db.byId('parceiros', id).razao_social}: ${d.tipo} vencido em ${fmtD(d.validade)}`));
        $('#avisoDoc', el).innerHTML = prob.length ? `<div class="banner bad">${ICON.alert}<div><strong>Atenção — documento vencido.</strong><br>${prob.map(esc).join('<br>')}</div></div>` : '';
      };
      $$('[name=transportador_id],[name=destinador_id]', el).forEach(s => s.onchange = aviso);
      $('#ok', el).onclick = async () => {
        const f = $('#fm', el); if (!f.reportValidity()) return;
        const d = formData(f);
        d.itens = [...tb.rows].map(tr => ({ residuo_id: +tr.querySelector('[name=residuo_id]').value, quantidade: +tr.querySelector('[name=quantidade]').value, acondicionamento: tr.querySelector('[name=acondicionamento]').value }));
        delete d.residuo_id; delete d.quantidade; delete d.acondicionamento;
        try {
          const m = await Api.emitirMtr(d);
          close(); toast(`${m.numero} emitida`);
          App.db = await Api.loadAll(); await refresh(); verMtr(App.db, m.id);
        } catch (e) { toast(e.message, true); }
      };
    },
  });
}

function verMtr(db, id) {
  const m = db.byId('mtrs', id);
  const t = db.byId('parceiros', m.transportador_id) || {};
  const d = db.byId('parceiros', m.destinador_id) || {};
  const it = mtrItens(db, m);
  const kv = (l, v) => `<div><span>${l}</span>${esc(v || '—')}</div>`;
  modal({
    title: m.numero, wide: true,
    body: `<div class="mtr-doc">
      <div class="hd"><div style="display:flex;gap:12px;align-items:center"><div style="width:44px;background:var(--deep);border-radius:10px;padding:5px">${LOGO_BRANCO}</div>
        <div><h4>Manifesto de Transporte de Resíduos</h4><div style="font-size:11.5px;color:#59665F">Emitido via Ciclora EHS · ${esc(CLIENTE.nome)}</div></div></div>
        <div><div class="num">${esc(m.numero)}</div><div style="text-align:right;font-size:11.5px">Emissão: ${fmtD(m.data_emissao)} · ${badge(m.status)}</div></div></div>
      <section><h5>1. Gerador</h5><div class="in">${kv('Razão social', CLIENTE.nome)}${kv('CNPJ', CLIENTE.cnpj)}${kv('Unidade', CLIENTE.unidade)}${kv('Endereço', CLIENTE.endereco)}${kv('Responsável', CLIENTE.responsavel)}</div></section>
      <section><h5>2. Transportador</h5><div class="in">${kv('Razão social', t.razao_social)}${kv('CNPJ', t.cnpj)}${kv('Município/UF', `${t.cidade || ''}/${t.uf || ''}`)}${kv('Placa', m.placa)}${kv('Motorista', m.motorista)}${kv('Contato', t.telefone)}</div></section>
      <section><h5>3. Destinador</h5><div class="in">${kv('Razão social', d.razao_social)}${kv('CNPJ', d.cnpj)}${kv('Município/UF', `${d.cidade || ''}/${d.uf || ''}`)}${kv('Tecnologia', d.atividade)}${kv('Data de recebimento', fmtD(m.data_recebimento))}${kv('CDF', m.cdf_numero)}</div></section>
      <section><h5>4. Resíduos</h5><table><thead><tr><th>Código</th><th>Descrição</th><th>Classe</th><th>Estado</th><th>Acondicionamento</th><th style="text-align:right">Quantidade</th></tr></thead><tbody>
        ${it.map(i => { const r = db.byId('residuos', i.residuo_id) || {}; return `<tr><td>${esc(r.codigo_ibama)}</td><td>${esc(r.nome)}</td><td>${esc(r.classe)}</td><td>${esc(r.estado_fisico)}</td><td>${esc(i.acondicionamento || r.acondicionamento)}</td><td style="text-align:right">${fmtN(i.quantidade)} kg</td></tr>`; }).join('')}
        <tr><td colspan="5"><strong>Total</strong></td><td style="text-align:right"><strong>${fmtN(mtrTotal(db, m))} kg</strong></td></tr></tbody></table></section>
      ${m.observacao ? `<section><h5>Observações</h5><div style="padding:8px 10px">${esc(m.observacao)}</div></section>` : ''}
      <div class="sign"><div>Gerador</div><div>Transportador</div><div>Destinador (recebimento)</div></div>
    </div>`,
    actions: Api.MOCK ? '<span class="hint" style="margin-right:auto">No sistema instalado, este documento é impresso ou salvo em PDF.</span><button class="btn" data-close>Fechar</button>'
      : `<button class="btn" data-close>Fechar</button><button class="btn dark" id="imp">${ICON.print} Imprimir / salvar PDF</button>`,
    onMount(el) { const b = $('#imp', el); if (b) b.onclick = () => window.print(); },
  });
}

function statusMtr(db, id) {
  const m = db.byId('mtrs', id);
  modal({
    title: `Atualizar ${m.numero}`,
    body: `<form class="form" id="fs">
      <div class="field full"><label>Novo status</label><select class="input" name="status">${options(['Emitido', 'Em transporte', 'Recebido', 'Cancelado'], m.status === 'Emitido' ? 'Em transporte' : 'Recebido')}</select></div>
      <div class="field"><label>Data de recebimento</label><input class="input" type="date" name="data_recebimento" value="${isoDate(TODAY)}"></div>
      <div class="field"><label>Nº do CDF (Certificado de Destinação Final)</label><input class="input" name="cdf_numero" placeholder="CDF-2026-00000"></div>
      <p class="hint full">Ao marcar como <strong>Recebido</strong>, informe o CDF emitido pelo destinador para comprovar a destinação ambientalmente adequada.</p>
    </form>`,
    actions: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="ok">Salvar</button>',
    onMount(el, close) {
      $('#ok', el).onclick = async () => {
        const d = formData($('#fs', el));
        if (d.status !== 'Recebido') { d.data_recebimento = null; d.cdf_numero = null; }
        else if (!d.cdf_numero) { toast('Informe o número do CDF', true); return; }
        await Api.update('mtrs', id, d); close(); toast('MTR atualizada'); refresh();
      };
    },
  });
}
