/* Utilitários de interface: formatação, ícones, modal, toast e gráficos SVG. */
const TODAY = window.CICLORA_SEED ? new Date(window.CICLORA_SEED.today + 'T12:00:00') : new Date();
const CLIENTE = {
  nome: 'Kairós Motors do Brasil S.A.',
  unidade: 'Planta São José dos Pinhais – PR',
  cnpj: '47.318.209/0001-55',
  endereco: 'Rod. BR-277, km 82 – Distrito Industrial, São José dos Pinhais – PR',
  responsavel: 'Coordenação de Meio Ambiente – EHS',
};
const CLASSE_COR = { 'Classe I': 'var(--s-i)', 'Classe II A': 'var(--s-iia)', 'Classe II B': 'var(--s-iib)' };
const DESTINACOES = ['Reciclagem', 'Reutilização', 'Coprocessamento', 'Rerrefino', 'Compostagem', 'Descontaminação', 'Incineração', 'Aterro'];
const VALORIZACAO = ['Reciclagem', 'Reutilização', 'Coprocessamento', 'Rerrefino', 'Compostagem', 'Descontaminação'];

function isoDate(d) { const z = new Date(d); z.setMinutes(z.getMinutes() - z.getTimezoneOffset()); return z.toISOString().slice(0, 10); }
function parseD(s) { return new Date(s + 'T12:00:00'); }
function daysUntil(s) { return Math.round((parseD(s) - parseD(isoDate(TODAY))) / 864e5); }
function mondayOf(d) { const x = new Date(d); const k = (x.getDay() + 6) % 7; x.setDate(x.getDate() - k); return isoDate(x); }
const fmtN = (n, d = 0) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtT = kg => fmtN(kg / 1000, kg >= 100000 ? 0 : 1);
const fmtBRL = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtBRLk = v => { const a = Math.abs(v); const s = v < 0 ? '−' : ''; return a >= 1e6 ? `${s}R$ ${fmtN(a / 1e6, 2)} mi` : a >= 1e3 ? `${s}R$ ${fmtN(a / 1e3, 0)} mil` : `${s}R$ ${fmtN(a)}`; };
const fmtD = s => s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '—';
const fmtDs = s => s ? s.slice(8, 10) + '/' + s.slice(5, 7) : '';
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const fmtMes = ym => `${MESES[+ym.slice(5, 7) - 1]}/${ym.slice(2, 4)}`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

const ICON = {
  dash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  partner: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21v-6h6v6"/><path d="M3 21h18"/></svg>',
  waste: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 15h10l1-15"/><path d="M10 11v6M14 11v6"/></svg>',
  truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 5h13v11H1z"/><path d="M14 9h4l3 3v4h-7"/><circle cx="5.5" cy="18" r="2"/><circle cx="17.5" cy="18" r="2"/></svg>',
  money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>',
  print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><rect x="2" y="9" width="20" height="9" rx="2"/><path d="M6 14h12v8H6z"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/></svg>',
};

const LOGO_BRANCO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><path d="M67.64 16.67 A44 44 0 1 0 101.35 44.95" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round"/><path d="M101 47 Q109 20 84 6 Q76 34 101 47 Z" fill="#A6D86B"/><path d="M99 42 Q93 24 86 11" fill="none" stroke="#0E4D3A" stroke-width="2" stroke-linecap="round" opacity=".85"/><rect x="40" y="62" width="10" height="18" rx="3" fill="#fff" opacity=".55"/><rect x="55" y="52" width="10" height="28" rx="3" fill="#fff" opacity=".8"/><rect x="70" y="42" width="10" height="38" rx="3" fill="#fff"/></svg>`;

