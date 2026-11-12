# BI do Artista — Raio-X de carreira

Painel público, sem login, que transforma exports da Chartmetric em decisões de carreira: **onde tocar, quanto cobrar, quando lançar, o que postar e com quem se juntar**.

Primeiro artista: **Fresno** → `/fresno`

- **v1 (no ar):** relatório estático — `public/fresno/index.html`
- **v2 (no ar):** sistema "Camarim" com perguntas, raciocínio visível, mesa de cruzamento e simuladores — `app/` (Vite + React + TypeScript). Ver [PRD v2](docs/PRD-v2-sistema.md) e `CLAUDE.md`
- O relatório v1 continua em `/fresno/relatorio`

## Como funciona

```
data/raw/<slug>/*.csv        exports da Chartmetric com nomes canônicos
artists/<slug>/config.json   tema (cores/fontes), carta, contexto, casos de show, avisos, contato
scripts/ingest.py            exports originais -> nomes canônicos
scripts/analytics.py         motor: KPIs, índices, cruzamentos, previsão, recomendações
scripts/build.py             gera public/<slug>/index.html (autocontido) + data.json
scripts/answers.py           gera artists/<slug>/respostas.json (perguntas prontas do v2)
scripts/sync_app.py          roda tudo e copia os dados para app/public/ (v2)
template/dashboard.html      template único (HTML/CSS/JS + SVG à mão, zero dependência)
public/                      o que a Vercel publica
docs/                        brainstorm, PRD, design system, perfil dos dados, pesquisa
```

Requisitos: Python 3.10+ com `pandas` e `numpy`.

## Novo artista (≈30 min)

```bash
# 1. exportar os CSVs da Chartmetric para uma pasta e rodar:
python3 scripts/ingest.py ~/Downloads/chartmetric-<artista> <slug>

# 2. copiar e ajustar o config (cores do disco atual, carta, contexto, contato)
cp -r artists/fresno artists/<slug>

# 3. gerar
python3 scripts/build.py <slug>

# 4. commit + push -> a Vercel publica em /<slug>
```

O que precisa revisar no `config.json`: `tema`, `carta`, `casos_show_cidade` (shows com data para medir o efeito na cidade), `contexto` (aniversários, notícias), `qualidade_dados`, `contato`.

## Deploy na Vercel

Importar o repositório na Vercel → Framework: *Other* (a Vercel lê o `vercel.json`). Ele roda `cd app && npm ci && npm run build`, publica `app/dist`, ativa URLs limpas, reescreve as rotas do app para `index.html` e marca tudo como `noindex`. Cada commit na `main` publica sozinho.

Desenvolvimento local do app:

```bash
cd app
npm ci
npm run dev          # http://localhost:5173/fresno
npm run build        # tsc + vite build -> app/dist
npm run test:match   # testa o casamento de texto livre (PRD §8)
```

## Documentos

- [Brainstorm](docs/brainstorm.md)
- [PRD v1](docs/PRD.md)
- [PRD v2 — sistema Camarim](docs/PRD-v2-sistema.md)
- [Design system](docs/design-system.md)
- [Perfil e qualidade dos dados](docs/dados-e-qualidade.md)
- [Pesquisa pública — Fresno](docs/pesquisa-fresno.md)
