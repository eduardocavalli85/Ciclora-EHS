/* Camada de acesso a dados.
   - Modo normal: conversa com a API Flask (/api/...).
   - Modo protótipo (window.CICLORA_SEED definido): usa dados em memória,
     permitindo navegar no protótipo de alta fidelidade sem servidor. */
const Api = (() => {
  const MOCK = !!window.CICLORA_SEED;

  async function http(method, url, body, isForm) {
    const opt = { method, headers: {} };
    if (body && !isForm) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
    if (isForm) opt.body = body;
    const r = await fetch(url, opt);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.erro || `Erro ${r.status}`);
    return data;
  }

  // ---------- implementação em memória (protótipo) ----------
  const mem = MOCK ? JSON.parse(JSON.stringify(window.CICLORA_SEED.tables)) : null;
  const nextId = t => (mem[t].reduce((m, r) => Math.max(m, r.id), 0) + 1);
  const mock = {
    async list(t) { return mem[t].map(r => ({ ...r })); },
    async create(t, data) {
      const row = { id: nextId(t), ...data };
      if (t === 'parceiros' && !row.status) row.status = 'Rascunho';
      mem[t].push(row); return { ...row };
    },
    async update(t, id, data) {
      const row = mem[t].find(r => r.id === id); Object.assign(row, data); return { ...row };
    },
    async remove(t, id) {
      mem[t] = mem[t].filter(r => r.id !== id);
      if (t === 'mtrs') mem.mtr_itens = mem.mtr_itens.filter(i => i.mtr_id !== id);
      return { ok: true };
    },
    async emitirMtr(data) {
      const itens = (data.itens || []).filter(i => i.residuo_id && +i.quantidade > 0);
      if (!data.transportador_id || !data.destinador_id) throw new Error('Informe transportador e destinador');
      if (!itens.length) throw new Error('Inclua ao menos um resíduo com quantidade');
      const ult = mem.mtrs.reduce((m, r) => Math.max(m, +r.numero.slice(9)), 0);
      const emissao = data.data_emissao || isoDate(TODAY);
      const mtr = { id: nextId('mtrs'), numero: `MTR-${emissao.slice(0, 4)}-${String(ult + 1).padStart(6, '0')}`,
        data_emissao: emissao, transportador_id: +data.transportador_id, destinador_id: +data.destinador_id,
        placa: data.placa, motorista: data.motorista, status: 'Emitido', data_recebimento: null, cdf_numero: null, observacao: data.observacao };
      mem.mtrs.push(mtr);
      itens.forEach(i => mem.mtr_itens.push({ id: nextId('mtr_itens'), mtr_id: mtr.id, residuo_id: +i.residuo_id, quantidade: +i.quantidade, acondicionamento: i.acondicionamento }));
      return { ...mtr };
    },
    async lote(data) {
      data.itens.forEach(i => {
        if (i.quantidade === '' || i.quantidade == null) return;
        const ex = mem.geracoes.find(g => g.residuo_id === +i.residuo_id && g.semana === data.semana);
        if (ex) ex.quantidade = +i.quantidade;
        else mem.geracoes.push({ id: nextId('geracoes'), residuo_id: +i.residuo_id, semana: data.semana, quantidade: +i.quantidade });
      });
      return { ok: true };
    },
    async upload(form) {
      const f = form.get('arquivo');
      const row = { id: nextId('documentos'), parceiro_id: +form.get('parceiro_id'), tipo: form.get('tipo'), numero: form.get('numero'),
        emissao: form.get('emissao'), validade: form.get('validade'), arquivo: null, nome_arquivo: f && f.name ? f.name : null,
        status: 'Pendente', enviado_em: null };
      mem.documentos.push(row); return { ...row };
    },
  };

  const real = {
    list: t => http('GET', `/api/${t}`),
    create: (t, d) => http('POST', `/api/${t}`, d),
    update: (t, id, d) => http('PUT', `/api/${t}/${id}`, d),
    remove: (t, id) => http('DELETE', `/api/${t}/${id}`),
    emitirMtr: d => http('POST', '/api/mtrs', d),
    lote: d => http('POST', '/api/geracoes/lote', d),
    upload: form => http('POST', '/api/documentos/upload', form, true),
  };

  const impl = MOCK ? mock : real;

  // carrega todas as tabelas de uma vez (volume pequeno no MVP)
  async function loadAll() {
    const names = ['parceiros', 'documentos', 'residuos', 'geracoes', 'mtrs', 'mtr_itens', 'financeiro'];
    const res = await Promise.all(names.map(n => impl.list(n)));
    const db = {};
    names.forEach((n, i) => { db[n] = res[i]; });
    db.byId = (t, id) => db[t].find(r => r.id === +id);
    return db;
  }

  return { ...impl, loadAll, MOCK };
})();
