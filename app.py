"""Ciclora EHS – API REST + servidor do front-end.

Execução:  python app.py   →  http://localhost:5000
"""
import os
import sqlite3
import uuid
from datetime import date

from flask import Flask, abort, jsonify, request, send_from_directory
from werkzeug.utils import secure_filename

import database as db

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
ALLOWED_EXT = {"pdf", "png", "jpg", "jpeg"}

# colunas editáveis por tabela (whitelist: evita SQL injection por nome de coluna)
TABLES = {
    "parceiros": ["razao_social", "cnpj", "tipo", "atividade", "cidade", "uf", "contato_nome", "email",
                  "telefone", "status", "enviado_em", "observacao"],
    "documentos": ["parceiro_id", "tipo", "numero", "emissao", "validade", "status", "enviado_em"],
    "residuos": ["nome", "codigo_ibama", "classe", "estado_fisico", "unidade", "area_geradora",
                 "acondicionamento", "destinacao"],
    "geracoes": ["residuo_id", "semana", "quantidade", "observacao"],
    "mtrs": ["data_emissao", "transportador_id", "destinador_id", "placa", "motorista", "status",
             "data_recebimento", "cdf_numero", "observacao"],
    "mtr_itens": ["mtr_id", "residuo_id", "quantidade", "acondicionamento"],
    "financeiro": ["data", "tipo", "categoria", "descricao", "valor", "residuo_id", "parceiro_id",
                   "mtr_id", "nota_fiscal"],
}
REQUIRED = {
    "parceiros": ["razao_social", "cnpj", "tipo"],
    "residuos": ["nome", "classe"],
    "financeiro": ["data", "tipo", "categoria", "valor"],
    "documentos": ["parceiro_id", "tipo"],
}

app = Flask(__name__, static_folder="static", static_url_path="")


def rows(cur):
    return [dict(r) for r in cur.fetchall()]


def check_table(table):
    if table not in TABLES:
        abort(404, description="Recurso inexistente")


@app.errorhandler(400)
@app.errorhandler(404)
def handle_error(e):
    return jsonify(erro=getattr(e, "description", str(e))), e.code


@app.errorhandler(sqlite3.IntegrityError)
def handle_integrity(e):
    return jsonify(erro="Registro vinculado a outros dados (MTRs, lançamentos ou documentos) — não pode ser excluído."), 409


# ------------------------------------------------------------------ front-end
@app.get("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.get("/uploads/<path:nome>")
def uploads(nome):
    return send_from_directory(UPLOAD_DIR, nome)


# ------------------------------------------------------------------ CRUD genérico
@app.get("/api/<table>")
def listar(table):
    check_table(table)
    with db.connect() as conn:
        return jsonify(rows(conn.execute(f"SELECT * FROM {table} ORDER BY id")))


@app.get("/api/<table>/<int:item_id>")
def obter(table, item_id):
    check_table(table)
    with db.connect() as conn:
        r = conn.execute(f"SELECT * FROM {table} WHERE id = ?", (item_id,)).fetchone()
    if not r:
        abort(404, description="Registro não encontrado")
    return jsonify(dict(r))


@app.post("/api/<table>")
def criar(table):
    check_table(table)
    if table == "mtrs":
        return criar_mtr()
    data = request.get_json(force=True) or {}
    faltando = [c for c in REQUIRED.get(table, []) if data.get(c) in (None, "")]
    if faltando:
        abort(400, description=f"Campos obrigatórios: {', '.join(faltando)}")
    cols = [c for c in TABLES[table] if c in data]
    with db.connect() as conn:
        cur = conn.execute(
            f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))})",
            [data[c] for c in cols],
        )
        novo = dict(conn.execute(f"SELECT * FROM {table} WHERE id = ?", (cur.lastrowid,)).fetchone())
    return jsonify(novo), 201


@app.put("/api/<table>/<int:item_id>")
def atualizar(table, item_id):
    check_table(table)
    data = request.get_json(force=True) or {}
    cols = [c for c in TABLES[table] if c in data]
    if not cols:
        abort(400, description="Nenhum campo para atualizar")
    with db.connect() as conn:
        conn.execute(
            f"UPDATE {table} SET {', '.join(c + ' = ?' for c in cols)} WHERE id = ?",
            [data[c] for c in cols] + [item_id],
        )
        r = conn.execute(f"SELECT * FROM {table} WHERE id = ?", (item_id,)).fetchone()
    if not r:
        abort(404, description="Registro não encontrado")
    return jsonify(dict(r))


@app.delete("/api/<table>/<int:item_id>")
def excluir(table, item_id):
    check_table(table)
    with db.connect() as conn:
        conn.execute(f"DELETE FROM {table} WHERE id = ?", (item_id,))
    return jsonify(ok=True)


