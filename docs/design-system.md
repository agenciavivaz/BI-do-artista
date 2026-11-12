# Design system — BI do Artista

Público: empresários, bookers e artistas (querem **dinheiro e exposição**) e fãs vindos do TikTok (querem **curiosidade**). Nenhum deles é de dados. O sistema existe para que cada tela responda "e daí?" antes de mostrar um gráfico.

## 1. Princípios

1. **Decisão > dado.** Toda seção abre com um *veredito* (frase de ação). O gráfico é a prova, não a atração.
2. **Um cartão, uma ideia.** Número grande, frase curta, contexto em cinza.
3. **Fala de gente.** "Para cada 100 ouvintes, 128 seguem a banda." Nunca "fan conversion rate".
4. **Mostrar a conta.** Todo índice tem "como calculamos". Transparência é o que separa de horóscopo.
5. **A cara do artista.** Só o tema muda entre artistas; estrutura, componentes e regras não.
6. **Escuro, editorial, show.** Fundo escuro de casa de show, tipografia de cartaz, um acento quente.

## 2. Tokens

Todos os tokens são variáveis CSS geradas a partir de `artists/<slug>/config.json → tema`. Nenhuma cor hardcoded no template.

### Cor — interface
| Token | Fresno | Uso |
|---|---|---|
| `--bg` | `#0E0C0F` | fundo da página |
| `--surface` | `#17141A` | cartões, superfície dos gráficos |
| `--surface-2` | `#211C24` | cartão em destaque, hover |
| `--line` | `#2E2832` | bordas, grid, eixos (hairline) |
| `--ink` | `#F4EEE6` | texto principal |
| `--ink-2` | `#A99FA6` | texto de apoio, rótulos |
| `--accent` | `#FF4D3D` | marca do artista: títulos de seção, CTA, número-herói |
| `--accent-2` | `#F6C177` | realce secundário (tags, sublinhados) |
| `--pos-text` / `--neg-text` | `#5ED3A0` / `#FF7A6B` | texto de variação (+/−), sempre com sinal |

### Cor — dados (validadas com `validate_palette.js`, modo escuro, superfície `#17141A`)
| Token | Hex | Papel |
|---|---|---|
| `--data-1` | `#E5533F` | série única / série principal |
| `--data-2` | `#3A8FD6` | segunda série (ex.: masculino × feminino) — ΔE CVD 22,1 com `data-1`: PASS |
| `--data-pos` | `#2E9E8F` | divergente: acima da média |
| `--data-neg` | `#E5533F` | divergente: abaixo da média — ΔE CVD 12,0 com `data-pos`: PASS |
| `--data-muted` | `#4A4250` | contexto / "o resto" |

Regras: série única = uma cor só; nunca rampa de cor em categoria nominal; cor segue a entidade (masculino é sempre `data-2`); texto nunca usa a cor da série.

### Tipografia
| Token | Valor | Uso |
|---|---|---|
| `--font-display` | Archivo Black (fallback: Impact, system-ui) | nome do artista, títulos de seção |
| `--font-text` | Inter (fallback: system-ui) | todo o resto, inclusive números-herói |
| Escala | 12 · 14 · 16 · 20 · 28 · 40 · 64 · clamp(56px, 10vw, 140px) | rótulo → corpo → título → herói |
| Números | proporcionais no herói; `tabular-nums` em tabelas e eixos | |

### Espaço, forma, movimento
| Token | Valor |
|---|---|
| Espaço | 4 · 8 · 12 · 16 · 24 · 32 · 48 · 80 |
| `--radius` | 14px (cartão), 999px (tag) |
| Borda | 1px `--line` |
| Movimento | 160ms ease-out (hover); barras entram com 400ms ao aparecer na tela; respeita `prefers-reduced-motion` |

## 3. Componentes

| Componente | O que é | Regras |
|---|---|---|
| **Hero / carta** | Nome do artista gigante + subtítulo + 3 KPIs | KPI com rótulo humano, valor, variação com sinal |
| **Índice (score dial)** | Arco 0–100 + nome + frase + "como calculamos" (details) | 0–39 atenção · 40–59 estável · 60–79 forte · 80–100 excepcional; legenda textual, nunca só cor |
| **Cartão de decisão** | Área (tag) · título-ação · "por quê" com números · próximo passo · impacto | Máx. 2 frases no "por quê"; números em negrito |
| **Veredito de seção** | Frase grande no topo de cada seção | Começa com verbo ou com o achado |
| **Barra horizontal ranqueada** | Ranking (cidades, faixas, marcas) | Uma cor; rótulo à esquerda, valor à direita, barra com ponta arredondada de 4px |
| **Linha temporal** | Série no tempo (ouvintes, previsão) | Linha 2px, faixa de previsão com 15% de opacidade, crosshair + tooltip |
| **Barra divergente** | Sazonalidade, efeito de lançamento | `data-pos` acima / `data-neg` abaixo, linha zero visível |
| **Pirâmide demográfica** | Idade × gênero por plataforma | `data-2` masculino, `data-1` feminino, legenda sempre presente |
| **Mapa de praças** | Silhueta do Brasil + bolhas | Área = ouvintes; cor = faixa de cachê (com legenda textual); hover mostra o cartão da cidade |
| **Tabela** | Detalhe (cidades) | Ordenável, `tabular-nums`, linhas com hairline |
| **Aviso de dado** | Bloco de qualidade/metodologia | Ícone + texto; nunca esconder limitação |
| **CTA** | Fecho com contato | Um botão primário (`accent`), um secundário |

### Estados
Hover em barras/pontos: barra clareia 10% + tooltip. Foco por teclado igual ao hover. Sem estados de loading (dados embutidos).

## 4. Padrões de página

```
[Nav fixa: seções]                                         [CTA]
HERO: NOME · subtítulo · 3 KPIs
ÍNDICES: 4 dials
DECISÕES: grade 2 colunas de cartões de decisão
SEÇÃO n: veredito → 1–2 gráficos → detalhe opcional
METODOLOGIA + QUALIDADE → CTA
```

## 5. Acessibilidade
- Contraste de texto ≥ 4,5:1 sobre `--surface` (ink e ink-2 passam).
- Identidade nunca só por cor: legendas e rótulos diretos.
- Toda informação do tooltip também aparece em texto ou tabela.
- `prefers-reduced-motion` desliga animações.

## 6. Como trocar o tema para outro artista
Editar só `artists/<slug>/config.json → tema` (fundo, superfícies, texto, destaque, fontes). As cores de dado ficam fixas porque já foram validadas para daltonismo; se o fundo mudar muito (tema claro), rodar o validador de novo:

```bash
node <dataviz>/scripts/validate_palette.js "#E5533F,#3A8FD6" --mode dark --surface "<superfície>"
```
