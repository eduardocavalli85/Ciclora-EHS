/* Financeiro: lançamentos de custos e receitas ligados aos resíduos. */
const CATEGORIAS = {
  Custo: ['Destinação final', 'Transporte', 'Locação de caçambas/contêineres', 'Análises laboratoriais', 'Taxas e licenças', 'Outros custos'],
  Receita: ['Venda de recicláveis', 'Venda de sucata metálica', 'Créditos de logística reversa', 'Outras receitas'],
};
let finMes = 'todos', finTipo = 'Todos', finLimit = 25;

function renderFinanceiro(view, db) {
  const meses = [...new Set(db.financeiro.map(f => f.data.slice(0, 7)))].sort();
  const base = db.financeiro.filter(f => finMes === 'todos' || f.data.startsWith(finMes));
  const lista = base.filter(f => finTipo === 'Todos' || f.tipo === finTipo).sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id);
  const sum = arr => arr.reduce((a, f) => a + f.valor, 0);
  const receita = sum(base.filter(f => f.tipo === 'Receita'));
  const custo = sum(base.filter(f => f.tipo === 'Custo'));
  const ton = db.geracoes.filter(g => finMes === 'todos' || g.semana.startsWith(finMes)).reduce((a, g) => a + g.quantidade, 0) / 1000;
  const porCat = Object.entries(base.reduce((o, f) => { const k = f.tipo + '|' + f.categoria; o[k] = (o[k] || 0) + f.valor; return o; }, {}))
    .map(([k, v]) => ({ label: k.split('|')[1], value: v, color: k.startsWith('Receita') ? 'var(--s-iia)' : 'var(--s-i)', sub: k.split('|')[0] }))
    .sort((a, b) => b.value - a.value);
  const ult = meses.slice(-6);
  const series = [
    { name: 'Receita', color: 'var(--s-iia)', values: ult.map(m => sum(db.financeiro.filter(f => f.tipo === 'Receita' && f.data.startsWith(m)))) },
    { name: 'Custo', color: 'var(--s-i)', values: ult.map(m => sum(db.financeiro.filter(f => f.tipo === 'Custo' && f.data.startsWith(m)))) },
  ];
  const shown = lista.slice(0, finLimit);

  view.innerHTML = `
    <div class="toolbar">
      <div class="field"><label>Competência</label><select class="input" id="mes" style="width:200px">${options([['todos', 'Todo o período'], ...meses.slice().reverse().map(m => [m, fmtMes(m)])], finMes)}</select></div>
      <span class="spacer"></span>
      <button class="btn primary" id="novo" style="align-self:flex-end">${ICON.plus} Novo lançamento</button>
    </div>
    <div class="grid g-4">
      <div class="card kpi"><div class="label">Receitas</div><div class="value" style="color:var(--ok)">${fmtBRL(receita)}</div><div class="foot">Venda de recicláveis e sucata</div></div>
      <div class="card kpi"><div class="label">Custos</div><div class="value">${fmtBRL(custo)}</div><div class="foot">Transporte, destinação, locação, análises</div></div>
      <div class="card kpi accent"><div class="label">Saldo</div><div class="value">${fmtBRL(receita - custo)}</div><div class="foot">${receita >= custo ? 'Resíduos geram resultado positivo' : 'Resultado negativo no período'}</div></div>
      <div class="card kpi"><div class="label">Custo por tonelada gerada</div><div class="value">${fmtBRL(ton ? custo / ton : 0)}</div><div class="foot">${fmtN(ton, 1)} t no período</div></div>
    </div>
    <div class="grid g-2">
      <div class="card"><div class="card-head"><div><h2>Receita × custo por mês</h2><p>Últimos ${ult.length} meses</p></div></div>${legend(series)}
        <div class="chart">${columnChart({ cats: ult.map(fmtMes), series, mode: 'group', width: 560, fmt: fmtBRL, fmtAxis: v => fmtBRLk(v).replace('R$ ', '') })}</div></div>
      <div class="card"><div class="card-head"><div><h2>Por categoria</h2><p><span style="color:var(--s-iia)">■</span> receita · <span style="color:var(--s-i)">■</span> custo — ${finMes === 'todos' ? 'todo o período' : fmtMes(finMes)}</p></div></div>
        <div class="chart" style="padding-top:14px">${barList({ items: porCat, fmt: v => fmtBRLk(v), width: 520 })}</div></div>
    </div>
    <div class="card">
      <div class="card-head"><div class="seg" id="tipo">${['Todos', 'Receita', 'Custo'].map(s => `<button class="${finTipo === s ? 'on' : ''}" data-s="${s}">${s === 'Todos' ? 'Todos' : s + 's'}</button>`).join('')}</div><span class="hint">${lista.length} lançamento(s)${lista.length > finLimit ? ` · exibindo ${finLimit}` : ''}</span></div>
      <div class="table-wrap" style="margin-top:14px"><table class="t">
        <thead><tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th>Parceiro</th><th>MTR</th><th>NF</th><th class="num">Valor</th><th></th></tr></thead>
        <tbody>${shown.map(f => `<tr><td class="nowrap">${fmtD(f.data)}</td><td>${badge(f.tipo)}</td><td>${esc(f.categoria)}</td><td>${esc(f.descricao || '—')}</td>
          <td class="muted">${esc(db.byId('parceiros', f.parceiro_id)?.razao_social || '—')}</td><td class="muted nowrap">${esc(db.byId('mtrs', f.mtr_id)?.numero || '—')}</td><td class="muted nowrap">${esc(f.nota_fiscal || '—')}</td>
          <td class="num strong" style="color:${f.tipo === 'Receita' ? 'var(--ok)' : 'inherit'}">${f.tipo === 'Custo' ? '−' : '+'} ${fmtBRL(f.valor)}</td>
          <td><div class="row-actions"><button class="btn sm ghost" data-del="${f.id}" title="Excluir">${ICON.trash}</button></div></td></tr>`).join('') || '<tr><td colspan="9" class="empty">Sem lançamentos.</td></tr>'}</tbody>
      </table></div>
      ${lista.length > finLimit ? '<div class="card-pad" style="text-align:center"><button class="btn" id="mais">Mostrar mais lançamentos</button></div>' : ''}
    </div>`;
  $('#mes', view).onchange = e => { finMes = e.target.value; renderFinanceiro(view, db); bindTips(view); };
  $$('#tipo button', view).forEach(b => b.onclick = () => { finTipo = b.dataset.s; renderFinanceiro(view, db); bindTips(view); });
  $('#novo', view).onclick = () => formLancamento(db);
  if ($('#mais', view)) $('#mais', view).onclick = () => { finLimit += 50; renderFinanceiro(view, db); bindTips(view); };
  $$('[data-del]', view).forEach(b => b.onclick = async () => { await Api.remove('financeiro', +b.dataset.del); toast('Lançamento excluído'); refresh(); });
}

