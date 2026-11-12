# CLAUDE.md — BI do Artista

## O que é
Raio-X de carreira para artistas a partir de exports da Chartmetric. Duas entregas:
- **v1 (no ar):** relatório estático em `public/<slug>/index.html` (gerado por `scripts/build.py`).
- **v2 (construído):** o sistema "Camarim" em `app/` (Vite + React + TS). Especificação em `docs/PRD-v2-sistema.md`.

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
python3 scripts/publico.py fresno      # só o público por praça (não precisa de pandas)
cd app && npm run dev                  # desenvolvimento
cd app && npm run build                # build de produção (app/dist)
```

## Deploy
Commit na `main` → Vercel publica. O `vercel.json` roda o build do `app/` e publica `app/dist`; o relatório v1 sai de `app/public/<slug>/relatorio/` (copiado por `sync_app.py`) e continua em `/fresno/relatorio`.

## Novo artista
`scripts/ingest.py <pasta-com-csvs> <slug>` → criar `artists/<slug>/config.json` (copiar o da Fresno) → `scripts/sync_app.py <slug>`. Revisar em `config.json`: tema, carta, casos de show com data, aniversários, notícias, avisos de qualidade, contato.

## Mapa do app (`app/src`)
- `data/` contextos (artista, mesa de cruzamento, UI) · `lib/match.ts` casamento de texto livre (teste: `npm run test:match`)
- `components/shell/` rail, barra de pergunta, mesa, cabo de luz, gaveta · `components/answer/` raciocínio e resposta
- `components/blocks/` os 14 tipos de bloco em SVG próprio (despacho em `Bloco.tsx`) · `components/sims/` simuladores
- Decisão de produto: **público provável por praça** (`scripts/publico.py` + `app/src/lib/publico.ts`). A conta antiga
  ("3% a 5% dos ouvintes mensais") errava 3 a 5 vezes para baixo. A nova é uma **regressão ponderada em escala log**
  sobre a agenda própria da banda: `ln(público) = b0 + b1·ln(base de fãs) + b2·ln(demanda_rel)`. Saem dela o P50, a
  faixa P10–P90 (erro do ajuste + alavancagem da praça), a **chance de esgotar** qualquer casa (lognormal da predição)
  e o veredito de casa maior / segunda data / subir preço. Regras que importam: show esgotado é **piso**, não teto;
  casa de configuração variável (arena) fica fora do ajuste porque capacidade não é lotação; por cidade e ano só a
  maior evidência entra; com menos de 10 shows medidos o expoente da afinidade fica fixo no prior, para não
  superajustar. Os shows ficam em `artists/<slug>/config.json → calibracao.ancoras` (local, data, capacidade,
  ocupação, fonte, `escalavel`, `fora_do_ajuste`) — **anotar a ocupação depois de cada show refaz a regressão**.
- Decisão de produto: o simulador "Janela de lançamento" mostra o **nível** de ouvintes 1 mês depois (índice sazonal do mês seguinte + mediana dos lançamentos) e o **salto** do PRD §5.5 como informação extra. Só a fórmula do salto apontaria março como melhor mês, contrariando o veredito de "quando lançar".
