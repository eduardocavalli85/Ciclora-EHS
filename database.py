"""Camada de persistência da Ciclora EHS (SQLite).

Cria o esquema do banco e popula com dados de demonstração da
cliente fictícia Kairós Motors do Brasil S.A. (montadora de veículos).
"""
import os
import random
import sqlite3
from datetime import date, timedelta

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("CICLORA_DB", os.path.join(BASE_DIR, "ciclora.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS parceiros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    razao_social TEXT NOT NULL,
    cnpj TEXT NOT NULL,
    tipo TEXT NOT NULL,              -- Transportador | Destinador | Transportador e Destinador
    atividade TEXT,                  -- Reciclagem, Coprocessamento, Aterro...
    cidade TEXT,
    uf TEXT,
    contato_nome TEXT,
    email TEXT,
    telefone TEXT,
    status TEXT NOT NULL DEFAULT 'Rascunho',  -- Rascunho | Em análise | Homologado | Reprovado
    enviado_em TEXT,
    observacao TEXT,
    criado_em TEXT DEFAULT (date('now'))
);

CREATE TABLE IF NOT EXISTS documentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parceiro_id INTEGER NOT NULL REFERENCES parceiros(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    numero TEXT,
    emissao TEXT,
    validade TEXT,
    arquivo TEXT,                    -- nome do arquivo salvo em /uploads
    nome_arquivo TEXT,               -- nome original enviado pelo parceiro
    status TEXT NOT NULL DEFAULT 'Pendente',  -- Pendente | Aprovado | Reprovado
    enviado_em TEXT
);

CREATE TABLE IF NOT EXISTS residuos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    codigo_ibama TEXT,
    classe TEXT NOT NULL,            -- Classe I | Classe II A | Classe II B (ABNT NBR 10004)
    estado_fisico TEXT,
    unidade TEXT NOT NULL DEFAULT 'kg',
    area_geradora TEXT,
    acondicionamento TEXT,
    destinacao TEXT                  -- Reciclagem, Coprocessamento, Rerrefino, Aterro...
);

CREATE TABLE IF NOT EXISTS geracoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    residuo_id INTEGER NOT NULL REFERENCES residuos(id) ON DELETE CASCADE,
    semana TEXT NOT NULL,            -- data (segunda-feira) da semana de referência
    quantidade REAL NOT NULL,
    observacao TEXT,
    UNIQUE(residuo_id, semana)
);

CREATE TABLE IF NOT EXISTS mtrs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT UNIQUE NOT NULL,
    data_emissao TEXT NOT NULL,
    transportador_id INTEGER REFERENCES parceiros(id),
    destinador_id INTEGER REFERENCES parceiros(id),
    placa TEXT,
    motorista TEXT,
    status TEXT NOT NULL DEFAULT 'Emitido',   -- Emitido | Em transporte | Recebido | Cancelado
    data_recebimento TEXT,
    cdf_numero TEXT,
    observacao TEXT
);

CREATE TABLE IF NOT EXISTS mtr_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mtr_id INTEGER NOT NULL REFERENCES mtrs(id) ON DELETE CASCADE,
    residuo_id INTEGER NOT NULL REFERENCES residuos(id),
    quantidade REAL NOT NULL,
    acondicionamento TEXT
);