function badge(status) {
  const map = {
    Homologado: 'b-ok', Aprovado: 'b-ok', Recebido: 'b-ok', Receita: 'b-ok',
    'Em análise': 'b-info', 'Em transporte': 'b-info', Emitido: 'b-warn', Pendente: 'b-warn',
    Rascunho: 'b-neutral', Reprovado: 'b-bad', Cancelado: 'b-bad', Vencido: 'b-bad', Custo: 'b-neutral',
  };
  return `<span class="badge ${map[status] || 'b-neutral'}">${esc(status)}</span>`;
}
function validadeBadge(v) {
  if (!v) return '<span class="badge b-neutral">Sem validade</span>';
  const d = daysUntil(v);
  if (d < 0) return `<span class="badge b-bad">Vencido há ${-d} d</span>`;
  if (d <= 30) return `<span class="badge b-warn">Vence em ${d} d</span>`;
  return `<span class="badge b-ok">Válido até ${fmtD(v)}</span>`;
}
const classeTag = c => `<span class="classe"><i style="background:${CLASSE_COR[c] || '#999'}"></i>${esc(c)}</span>`;
const options = (arr, sel, ph) => (ph ? `<option value="">${ph}</option>` : '') + arr.map(o => {
  const [v, l] = Array.isArray(o) ? o : [o, o];
  return `<option value="${esc(v)}" ${String(v) === String(sel ?? '') ? 'selected' : ''}>${esc(l)}</option>`;
}).join('');

function toast(msg, err) {
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2800);
}

function modal({ title, body, actions = '', wide = false, onMount }) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <header><h3>${esc(title)}</h3><button class="x" aria-label="Fechar">×</button></header>
    <div class="body">${body}</div>${actions ? `<footer>${actions}</footer>` : ''}</div>`;
  const close = () => bg.remove();
  bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('.x') || e.target.closest('[data-close]')) close(); });
  document.body.appendChild(bg);
  if (onMount) onMount(bg, close);
  return { el: bg, close };
}

function formData(form) {
  const o = {};
  new FormData(form).forEach((v, k) => { o[k] = typeof v === 'string' ? v.trim() : v; });
  return o;
}

/* ---------------- gráficos SVG (sem dependências externas) ---------------- */
const Tip = (() => {
  let el;
  const ensure = () => { if (!el) { el = document.createElement('div'); el.className = 'tooltip'; document.body.appendChild(el); } return el; };
  return {
    show(html, e) { const t = ensure(); t.innerHTML = html; t.style.opacity = 1; Tip.move(e); },
    move(e) { const t = ensure(); const w = t.offsetWidth; let x = e.clientX + 14; if (x + w > innerWidth - 8) x = e.clientX - w - 14; t.style.left = x + 'px'; t.style.top = (e.clientY + 14) + 'px'; },
    hide() { if (el) el.style.opacity = 0; },
  };
})();
function bindTips(root) {
  $$('[data-tip]', root).forEach(n => {
    n.addEventListener('mouseenter', e => Tip.show(decodeURIComponent(n.dataset.tip), e));
    n.addEventListener('mousemove', e => Tip.move(e));
    n.addEventListener('mouseleave', Tip.hide);
  });
}
function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}
function roundedTopRect(x, y, w, h, r) {
  if (h <= 0) return '';
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** Colunas (empilhadas ou agrupadas).
 *  cats: rótulos do eixo x; series: [{name,color,values}] ; mode: 'stack' | 'group' */
function columnChart({ cats, series, mode = 'stack', height = 260, width = 720, fmt = fmtN, fmtAxis = fmt, unit = '' }) {
  const W = width, H = height, L = 52, R = 8, T = 12, B = 28;
  const iw = W - L - R, ih = H - T - B;
  const totals = cats.map((_, i) => mode === 'stack' ? series.reduce((s, se) => s + (se.values[i] || 0), 0) : Math.max(...series.map(se => se.values[i] || 0)));
  const max = niceMax(Math.max(...totals) * 1.05);
  const y = v => T + ih - (v / max) * ih;
  const step = iw / cats.length;
  const gap = 2;
  const bw = mode === 'stack' ? Math.min(34, step * .62) : Math.min(22, step * .34);
  let g = '';
  for (let k = 0; k <= 4; k++) {
    const v = max * k / 4;
    g += `<line class="grid-line" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${fmtAxis(v)}</text>`;
  }
  const every = Math.ceil(cats.length / 12);
  let cols = '';
  cats.forEach((c, i) => {
    const cx = L + step * i + step / 2;
    let marks = '';
    if (mode === 'stack') {
      let acc = 0;
      const vis = series.filter(se => (se.values[i] || 0) > 0);
      vis.forEach((se, j) => {
        const v = se.values[i] || 0;
        const y0 = y(acc), y1 = y(acc + v);
        const top = j === vis.length - 1;
        const h = Math.max(0, y0 - y1 - (top ? 0 : gap));
        marks += top ? `<path d="${roundedTopRect(cx - bw / 2, y1, bw, y0 - y1, 4)}" fill="${se.color}"/>`
          : `<rect x="${cx - bw / 2}" y="${y1 + gap}" width="${bw}" height="${h}" fill="${se.color}"/>`;
        acc += v;
      });
    } else {
      const n = series.length;
      series.forEach((se, j) => {
        const v = se.values[i] || 0;
        const x = cx - (n * bw + (n - 1) * gap) / 2 + j * (bw + gap);
        marks += `<path d="${roundedTopRect(x, y(v), bw, T + ih - y(v), 4)}" fill="${se.color}"/>`;
      });
    }
    const tip = `<b>${esc(c)}</b>` + series.map(se => `<div class="row"><span><i style="background:${se.color}"></i>${esc(se.name)}</span><span>${fmt(se.values[i] || 0)}${unit}</span></div>`).join('') +
      (mode === 'stack' && series.length > 1 ? `<div class="row" style="border-top:1px solid rgba(255,255,255,.2);margin-top:4px;padding-top:4px"><span>Total</span><span>${fmt(totals[i])}${unit}</span></div>` : '');
    cols += `<g class="col"><rect class="band" x="${L + step * i}" y="${T}" width="${step}" height="${ih}"/>${marks}
      ${i % every === 0 ? `<text x="${cx}" y="${H - 8}" text-anchor="middle">${esc(c)}</text>` : ''}
      <rect class="hit" x="${L + step * i}" y="${T}" width="${step}" height="${ih}" data-tip="${encodeURIComponent(tip)}"/></g>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img"><g class="axis">${g}${cols}</g><line class="baseline" x1="${L}" x2="${W - R}" y1="${T + ih}" y2="${T + ih}"/></svg>`;
}