# ------------------------------------------------------------------ regras específicas
def criar_mtr():
    """Emite uma MTR com numeração sequencial e seus itens (resíduos)."""
    data = request.get_json(force=True) or {}
    itens = [i for i in data.get("itens", []) if i.get("residuo_id") and float(i.get("quantidade") or 0) > 0]
    if not data.get("transportador_id") or not data.get("destinador_id"):
        abort(400, description="Informe transportador e destinador")
    if not itens:
        abort(400, description="Inclua ao menos um resíduo com quantidade")
    emissao = data.get("data_emissao") or date.today().isoformat()
    with db.connect() as conn:
        ano = emissao[:4]
        ultimo = conn.execute("SELECT MAX(CAST(substr(numero, 10) AS INTEGER)) FROM mtrs").fetchone()[0] or 0
        numero = f"MTR-{ano}-{ultimo + 1:06d}"
        cur = conn.execute(
            """INSERT INTO mtrs (numero, data_emissao, transportador_id, destinador_id, placa, motorista,
               status, observacao) VALUES (?,?,?,?,?,?, 'Emitido', ?)""",
            (numero, emissao, data["transportador_id"], data["destinador_id"], data.get("placa"),
             data.get("motorista"), data.get("observacao")),
        )
        mtr_id = cur.lastrowid
        for i in itens:
            conn.execute("INSERT INTO mtr_itens (mtr_id, residuo_id, quantidade, acondicionamento) VALUES (?,?,?,?)",
                         (mtr_id, i["residuo_id"], float(i["quantidade"]), i.get("acondicionamento")))
        novo = dict(conn.execute("SELECT * FROM mtrs WHERE id = ?", (mtr_id,)).fetchone())
    return jsonify(novo), 201


@app.post("/api/geracoes/lote")
def lancar_geracao_semana():
    """Lança (ou atualiza) as quantidades geradas de vários resíduos numa semana."""
    data = request.get_json(force=True) or {}
    semana = data.get("semana")
    if not semana:
        abort(400, description="Informe a semana")
    n = 0
    with db.connect() as conn:
        for i in data.get("itens", []):
            if i.get("quantidade") in (None, ""):
                continue
            conn.execute(
                """INSERT INTO geracoes (residuo_id, semana, quantidade) VALUES (?,?,?)
                   ON CONFLICT(residuo_id, semana) DO UPDATE SET quantidade = excluded.quantidade""",
                (i["residuo_id"], semana, float(i["quantidade"])),
            )
            n += 1
    return jsonify(ok=True, lancados=n)


@app.post("/api/documentos/upload")
def upload_documento():
    """Parceiro envia um documento (PDF/imagem) com tipo, número e validade."""
    f = request.files.get("arquivo")
    form = request.form
    if not form.get("parceiro_id") or not form.get("tipo"):
        abort(400, description="Informe parceiro e tipo do documento")
    arquivo, nome_original = None, None
    if f and f.filename:
        ext = f.filename.rsplit(".", 1)[-1].lower()
        if ext not in ALLOWED_EXT:
            abort(400, description="Formato não permitido (use PDF, PNG ou JPG)")
        nome_original = secure_filename(f.filename) or f"documento.{ext}"
        arquivo = f"{uuid.uuid4().hex[:12]}_{nome_original}"
        f.save(os.path.join(UPLOAD_DIR, arquivo))
    with db.connect() as conn:
        cur = conn.execute(
            """INSERT INTO documentos (parceiro_id, tipo, numero, emissao, validade, arquivo, nome_arquivo, status)
               VALUES (?,?,?,?,?,?,?, 'Pendente')""",
            (form["parceiro_id"], form["tipo"], form.get("numero"), form.get("emissao"), form.get("validade"),
             arquivo, nome_original),
        )
        novo = dict(conn.execute("SELECT * FROM documentos WHERE id = ?", (cur.lastrowid,)).fetchone())
    return jsonify(novo), 201


@app.post("/api/admin/reset")
def reset():
    """Recria o banco com os dados de demonstração."""
    db.init_db(force=True)
    return jsonify(ok=True)


def ensure_sample_pdf():
    path = os.path.join(UPLOAD_DIR, "exemplo-documento.pdf")
    if os.path.exists(path):
        return
    content = b"BT /F1 18 Tf 72 720 Td (Documento de exemplo - Ciclora EHS) Tj ET"
    objs = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length %d >>\nstream\n" % len(content) + content + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out, offsets = b"%PDF-1.4\n", []
    for i, o in enumerate(objs, 1):
        offsets.append(len(out))
        out += b"%d 0 obj\n" % i + o + b"\nendobj\n"
    xref = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1)
    out += b"".join(b"%010d 00000 n \n" % o for o in offsets)
    out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objs) + 1, xref)
    with open(path, "wb") as fh:
        fh.write(out)


os.makedirs(UPLOAD_DIR, exist_ok=True)
ensure_sample_pdf()
db.init_db()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"\n  Ciclora EHS rodando em http://localhost:{port}\n")
    app.run(host="0.0.0.0", port=port, debug=False)
