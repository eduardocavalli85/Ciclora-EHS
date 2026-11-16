/* Resíduos: inventário (cadastro) e lançamento da geração semanal. */
let resTab = 'inventario';
let resSemana = null;

function renderResiduos(view, db) {
  if (App.subTab === 'semana') { resTab = 'semana'; App.subTab = null; }
  const semanas = [...new Set(db.geracoes.map(g => g.semana))].sort();
  const ult8 = semanas.slice(-8);
  const qtd = (rid, s) => db.geracoes.find(g => g.residuo_id === rid && g.semana === s)?.quantidade;

  view.innerHTML = `
    <div class="tabs"><button data-t="inventario" class="${resTab === 'inventario' ? 'on' : ''}">Inventário de resíduos</button><button data-t="semana" class="${resTab === 'semana' ? 'on' : ''}">Geração semanal</button></div>
    <div id="tab"></div>`;
  $$('.tabs button', view).forEach(b => b.onclick = () => { resTab = b.dataset.t; renderResiduos(view, db); bindTips(view); });
  const tab = $('#tab', view);

  if (resTab === 'inventario') {
    const media = rid => { const v = ult8.map(s => qtd(rid, s)).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; };
    tab.innerHTML = `<div class="card">
      <div class="card-head"><div><h2>Resíduos cadastrados</h2><p>${db.residuos.length} resíduos · código conforme Lista Brasileira de Resíduos (IBAMA) · classe ABNT NBR 10004</p></div>
        <button class="btn primary" id="novo">${ICON.plus} Cadastrar resíduo</button></div>
      <div class="table-wrap" style="margin-top:14px"><table class="t">
        <thead><tr><th>Resíduo</th><th>Código</th><th>Classe</th><th>Estado</th><th>Área geradora</th><th>Acondicionamento</th><th>Destinação</th><th class="num">Média/semana</th><th></th></tr></thead>
        <tbody>${db.residuos.map(r => `<tr><td class="strong">${esc(r.nome)}</td><td class="muted nowrap">${esc(r.codigo_ibama || "—")}</td><td>${classeTag(r.classe)}</td>
          <td>${esc(r.estado_fisico || '—')}</td><td>${esc(r.area_geradora || '—')}</td><td class="muted">${esc(r.acondicionamento || '—')}</td><td>${esc(r.destinacao || '—')}</td>
          <td class="num">${fmtN(media(r.id))} kg</td><td><div class="row-actions"><button class="btn sm" data-ed="${r.id}">Editar</button></div></td></tr>`).join('')}</tbody>
      </table></div></div>`;
    $('#novo', tab).onclick = () => formResiduo(null);
    $$('[data-ed]', tab).forEach(b => b.onclick = () => formResiduo(db.byId('residuos', +b.dataset.ed)));
    return;
  }

  // ----- geração semanal -----
  const semAtual = mondayOf(TODAY);
  const sugerida = isoDate(new Date(parseD(semAtual).getTime() - 7 * 864e5));
  resSemana = resSemana || sugerida;
  const totSem = s => db.geracoes.filter(g => g.semana === s).reduce((a, g) => a + g.quantidade, 0);
  tab.innerHTML = `<div class="grid g-2-1">
    <div class="card">
      <div class="card-head"><div><h2>Lançar quantidades da semana</h2><p>Informe o total gerado (kg) de cada resíduo na semana de referência</p></div></div>
      <div class="card-pad toolbar">
        <div class="field"><label>Semana iniciada em (segunda-feira)</label><input class="input" type="date" id="sem" value="${resSemana}" style="width:190px"></div>
        <span class="hint" style="align-self:flex-end;padding-bottom:10px">${fmtD(resSemana)} a ${fmtD(isoDate(new Date(parseD(resSemana).getTime() + 6 * 864e5)))}</span>
      </div>
      <form id="flote"><div class="table-wrap"><table class="t">
        <thead><tr><th>Resíduo</th><th>Classe</th><th class="num">Semana anterior</th><th class="num" style="width:180px">Quantidade (kg)</th></tr></thead>
        <tbody>${db.residuos.map(r => {
          const ant = qtd(r.id, isoDate(new Date(parseD(resSemana).getTime() - 7 * 864e5)));
          const v = qtd(r.id, resSemana);
          return `<tr><td class="strong">${esc(r.nome)}</td><td>${classeTag(r.classe)}</td><td class="num muted">${ant != null ? fmtN(ant) + ' kg' : '—'}</td>
            <td class="num"><input class="input" type="number" min="0" step="1" name="r${r.id}" value="${v ?? ''}" placeholder="0" style="text-align:right"></td></tr>`;
        }).join('')}</tbody>
        <tfoot><tr><td colspan="3">Total da semana</td><td class="num" id="totLote">—</td></tr></tfoot>
      </table></div>
      <div class="card-pad toolbar"><span class="spacer"></span><button class="btn primary" type="submit">${ICON.check} Salvar lançamento</button></div></form>
    </div>
    <div class="card">
      <div class="card-head"><div><h2>Histórico (t/semana)</h2><p>Últimas ${ult8.length} semanas lançadas</p></div></div>
      <div class="chart">${columnChart({ cats: ult8.map(fmtDs), series: [{ name: 'Total gerado', color: 'var(--teal)', values: ult8.map(s => totSem(s) / 1000) }], fmt: v => fmtN(v, 1), fmtAxis: v => fmtN(v, 0), unit: ' t', height: 260, width: 400 })}</div>
      <div class="table-wrap"><table class="t"><thead><tr><th>Semana</th><th class="num">Total</th><th class="num">Classe I</th></tr></thead><tbody>
        ${ult8.slice().reverse().map(s => `<tr><td>${fmtD(s)}</td><td class="num strong">${fmtT(totSem(s))} t</td><td class="num">${fmtT(db.geracoes.filter(g => g.semana === s && db.byId('residuos', g.residuo_id)?.classe === 'Classe I').reduce((a, g) => a + g.quantidade, 0))} t</td></tr>`).join('')}
      </tbody></table></div>
    </div></div>`;
  const f = $('#flote', tab);
  const tot = () => { $('#totLote', tab).textContent = fmtN($$('input[type=number]', f).reduce((a, i) => a + (+i.value || 0), 0)) + ' kg'; };
  f.oninput = tot; tot();
  $('#sem', tab).onchange = e => { resSemana = mondayOf(parseD(e.target.value)); renderResiduos(view, db); bindTips(view); };
  f.onsubmit = async e => {
    e.preventDefault();
    const itens = db.residuos.map(r => ({ residuo_id: r.id, quantidade: f[`r${r.id}`].value }));
    await Api.lote({ semana: resSemana, itens });
    toast('Geração da semana registrada'); refresh();
  };
}