/** Barras horizontais de uma série. items: [{label, value, sub}] */
function barList({ items, color = 'var(--teal)', fmt = fmtN, unit = '', width = 340 }) {
  const W = width, rowH = 34, L = 0, labelW = 0;
  const max = Math.max(...items.map(i => i.value), 1);
  const H = items.length * rowH + 4;
  let out = '';
  items.forEach((it, k) => {
    const y = k * rowH;
    const w = Math.max(2, (it.value / max) * (W - 130));
    const tip = `<b>${esc(it.label)}</b><div class="row"><span>${fmt(it.value)}${unit}</span><span>${it.sub || ''}</span></div>`;
    out += `<g><text class="lbl" x="${L}" y="${y + 11}">${esc(it.label)}</text>
      <path d="M${labelW},${y + 16}H${labelW + w - 4}Q${labelW + w},${y + 16} ${labelW + w},${y + 20}V${y + 24}Q${labelW + w},${y + 28} ${labelW + w - 4},${y + 28}H${labelW}Z" fill="${it.color || color}"/>
      <text class="val" x="${labelW + w + 8}" y="${y + 26}">${fmt(it.value)}${unit}${it.sub ? ` <tspan fill="var(--ink-3)" font-weight="400">· ${esc(it.sub)}</tspan>` : ''}</text>
      <rect class="hit" x="0" y="${y}" width="${W}" height="${rowH}" data-tip="${encodeURIComponent(tip)}"/></g>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img">${out}</svg>`;
}

function legend(series) {
  return `<div class="legend">${series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>`;
}