CREATE TABLE IF NOT EXISTS financeiro (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL,
    tipo TEXT NOT NULL,              -- Custo | Receita
    categoria TEXT NOT NULL,
    descricao TEXT,
    valor REAL NOT NULL,
    residuo_id INTEGER REFERENCES residuos(id),
    parceiro_id INTEGER REFERENCES parceiros(id),
    mtr_id INTEGER REFERENCES mtrs(id),
    nota_fiscal TEXT
);
"""

# ---------------------------------------------------------------- seed data
PARCEIROS = [
    # razao_social, cnpj, tipo, atividade, cidade, uf, contato, email, telefone, status
    ("Recicla Sul Metais Ltda", "12.483.551/0001-07", "Destinador", "Reciclagem de metais", "Curitiba", "PR", "Marcos Vieira", "comercial@reciclasul.com.br", "(41) 3344-1200", "Homologado"),
    ("EcoPapel Paraná Reciclagem Ltda", "08.915.332/0001-41", "Destinador", "Reciclagem de papel e plástico", "Araucária", "PR", "Juliana Prado", "juliana@ecopapelpr.com.br", "(41) 3643-8890", "Homologado"),
    ("Transportes Ambiental Iguaçu Ltda", "21.640.778/0001-90", "Transportador", "Transporte de resíduos Classe I e II", "São José dos Pinhais", "PR", "Rafael Koch", "operacao@taiguacu.com.br", "(41) 3382-4500", "Homologado"),
    ("CoproVerde Soluções Ambientais S.A.", "33.207.164/0001-58", "Destinador", "Coprocessamento", "Rio Branco do Sul", "PR", "Fernanda Lima", "fernanda.lima@coproverde.com.br", "(41) 3652-7700", "Homologado"),
    ("Rerrefino Araucária Ltda", "05.774.920/0001-36", "Transportador e Destinador", "Rerrefino de óleo lubrificante", "Araucária", "PR", "Paulo Haddad", "coleta@rerrefinoaraucaria.com.br", "(41) 3901-2020", "Homologado"),
    ("CTR Vale do Iguaçu Ltda", "17.338.402/0001-63", "Destinador", "Aterro Classe II", "Fazenda Rio Grande", "PR", "Cláudia Santos", "ctr@valedoiguacu.com.br", "(41) 3608-1500", "Homologado"),
    ("BioComposta Campos Gerais Ltda", "40.112.857/0001-02", "Destinador", "Compostagem", "Ponta Grossa", "PR", "Tiago Ribas", "tiago@biocomposta.com.br", "(42) 3220-0101", "Em análise"),
    ("Lumina Descontaminação de Lâmpadas Ltda", "29.551.630/0001-84", "Transportador e Destinador", "Descontaminação de lâmpadas", "Pinhais", "PR", "Sônia Mendes", "sonia@lumina.eco.br", "(41) 3033-9080", "Rascunho"),
]

# nome, codigo_ibama, classe, estado, area, acondicionamento, destinacao,
# kg/semana base, preço R$/kg (+ receita, - custo), parceiro destinador (índice 1-based)
RESIDUOS = [
    ("Sucata de aço (estamparia)", "12 01 01", "Classe II B", "Sólido", "Estamparia", "Caçamba 30 m³", "Reciclagem", 42000, 0.92, 1),
    ("Sucata de alumínio", "12 01 03", "Classe II B", "Sólido", "Usinagem de motores", "Contêiner metálico", "Reciclagem", 3800, 6.10, 1),
    ("Papelão e embalagens de papel", "15 01 01", "Classe II A", "Sólido", "Logística / Montagem", "Fardos", "Reciclagem", 6500, 0.48, 2),
    ("Plástico e filme stretch", "15 01 02", "Classe II A", "Sólido", "Logística / Montagem", "Bags", "Reciclagem", 2400, 0.85, 2),
    ("Madeira (pallets e caixas)", "15 01 03", "Classe II A", "Sólido", "Logística", "Pilhas / caçamba", "Reutilização", 5400, 0.10, 2),
    ("Borra de tinta (cabine de pintura)", "08 01 13*", "Classe I", "Pastoso", "Pintura", "Tambor 200 L", "Coprocessamento", 3100, -1.45, 4),
    ("Lodo de ETE (fosfatização)", "11 01 09*", "Classe I", "Pastoso", "ETE / Pré-tratamento", "Caçamba estanque", "Coprocessamento", 4200, -1.10, 4),
    ("Materiais contaminados com óleo (EPIs, panos)", "15 02 02*", "Classe I", "Sólido", "Manutenção / Montagem", "Tambor 200 L", "Coprocessamento", 1600, -1.60, 4),
    ("Óleo lubrificante usado", "13 02 05*", "Classe I", "Líquido", "Manutenção / Usinagem", "Tanque 1.000 L", "Rerrefino", 900, 0.30, 5),
    ("Resíduo orgânico (refeitório)", "20 01 08", "Classe II A", "Sólido", "Refeitório", "Bombonas 50 L", "Compostagem", 5200, -0.26, 7),
    ("Rejeito não reciclável", "20 03 01", "Classe II A", "Sólido", "Administrativo / Geral", "Caçamba 30 m³", "Aterro", 3800, -0.22, 6),
    ("Lâmpadas fluorescentes", "20 01 21*", "Classe I", "Sólido", "Facilities", "Caixa original", "Descontaminação", 25, -3.80, 8),
]

DOCS_DESTINADOR = ["Licença de Operação (LO)", "CTF/APP IBAMA", "Alvará de Funcionamento"]
DOCS_TRANSPORTADOR = ["Licença Ambiental de Transporte", "CTF/APP IBAMA", "Registro ANTT", "Apólice de seguro RCTR-C"]


def monday(d):
    return d - timedelta(days=d.weekday())


def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(force=False):
    if force and os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    fresh = not os.path.exists(DB_PATH)
    conn = connect()
    conn.executescript(SCHEMA)
    if fresh:
        seed(conn)
    conn.commit()
    conn.close()


def seed(conn, today=None):
    rnd = random.Random(42)
    today = today or date.today()
    cur = conn.cursor()

    # parceiros + documentos
    for i, p in enumerate(PARCEIROS, start=1):
        enviado = (today - timedelta(days=rnd.randint(20, 300))).isoformat() if p[9] != "Rascunho" else None
        if p[9] == "Em análise":
            enviado = (today - timedelta(days=2)).isoformat()
        cur.execute(
            """INSERT INTO parceiros (razao_social, cnpj, tipo, atividade, cidade, uf, contato_nome,
               email, telefone, status, enviado_em, criado_em) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (*p, enviado, (today - timedelta(days=320 - i * 10)).isoformat()),
        )
        tipos = []
        if "Destinador" in p[2]:
            tipos += DOCS_DESTINADOR
        if "Transportador" in p[2]:
            tipos += [t for t in DOCS_TRANSPORTADOR if t not in tipos]
        for j, t in enumerate(tipos):
            emissao = today - timedelta(days=rnd.randint(200, 600))
            validade = emissao + timedelta(days=rnd.choice([730, 1095, 1460]))
            if validade <= today + timedelta(days=60):
                validade = today + timedelta(days=rnd.randint(120, 700))
            status = {"Homologado": "Aprovado", "Em análise": "Pendente", "Rascunho": "Pendente"}[p[9]]
            # cenários de alerta para o dashboard
            if i == 4 and j == 0:
                validade = today + timedelta(days=18)  # LO da CoproVerde vencendo
            if i == 6 and j == 2:
                validade = today - timedelta(days=9)   # alvará do aterro vencido
            if i == 3 and j == 3:
                validade = today + timedelta(days=27)  # seguro do transportador vencendo
            if p[9] == "Rascunho" and j > 0:
                continue  # parceiro ainda preenchendo o cadastro
            cur.execute(
                """INSERT INTO documentos (parceiro_id, tipo, numero, emissao, validade, arquivo,
                   nome_arquivo, status, enviado_em) VALUES (?,?,?,?,?,?,?,?,?)""",
                (i, t, f"{rnd.randint(1000, 99999)}/{emissao.year}", emissao.isoformat(), validade.isoformat(),
                 "exemplo-documento.pdf", f"{t.split(' (')[0].replace('/', '-')}.pdf", status,
                 None if p[9] == "Rascunho" else enviado),
            )

    # resíduos
    for r in RESIDUOS:
        cur.execute(
            """INSERT INTO residuos (nome, codigo_ibama, classe, estado_fisico, unidade, area_geradora,
               acondicionamento, destinacao) VALUES (?,?,?,?,?,?,?,?)""",
            (r[0], r[1], r[2], r[3], "kg", r[4], r[5], r[6]),
        )

    # geração semanal: 16 semanas encerradas
    this_monday = monday(today)
    semanas = [this_monday - timedelta(weeks=k) for k in range(16, 0, -1)]
    geracao = {}
    for s_i, s in enumerate(semanas):
        trend = 1 + 0.004 * s_i  # leve aumento de produção
        for r_id, r in enumerate(RESIDUOS, start=1):
            q = round(r[7] * trend * rnd.uniform(0.86, 1.14), 0)
            if s_i == 9 and r_id == 6:
                q = round(q * 1.35)  # pico de borra de tinta (troca de cor da linha)
            geracao[(r_id, s)] = q
            cur.execute("INSERT INTO geracoes (residuo_id, semana, quantidade) VALUES (?,?,?)",
                        (r_id, s.isoformat(), q))

    # MTRs: uma por resíduo a cada semana para os principais, quinzenal para os menores
    seq = 0
    for s_i, s in enumerate(semanas):
        for r_id, r in enumerate(RESIDUOS, start=1):
            if r[7] < 1000 and s_i % 2:
                continue
            if r_id == 12 and s_i % 4:
                continue
            if r_id == 10 and s_i < 13:
                dest = 6  # antes da compostagem, orgânico ia para aterro
            else:
                dest = r[9]
            if dest == 8:
                continue  # Lumina ainda não homologada: lâmpadas armazenadas
            transp = 5 if dest == 5 else 3
            seq += 1
            emissao = s + timedelta(days=rnd.randint(4, 6))
            if emissao > today:
                emissao = today
            qtd = geracao[(r_id, s)] * (1 if r[7] >= 1000 else 2)
            age = (today - emissao).days
            if age > 10:
                status, receb = "Recebido", emissao + timedelta(days=rnd.randint(1, 3))
                cdf = f"CDF-{emissao.year}-{rnd.randint(10000, 99999)}"
            elif age > 4:
                status, receb, cdf = ("Recebido", emissao + timedelta(days=2), f"CDF-{emissao.year}-{rnd.randint(10000, 99999)}") if rnd.random() < .4 else ("Em transporte", None, None)
            else:
                status, receb, cdf = "Emitido", None, None
            numero = f"MTR-{emissao.year}-{seq:06d}"
            placa = rnd.choice(["BEE-4F21", "AXT-7C09", "RHA-2D55", "BCK-8E13"])
            motorista = rnd.choice(["João Batista Ferreira", "Clayton Ribeiro", "Andreia Costa", "Luiz Fernando Paz"])
            cur.execute(
                """INSERT INTO mtrs (numero, data_emissao, transportador_id, destinador_id, placa, motorista,
                   status, data_recebimento, cdf_numero) VALUES (?,?,?,?,?,?,?,?,?)""",
                (numero, emissao.isoformat(), transp, dest, placa, motorista, status,
                 receb.isoformat() if receb else None, cdf),
            )
            mtr_id = cur.lastrowid
            cur.execute("INSERT INTO mtr_itens (mtr_id, residuo_id, quantidade, acondicionamento) VALUES (?,?,?,?)",
                        (mtr_id, r_id, qtd, r[5]))

            # lançamentos financeiros vinculados à MTR
            preco = r[8]
            if r_id == 10 and dest == 6:
                preco = -0.22
            valor = round(abs(preco) * qtd, 2)
            if preco > 0:
                cur.execute(
                    """INSERT INTO financeiro (data, tipo, categoria, descricao, valor, residuo_id, parceiro_id, mtr_id, nota_fiscal)
                       VALUES (?,?,?,?,?,?,?,?,?)""",
                    (emissao.isoformat(), "Receita", "Venda de recicláveis", f"Venda – {r[0]}", valor, r_id, dest, mtr_id,
                     f"NF {rnd.randint(10000, 99999)}"),
                )
            else:
                cur.execute(
                    """INSERT INTO financeiro (data, tipo, categoria, descricao, valor, residuo_id, parceiro_id, mtr_id, nota_fiscal)
                       VALUES (?,?,?,?,?,?,?,?,?)""",
                    (emissao.isoformat(), "Custo", "Destinação final", f"Destinação – {r[0]}", valor, r_id, dest, mtr_id,
                     f"NF {rnd.randint(10000, 99999)}"),
                )
            if transp == 3:
                frete = round(380 + qtd * 0.012, 2)
                cur.execute(
                    """INSERT INTO financeiro (data, tipo, categoria, descricao, valor, residuo_id, parceiro_id, mtr_id, nota_fiscal)
                       VALUES (?,?,?,?,?,?,?,?,?)""",
                    (emissao.isoformat(), "Custo", "Transporte", f"Frete – {numero}", frete, r_id, transp, mtr_id,
                     f"CT-e {rnd.randint(1000, 9999)}"),
                )

    # custos fixos mensais
    m = date(semanas[0].year, semanas[0].month, 1)
    while m <= today:
        cur.execute("INSERT INTO financeiro (data, tipo, categoria, descricao, valor, parceiro_id) VALUES (?,?,?,?,?,?)",
                    (m.isoformat(), "Custo", "Locação de caçambas/contêineres", "Locação mensal – 14 caçambas", 9800.00, 3))
        if m + timedelta(days=14) <= today:
            cur.execute("INSERT INTO financeiro (data, tipo, categoria, descricao, valor) VALUES (?,?,?,?,?)",
                    ((m + timedelta(days=14)).isoformat(), "Custo", "Análises laboratoriais", "Laudos de classificação NBR 10004", 2350.00))
        m = date(m.year + (m.month // 12), m.month % 12 + 1, 1)

    conn.commit()


if __name__ == "__main__":
    init_db(force=True)
    print(f"Banco recriado em {DB_PATH}")