function formResiduo(r) {
  r = r || {};
  modal({
    title: r.id ? 'Editar resíduo' : 'Cadastrar resíduo',
    body: `<form class="form" id="fr">
      <div class="field full"><label>Nome do resíduo <span class="req">*</span></label><input class="input" name="nome" required value="${esc(r.nome)}"></div>
      <div class="field"><label>Código (Lista Brasileira de Resíduos)</label><input class="input" name="codigo_ibama" placeholder="Ex.: 08 01 13*" value="${esc(r.codigo_ibama)}"></div>
      <div class="field"><label>Classe NBR 10004 <span class="req">*</span></label><select class="input" name="classe" required>${options(['Classe I', 'Classe II A', 'Classe II B'], r.classe)}</select></div>
      <div class="field"><label>Estado físico</label><select class="input" name="estado_fisico">${options(['Sólido', 'Líquido', 'Pastoso', 'Gasoso'], r.estado_fisico)}</select></div>
      <div class="field"><label>Área geradora</label><input class="input" name="area_geradora" placeholder="Ex.: Pintura" value="${esc(r.area_geradora)}"></div>
      <div class="field"><label>Acondicionamento</label><input class="input" name="acondicionamento" placeholder="Ex.: Tambor 200 L" value="${esc(r.acondicionamento)}"></div>
      <div class="field"><label>Destinação prevista</label><select class="input" name="destinacao">${options(DESTINACOES, r.destinacao)}</select></div>
    </form>`,
    actions: `${r.id ? '<button class="btn danger" id="del">Excluir</button><span style="flex:1"></span>' : ''}<button class="btn" data-close>Cancelar</button><button class="btn primary" id="ok">Salvar</button>`,
    onMount(el, close) {
      $('#ok', el).onclick = async () => {
        const f = $('#fr', el); if (!f.reportValidity()) return;
        const d = { ...formData(f), unidade: 'kg' };
        if (r.id) await Api.update('residuos', r.id, d); else await Api.create('residuos', d);
        close(); toast('Resíduo salvo'); refresh();
      };
      if (r.id) $('#del', el).onclick = async () => {
        try { await Api.remove('residuos', r.id); close(); toast('Resíduo excluído'); refresh(); } catch (e) { toast(e.message, true); }
      };
    },
  });
}
