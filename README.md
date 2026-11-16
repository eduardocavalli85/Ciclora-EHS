<p align="center"><img src="brand/ciclora-logo.png" alt="Ciclora" width="360"></p>

# Ciclora EHS — Gestão de Resíduos Industriais B2B

MVP desenvolvido pela **Ciclora Tech** para a disciplina de **Design Profissional** (Universidade Positivo — Prof. Me. Sedenilso Antonio Machado), segmento **14 – Gestor de Descarte de Resíduos Industriais B2B**.

A plataforma centraliza a gestão de resíduos de uma indústria de grande porte. A cliente-piloto (fictícia) é a **Kairós Motors do Brasil S.A.**, montadora de veículos com planta em São José dos Pinhais – PR.

| Módulo | O que faz |
|---|---|
| **Dashboard** | Indicadores de gestão: toneladas geradas, taxa de valorização (desvio de aterro), % de resíduos Classe I, saldo financeiro, custo por tonelada, MTRs sem CDF, documentos vencidos e alertas de conformidade. |
| **Parceiros** | Cadastro e homologação de transportadores e destinadores. O gestor aprova ou reprova cada documento e homologa o parceiro. |
| **Portal do Parceiro** | O próprio fornecedor cadastra a empresa, anexa os documentos (LO, CTF/IBAMA, alvará, ANTT, seguro…) com validade e **envia para análise** da empresa cliente. |
| **Resíduos** | Inventário (código da Lista Brasileira de Resíduos, classe ABNT NBR 10004, acondicionamento, destinação) e **lançamento da geração semanal** em kg. |
| **MTR** | Emissão do **Manifesto de Transporte de Resíduos** com numeração automática, só com parceiros homologados, alerta de documento vencido, documento para impressão/PDF e baixa com nº do CDF. |
| **Financeiro** | Lançamento de **custos** (transporte, destinação, locação, análises) e **receitas** (venda de recicláveis), com vínculo a resíduo, parceiro e MTR. |

---

## Como executar localmente