function formLancamento(db) {
  const mtrs = db.mtrs.slice().sort((a, b) => b.id - a.id).slice(0, 60);
  modal({
    title: 'Novo lançamento financeiro',
    body: `<form class="form" id="ff">
      <div class="field"><label>Tipo <span class="req">*</span></label><div class="seg" id="tp"><button type="button" class="on" data-v="Custo">Custo</button><button type="button" data-v="Receita">Receita</button></div><input type="hidden" name="tipo" value="Custo"></div>
      <div class="field"><label>Data <span class="req">*</span></label><input class="input" type="date" name="data" required value="${isoDate(TODAY)}"></div>
      <div class="field"><label>Categoria <span class="req">*</span></label><select class="input" name="categoria" id="cat">${options(CATEGORIAS.Custo)}</select></div>
      <div class="field"><label>Valor (R$) <span class="req">*</span></label><input class="input" type="number" step="0.01" min="0.01" name="valor" required></div>
      <div class="field full"><label>Descrição</label><input class="input" name="descricao" placeholder="Ex.: Destinação de borra de tinta – outubro"></div>
      <div class="field"><label>Resíduo</label><select class="input" name="residuo_id">${options(db.residuos.map(r => [r.id, r.nome]), '', '—')}</select></div>
      <div class="field"><label>Parceiro</label><select class="input" name="parceiro_id">${options(db.parceiros.map(p => [p.id, p.razao_social]), '', '—')}</select></div>
      <div class="field"><label>MTR vinculada</label><select class="input" name="mtr_id">${options(mtrs.map(m => [m.id, m.numero]), '', '—')}</select></div>
      <div class="field"><label>Nota fiscal</label><input class="input" name="nota_fiscal" placeholder="NF 00000"></div>
    </form>`,
    actions: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="ok">Salvar lançamento</button>',
    onMount(el, close) {
      $$('#tp button', el).forEach(b => b.onclick = () => {
        $$('#tp button', el).forEach(x => x.classList.toggle('on', x === b));
        $('[name=tipo]', el).value = b.dataset.v; $('#cat', el).innerHTML = options(CATEGORIAS[b.dataset.v]);
      });
      $('[name=mtr_id]', el).onchange = e => {
        const m = db.byId('mtrs', e.target.value); if (!m) return;
        const it = db.mtr_itens.find(i => i.mtr_id === m.id);
        if (it) $('[name=residuo_id]', el).value = it.residuo_id;
        $('[name=parceiro_id]', el).value = m.destinador_id;
      };
      $('#ok', el).onclick = async () => {
        const f = $('#ff', el); if (!f.reportValidity()) return;
        const d = formData(f);
        d.valor = +d.valor;
        ['residuo_id', 'parceiro_id', 'mtr_id'].forEach(k => { d[k] = d[k] ? +d[k] : null; });
        try { await Api.create('financeiro', d); close(); toast('Lançamento registrado'); refresh(); } catch (e) { toast(e.message, true); }
      };
    },
  });
}
