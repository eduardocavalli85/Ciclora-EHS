/* Dashboard: indicadores de gestão de resíduos (calculados a partir das tabelas). */
let dashPeriodo = 12; // semanas

function renderDashboard(view, db) {
  const res = id => db.byId('residuos', id);
  const semanas = [...new Set(db.geracoes.map(g => g.semana))].sort();
  const per = semanas.slice(-dashPeriodo);
  const prev = semanas.slice(-dashPeriodo * 2, -dashPeriodo);
  const inS = (g, list) => list.includes(g.semana);
  const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);

  const gPer = db.geracoes.filter(g => inS(g, per));
  const gPrev = db.geracoes.filter(g => inS(g, prev));
  const total = sum(gPer, g => g.quantidade);
  const totalPrev = sum(gPrev, g => g.quantidade);
  const varPct = totalPrev ? (total / totalPrev - 1) * 100 : 0;
  const mediaSem = total / Math.max(per.length, 1);

  const valorizado = sum(gPer.filter(g => VALORIZACAO.includes(res(g.residuo_id)?.destinacao)), g => g.quantidade);
  const taxaVal = total ? valorizado / total * 100 : 0;
  const perigoso = sum(gPer.filter(g => res(g.residuo_id)?.classe === 'Classe I'), g => g.quantidade);

  const ini = per[0] || '0000-00-00';
  const fPer = db.financeiro.filter(f => f.data >= ini);
  const receita = sum(fPer.filter(f => f.tipo === 'Receita'), f => f.valor);
  const custo = sum(fPer.filter(f => f.tipo === 'Custo'), f => f.valor);
  const saldo = receita - custo;

  const pendCdf = db.mtrs.filter(m => m.status === 'Emitido' || m.status === 'Em transporte');
  const mtrPer = db.mtrs.filter(m => m.data_emissao >= ini && m.status !== 'Cancelado');

  const ativos = db.parceiros.filter(p => p.status === 'Homologado' || p.status === 'Em análise').map(p => p.id);
  const docsAtivos = db.documentos.filter(d => ativos.includes(d.parceiro_id) && d.validade);
  const vencidos = docsAtivos.filter(d => daysUntil(d.validade) < 0);
  const vencendo = docsAtivos.filter(d => daysUntil(d.validade) >= 0 && daysUntil(d.validade) <= 30);

  // ----- séries -----
  const classes = ['Classe I', 'Classe II A', 'Classe II B'];
  const seriesClasse = classes.map(c => ({
    name: c, color: CLASSE_COR[c],
    values: per.map(s => sum(db.geracoes.filter(g => g.semana === s && res(g.residuo_id)?.classe === c), g => g.quantidade) / 1000),
  }));
  const porDest = DESTINACOES.map(d => ({ label: d, value: sum(gPer.filter(g => res(g.residuo_id)?.destinacao === d), g => g.quantidade) / 1000 }))
    .filter(x => x.value > 0).sort((a, b) => b.value - a.value)
    .map(x => ({ ...x, sub: `${fmtN(x.value * 1000 / total * 100, 1)}%`, color: VALORIZACAO.includes(x.label) ? 'var(--teal)' : 'var(--s-i)' }));
  const meses = [...new Set(db.financeiro.map(f => f.data.slice(0, 7)))].sort().slice(-6);
  const seriesFin = [
    { name: 'Receita', color: 'var(--s-iia)', values: meses.map(m => sum(db.financeiro.filter(f => f.tipo === 'Receita' && f.data.startsWith(m)), f => f.valor)) },
    { name: 'Custo', color: 'var(--s-i)', values: meses.map(m => sum(db.financeiro.filter(f => f.tipo === 'Custo' && f.data.startsWith(m)), f => f.valor)) },
  ];
  const top = db.residuos.map(r => ({ label: r.nome, value: sum(gPer.filter(g => g.residuo_id === r.id), g => g.quantidade) / 1000, color: CLASSE_COR[r.classe], sub: r.classe }))
    .sort((a, b) => b.value - a.value).slice(0, 6);

  // ----- alertas -----
  const alertas = [];
  vencidos.forEach(d => alertas.push({ t: 'bad', title: `${d.tipo} vencido`, sub: `${db.byId('parceiros', d.parceiro_id)?.razao_social} · venceu em ${fmtD(d.validade)}`, link: '#parceiros' }));
  vencendo.forEach(d => alertas.push({ t: 'warn', title: `${d.tipo} vence em ${daysUntil(d.validade)} dias`, sub: db.byId('parceiros', d.parceiro_id)?.razao_social, link: '#parceiros' }));
  const atrasadas = pendCdf.filter(m => daysUntil(m.data_emissao) < -5);
  if (atrasadas.length) alertas.push({ t: 'warn', title: `${atrasadas.length} MTR(s) sem CDF há mais de 5 dias`, sub: 'Cobrar Certificado de Destinação Final do destinador', link: '#mtr' });
  db.parceiros.filter(p => p.status === 'Em análise').forEach(p => alertas.push({ t: 'info', title: 'Documentação aguardando análise', sub: p.razao_social, link: '#parceiros' }));
  const semAtual = mondayOf(TODAY);
  const ultimaSem = semanas[semanas.length - 1];
  const esperada = isoDate(new Date(parseD(semAtual).getTime() - 7 * 864e5));
  if (ultimaSem < esperada) alertas.push({ t: 'warn', title: 'Geração da semana anterior não lançada', sub: `Semana de ${fmtD(esperada)}`, link: '#residuos-semana' });
  const icon = { bad: ['var(--bad-bg)', 'var(--bad)', ICON.alert], warn: ['var(--warn-bg)', 'var(--warn)', ICON.clock], info: ['var(--info-bg)', 'var(--info)', ICON.info] };

  view.innerHTML = `
    <div class="toolbar">
      <span class="hint">Período de análise</span>
      <div class="seg" id="periodo">${[[4, '4 semanas'], [12, '12 semanas'], [semanas.length, 'Todo o histórico']].map(([v, l]) => `<button data-v="${v}" class="${dashPeriodo === v ? 'on' : ''}">${l}</button>`).join('')}</div>
      <span class="spacer"></span>
      <span class="hint">${fmtD(per[0])} a ${fmtD(isoDate(new Date(parseD(per[per.length - 1]).getTime() + 6 * 864e5)))}</span>
    </div>

    <div class="grid g-4">
      <div class="card kpi accent"><div class="label">Resíduos gerados</div>
        <div class="value">${fmtT(total)}<small>t</small></div>
        <div class="foot">Média de ${fmtT(mediaSem)} t/semana${prev.length === per.length ? ` · <span style="color:${varPct > 0 ? '#FFD39A' : 'var(--lime)'}">${varPct > 0 ? '▲' : '▼'} ${fmtN(Math.abs(varPct), 1)}%</span> vs. período anterior` : ''}</div></div>
      <div class="card kpi"><div class="label">Taxa de valorização (desvio de aterro)</div>
        <div class="value">${fmtN(taxaVal, 1)}<small>%</small></div>
        <div class="foot">${fmtT(valorizado)} t recicladas, reutilizadas ou coprocessadas</div></div>
      <div class="card kpi"><div class="label">Saldo financeiro dos resíduos</div>
        <div class="value" style="color:${saldo >= 0 ? 'var(--ok)' : 'var(--bad)'}">${fmtBRLk(saldo)}</div>
        <div class="foot">Receita ${fmtBRLk(receita)} · Custo ${fmtBRLk(custo)}</div></div>
      <div class="card kpi"><div class="label">Resíduos perigosos (Classe I)</div>
        <div class="value">${fmtN(total ? perigoso / total * 100 : 0, 1)}<small>%</small></div>
        <div class="foot">${fmtT(perigoso)} t no período</div></div>
    </div>
    <div class="grid g-4">
      <div class="card kpi"><div class="label">Custo de gestão por tonelada</div><div class="value">${fmtBRL(total ? custo / (total / 1000) : 0)}</div><div class="foot">Custos totais ÷ toneladas geradas</div></div>
      <div class="card kpi"><div class="label">MTRs emitidas no período</div><div class="value">${mtrPer.length}</div><div class="foot">${pendCdf.length} aguardando CDF do destinador</div></div>
      <div class="card kpi"><div class="label">Documentos de parceiros</div><div class="value" style="color:${vencidos.length ? 'var(--bad)' : 'inherit'}">${vencidos.length}<small>vencido(s)</small></div><div class="foot">${vencendo.length} vencendo nos próximos 30 dias</div></div>
      <div class="card kpi"><div class="label">Parceiros homologados</div><div class="value">${db.parceiros.filter(p => p.status === 'Homologado').length}<small>de ${db.parceiros.length}</small></div><div class="foot">${db.parceiros.filter(p => p.status === 'Em análise').length} em análise</div></div>
    </div>

    <div class="grid g-2-1">
      <div class="card">
        <div class="card-head"><div><h2>Geração semanal por classe (t)</h2><p>Classificação ABNT NBR 10004 · passe o mouse para ver os valores</p></div></div>
        ${legend(seriesClasse)}
        <div class="chart">${columnChart({ cats: per.map(fmtDs), series: seriesClasse, height: 330, fmt: v => fmtN(v, 1), fmtAxis: v => fmtN(v, 0), unit: ' t' })}</div>
      </div>
      <div class="card">
        <div class="card-head"><div><h2>Alertas de conformidade</h2><p>${alertas.length} item(ns) exigem atenção</p></div></div>
        <ul class="alerts">${alertas.slice(0, 7).map(a => `<li><div class="ic" style="background:${icon[a.t][0]};color:${icon[a.t][1]}">${icon[a.t][2]}</div><div style="flex:1"><strong>${esc(a.title)}</strong><span>${esc(a.sub || '')}</span></div><a class="btn sm" href="${a.link}">Ver</a></li>`).join('') || '<li><div>Nenhuma pendência. 🎉</div></li>'}</ul>
      </div>
    </div>

    <div class="grid g-3">
      <div class="card">
        <div class="card-head"><div><h2>Destinação final (t)</h2><p><span style="color:var(--teal);font-weight:600">■</span> valorização · <span style="color:var(--s-i);font-weight:600">■</span> disposição</p></div></div>
        <div class="chart" style="padding-top:14px">${barList({ items: porDest, fmt: v => fmtN(v, 1), unit: ' t' })}</div>
      </div>
      <div class="card">
        <div class="card-head"><div><h2>Maiores geradores (t)</h2><p>Resíduos com maior volume no período</p></div></div>
        <div class="chart" style="padding-top:14px">${barList({ items: top, fmt: v => fmtN(v, 1), unit: ' t' })}</div>
      </div>
      <div class="card">
        <div class="card-head"><div><h2>Receita × custo mensal</h2><p>Últimos ${meses.length} meses</p></div></div>
        ${legend(seriesFin)}
        <div class="chart">${columnChart({ cats: meses.map(fmtMes), series: seriesFin, mode: 'group', height: 260, width: 380, fmt: fmtBRL, fmtAxis: v => fmtBRLk(v).replace('R$ ', '') })}</div>
      </div>
    </div>`;

  $$('#periodo button', view).forEach(b => b.onclick = () => { dashPeriodo = +b.dataset.v; renderDashboard(view, db); bindTips(view); });
}