**Pré-requisito:** Python 3.10 ou superior ([python.org](https://www.python.org/downloads/)). No Windows, marque “Add Python to PATH” na instalação.

```bash
# 1. clonar o repositório
git clone https://github.com/<organizacao>/ciclora-ehs.git
cd ciclora-ehs

# 2. (opcional) criar ambiente virtual
python -m venv .venv
# Windows:  .venv\Scripts\activate
# Linux/Mac: source .venv/bin/activate

# 3. instalar dependências
pip install -r requirements.txt

# 4. executar
python app.py
```

Abra **http://localhost:5000** no navegador.

Na primeira execução é criado o banco `ciclora.db` (SQLite) com dados de demonstração: 8 parceiros, 12 resíduos, 16 semanas de geração, cerca de 170 MTRs e os lançamentos financeiros.

- **Recriar os dados de demonstração:** `python database.py` (apaga e recria o banco).
- **Mudar a porta:** `PORT=8080 python app.py` (Linux/Mac) ou `set PORT=8080 && python app.py` (Windows).

### Roteiro de demonstração (apresentação de 17/11)

1. **Dashboard** → mostrar KPIs, gráfico semanal por classe e alertas (alvará vencido, LO a vencer).
2. Clicar em **Portal do Parceiro** → escolher *Lumina Descontaminação de Lâmpadas* (rascunho) → anexar os documentos obrigatórios → **Enviar para análise**.
3. Voltar para **Gestor EHS** → **Parceiros** → *Analisar* Lumina → aprovar documentos → **Homologar**.
4. **MTR** → *Emitir MTR* → escolher transportador e destinador (o sistema avisa se houver documento vencido) → incluir resíduo → **Emitir** → *Imprimir / salvar PDF*.
5. **Atualizar** a MTR para *Recebido* informando o nº do CDF.
6. **Resíduos** → *Geração semanal* → lançar a semana anterior.
7. **Financeiro** → *Novo lançamento* vinculado à MTR → ver saldo e custo por tonelada.

---

## Arquitetura

```
┌──────────────────────────────┐      HTTP/JSON      ┌───────────────────────────┐      SQL      ┌──────────────┐
│  Front-end (SPA)             │  ─────────────────▶ │  Back-end Flask (app.py)  │ ────────────▶ │  SQLite      │
│  HTML + CSS + JavaScript     │  ◀───────────────── │  API REST + uploads       │ ◀──────────── │  ciclora.db  │
│  static/                     │                     │  database.py (schema/seed)│               └──────────────┘
└──────────────────────────────┘                     └───────────────────────────┘
                                                              │ arquivos enviados
                                                              ▼
                                                          uploads/
```

- **Front-end:** SPA em JavaScript puro (sem framework), rotas por hash (`#/dashboard`, `#/mtr`…). Os gráficos são SVG gerados em código, sem bibliotecas externas.
- **Back-end:** Python 3 + Flask. CRUD genérico com *whitelist* de colunas por tabela (evita SQL injection) e regras específicas: emissão de MTR com numeração sequencial, lançamento semanal em lote (*upsert*) e upload de documentos (PDF/PNG/JPG).
- **Banco de dados:** SQLite (arquivo local, sem instalação), com chaves estrangeiras ativas.

### Estrutura de pastas

```
ciclora-ehs/
├── app.py                 # servidor Flask + API REST
├── database.py            # esquema do banco e dados de demonstração
├── requirements.txt
├── static/
│   ├── index.html
│   ├── css/styles.css     # guia de estilo aplicado (tokens de cor, componentes)
│   └── js/
│       ├── api.js         # camada de dados (API real ou dados em memória no protótipo)
│       ├── ui.js          # formatação, ícones, modal, gráficos SVG
│       ├── main.js        # roteador e layout
│       └── views/         # dashboard, parceiros, portal, residuos, mtr, financeiro
├── uploads/               # documentos enviados pelos parceiros
├── brand/                 # logotipo (SVG/PNG)
└── docs/                  # wireframes e capturas do protótipo
```

### Modelo de dados

| Tabela | Campos principais |
|---|---|
| `parceiros` | razão social, CNPJ, tipo (transportador/destinador), atividade, contato, **status** (Rascunho → Em análise → Homologado/Reprovado) |
| `documentos` | parceiro, tipo, número, emissão, **validade**, arquivo, status (Pendente/Aprovado/Reprovado) |
| `residuos` | nome, código IBAMA, **classe NBR 10004**, estado físico, área geradora, acondicionamento, destinação |
| `geracoes` | resíduo, **semana** (segunda-feira), quantidade (kg) — único por resíduo+semana |
| `mtrs` / `mtr_itens` | número, emissão, transportador, destinador, placa, motorista, status, CDF / resíduos e quantidades |
| `financeiro` | data, tipo (Custo/Receita), categoria, valor, resíduo, parceiro, MTR, nota fiscal |

### Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/<tabela>` | lista registros (`parceiros`, `documentos`, `residuos`, `geracoes`, `mtrs`, `mtr_itens`, `financeiro`) |
| GET/PUT/DELETE | `/api/<tabela>/<id>` | consulta, atualiza, exclui |
| POST | `/api/<tabela>` | cria registro |
| POST | `/api/mtrs` | emite MTR (`{transportador_id, destinador_id, placa, motorista, itens:[{residuo_id, quantidade}]}`) |
| POST | `/api/geracoes/lote` | lança a geração da semana (`{semana, itens:[{residuo_id, quantidade}]}`) |
| POST | `/api/documentos/upload` | upload *multipart* de documento do parceiro |
| POST | `/api/admin/reset` | recria os dados de demonstração |

---

## Roadmap (pós-MVP)

- Autenticação com perfis (gestor EHS, parceiro, financeiro) e convite de parceiros por e-mail.
- Integração com o **SINIR / MTR nacional** (Portaria MMA nº 280/2020) para emissão oficial e importação de CDF.
- Notificação automática por e-mail de documentos a vencer (30/15/7 dias).
- Indicador de intensidade: **kg de resíduo por veículo produzido**.
- Relatórios prontos para o Inventário Nacional de Resíduos / RAPP IBAMA e para relatórios ESG (GRI 306).

## Equipe — Ciclora Tech

| Integrante | Papel |
|---|---|
| Eduardo Cavalli | CEO, Product Owner & Designer UI/UX — pesquisa com usuários, requisitos, identidade visual, wireframes, protótipo e pitch |
| Gabriel Rezende | CTO & Desenvolvedor Full-stack — arquitetura, back-end, banco de dados, interface, testes e GitHub |

> Projeto acadêmico. A Kairós Motors do Brasil S.A. e os parceiros cadastrados são fictícios.
