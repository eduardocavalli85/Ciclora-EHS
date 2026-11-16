"""Gera docs/prototipo/ciclora-prototipo.html: protótipo navegável em um único arquivo,
com os dados de demonstração embutidos (não precisa de servidor)."""
import json, os, sqlite3, tempfile
from datetime import date
import database as db

BASE = os.path.dirname(os.path.abspath(__file__))
tmp = os.path.join(tempfile.mkdtemp(), "seed.db")
db.DB_PATH = tmp
db.init_db(force=True)
conn = sqlite3.connect(tmp); conn.row_factory = sqlite3.Row
tables = {t: [dict(r) for r in conn.execute(f"SELECT * FROM {t} ORDER BY id")]
          for t in ["parceiros", "documentos", "residuos", "geracoes", "mtrs", "mtr_itens", "financeiro"]}
seed = {"today": date.today().isoformat(), "tables": tables}

read = lambda p: open(os.path.join(BASE, "static", p), encoding="utf-8").read()
scripts = ["js/ui.js", "js/api.js", "js/views/dashboard.js", "js/views/parceiros.js", "js/views/portal.js",
           "js/views/residuos.js", "js/views/mtr.js", "js/views/financeiro.js", "js/main.js"]
html = f"""<title>Ciclora EHS Protótipo</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>{read("css/styles.css")}</style>
<script>window.CICLORA_SEED = {json.dumps(seed, ensure_ascii=False)};</script>
{"".join(f"<script>{read(s)}</script>" for s in scripts)}
<script>if (document.readyState !== 'loading') document.dispatchEvent(new Event('DOMContentLoaded'));</script>"""
out = os.path.join(BASE, "docs", "prototipo", "ciclora-prototipo.html")
open(out, "w", encoding="utf-8").write(html)
print(out, len(html) // 1024, "KB")

# versão completa para GitHub Pages (pasta /docs → https://<usuario>.github.io/ciclora-ehs/)
page = ('<!doctype html>\n<html lang="pt-BR"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        '<link rel="icon" href="favicon.svg" type="image/svg+xml">\n' + html + '\n</head><body></body></html>')
page = page.replace("<script>if (document.readyState", "<script>/*ready*/if (document.readyState")
idx = os.path.join(BASE, "docs", "index.html")
open(idx, "w", encoding="utf-8").write(page)
print(idx)
