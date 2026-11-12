# CLAUDE.md — BI do Artista

## O que é
Raio-X de carreira para artistas a partir de exports da Chartmetric. Duas entregas:
- **v1 (no ar):** relatório estático em `public/<slug>/index.html` (gerado por `scripts/build.py`).
- **v2 (a construir):** o sistema "Camarim" em `app/` — leia `docs/PRD-v2-sistema.md` inteiro antes de começar.

## Regras
1. **Nenhum número digitado na interface.** Tudo vem de `app/public/data/<slug>/data.json` e `respostas.json`. Se faltar um número, adicione o cálculo em `scripts/analytics.py` ou `scripts/answers.py`, rode `python3 scripts/sync_app.py <slug>` e use o campo novo.
2. Textos em português do Brasil, frases curtas, linguagem de quem não é de dados ("para cada 100 ouvintes, 128 seguem a banda").
3. Design: siga `docs/PRD-v2-sistema.md §6` (tokens, tipografia, componentes). Antes de desenhar, instale e siga as skills:
   ```bash
   npx claude-code-templates@latest --skill creative-design/frontend-design
   npx claude-code-templates@latest --skill creative-design/ui-ux-pro-max
   ```
4. Gráficos em SVG próprio (porte dos helpers de `template/dashboard.html`), sem biblioteca de gráfico. Cores de dado só as validadas (`#E5533F`, `#3A8FD6`, `#2E9E8F`, `#4A4250`).
5. Acessibilidade é critério de aceite: contraste ≥ 4,5:1, foco visível, alvos ≥ 44 px, nada só em hover, `prefers-reduced-motion`.
6. Tire screenshot em 1360 px e 390 px de cada tela antes de dar como pronto.

## Comandos
```bash
python3 scripts/sync_app.py fresno     # recalcula tudo e copia dados para app/public
cd app && npm run dev                  # desenvolvimento
cd app && npm run build                # build de produção (app/dist)
```

## Deploy
Commit na `main` → Vercel publica. Hoje o `vercel.json` publica `public/` (v1). Na fase 0 do PRD v2, trocar para o build do `app/` (config pronta em `docs/PRD-v2-sistema.md §10`) e confirmar que `/fresno/relatorio` continua acessível.

## Novo artista
`scripts/ingest.py <pasta-com-csvs> <slug>` → criar `artists/<slug>/config.json` (copiar o da Fresno) → `scripts/sync_app.py <slug>`. Revisar em `config.json`: tema, carta, casos de show com data, aniversários, notícias, avisos de qualidade, contato.
