# PRD v2 — "Camarim": o sistema que pensa a carreira (demo Fresno)

| | |
|---|---|
| **Status** | Pronto para construir no Claude Code |
| **Base** | PRD v1 (`docs/PRD.md`) — lógica, cálculos e índices continuam valendo |
| **O que muda** | Sai o relatório de rolar; entra um sistema com perguntas, raciocínio visível e simuladores |
| **Dados** | `scripts/analytics.py` → `data.json`; `scripts/answers.py` → `respostas.json` (18 perguntas prontas) |
| **Entrega** | App web estático em `/fresno`, deploy automático na Vercel a cada commit |
| **Relatório v1** | Continua no ar em `/fresno/relatorio` (anexo para enviar por e-mail) |

---

## 1. Por que mudar

O v1 prova a lógica, mas parece um relatório: a pessoa rola, lê e vai embora. Empresário e artista não se veem "usando" nada. O v2 tem que parecer **um produto que eles já poderiam ter**: abre, pergunta, vê o sistema cruzando os dados e recebe uma resposta com ação. A demo responde 18 perguntas prontas com animação de raciocínio; a versão paga troca as respostas prontas por LLM + API, **sem mudar a interface**.

Meta de experiência: em 30 segundos a pessoa faz a primeira pergunta; em 2 minutos fez três e abriu um simulador.

## 2. Conceito: Camarim

> O camarim é onde a banda decide o show antes de subir no palco. O sistema é o camarim da carreira.

Nome de trabalho do produto: **Camarim** (troca fácil; está numa constante). O artista é o conteúdo; o sistema é a marca. Por isso a identidade visual do sistema é fixa e o artista aparece como "capa" (nome, cor do disco atual, foto opcional).

**O elemento memorável — a mesa de cruzamento.** À direita da tela fica uma mesa de som com um canal por fonte de dado (18 fontes: Ouvintes, Cidades, IBGE, Shows, Lançamentos, Playlists, TikTok/Reels, Idade e gênero, Comentários, Marcas, Pares, Imprensa…), em duas fileiras de 9. Quando o sistema "pensa", os canais usados naquela etapa sobem o medidor e acendem; um cabo de luz liga os canais acesos à etapa do raciocínio. É a metáfora que um músico entende na hora e que mostra, visualmente, o diferencial do produto: **cruzar fontes**. Todo o resto da interface é quieto e disciplinado para essa mesa brilhar.

## 3. Para quem (resumo do v1)

- **Quem recebe o link:** empresário/escritório/booker de artista de 200 mil a 3 mi de ouvintes, sem analista de dados. Quer cachê, praça, patrocínio.
- **Para quem ele encaminha:** o artista. Quer fã, lançamento, conteúdo.
- **Quem chega pelo TikTok:** fã curioso. Quer "curiosidades" da banda (as mesmas perguntas, em tom leve).

## 4. Arquitetura de informação

```
/fresno                      Início (painel)
/fresno/p/:perguntaId        Pergunta → raciocínio → resposta
/fresno/perguntas            Todas as perguntas, por tema
/fresno/simular/:sim         Simuladores (ingressos | cachê | janela)
/fresno/mapa                 Mapa de praças em tela cheia
/fresno/dados                Explorar dados (módulos do v1 em abas)
/fresno/relatorio            Relatório v1 estático (já existe)
```

Navegação principal (rail à esquerda no desktop, barra inferior no celular): **Início · Perguntar · Simular · Mapa · Dados**. A barra de pergunta fica sempre visível no topo (atalho `/` ou `Ctrl+K`).

## 5. Telas

### 5.1 Shell (todas as telas)

```
┌──────┬──────────────────────────────────────────────────────┬───────────────┐
│ ◉    │  Pergunte sobre a carreira da Fresno…          [ / ] │  Mesa de      │
│ FRES │──────────────────────────────────────────────────────│  cruzamento   │
│      │                                                      │  ▮ ▮ ▮ ▮ ▮ ▮  │
│ Iníc │                 conteúdo da tela                     │  ▮ ▮ ▮ ▮ ▮ ▮  │
│ Perg │                                                      │  (18 canais)  │
│ Simu │                                                      │               │
│ Mapa │                                                      │  Fontes: 42   │
│ Dado │                                                      │  relatórios   │
│      │                                                      │  até 11/11/26 │
│ ──── │                                                      │               │
│ Quer │                                                      │               │
│ isso │                                                      │               │
│ vivo?│                                                      │               │
└──────┴──────────────────────────────────────────────────────┴───────────────┘
 72px              fluido (máx. 860px de leitura)                   280px
```

- Desktop ≥1200px: 3 colunas. 900–1199px: a mesa vira faixa horizontal compacta acima do conteúdo durante o raciocínio. <900px: rail vira barra inferior; mesa vira faixa horizontal rolável.
- Conteúdo alinhado à esquerda; respostas com largura de leitura de até 72 caracteres por linha.

### 5.2 Início (painel)

```
Fresno · dados até 11 de novembro de 2026
┌───────────────────────────────────────────────────────────────┐
│ Pergunte sobre a carreira da Fresno…                          │
└───────────────────────────────────────────────────────────────┘
Comece por aqui
[Onde eu posso cobrar mais cachê?] [Show grande dá retorno no streaming?]
[Quando devo lançar o próximo trabalho?] [Quem é o meu público de verdade?]

O que mudou                                   Índices
● Porto Alegre: YouTube +82% em 12 meses  ›   Lealdade  ███████████▏ 86
● Itabuna (BA) disparou +164% em outubro  ›   Momentum  ████████▊    69
● Playlists editoriais paradas em 29      ›   Catálogo  ███████████▊ 92
● X −20% em 12 meses                      ›   Viral     ███████████  86
● Janeiro: queda sazonal para ~399 mil    ›

Por tema
Cachê e turnê (3) · Shows (2) · Lançamentos (4) · Catálogo e setlist (3) …
```

- 4 KPIs ficam numa linha discreta sob o cabeçalho (ouvintes, seguidores, 128 por 100, fãs somados). Nada de cards gigantes.
- Índices como **medidores horizontais** (mesma linguagem da mesa), com "como calculamos" ao tocar.
- Alertas vêm de `respostas.json → alertas`; tocar abre a pergunta ligada. O alerta de Itabuna abre um cartão "investigar" (sem resposta pronta) que explica o que a versão com API faria.

### 5.3 Pergunta → raciocínio → resposta (tela principal)

**Fase A — pensando (2,4 a 4,5 s, pulável)**

```
Onde eu posso cobrar mais cachê?
┌ Pensando ───────────────────────────────────────────── [Pular] ┐
│ ✓ Lendo ouvintes de 44 cidades                    Cidades       │
│ ✓ Dividindo pela população de cada cidade         Cidades + IBGE│
│ ◌ Comparando com a mediana: 457 fãs por 100 mil…  ▍             │
│   Separando as praças em 4 faixas de cachê                      │
└─────────────────────────────────────────────────────────────────┘
                               (mesa: canais Cidades e IBGE acesos, cabo ligando à etapa atual)
```

- Cada etapa vem de `pensando[]` (texto, fontes, ms). O texto entra por digitação rápida (20–30 ms/caractere), a etapa anterior ganha ✓, os canais listados em `fontes` sobem o medidor na mesa.
- Botão **Pular** sempre visível. Segunda visita à mesma pergunta mostra a resposta direto, com "Pensar de novo".
- `prefers-reduced-motion`: etapas aparecem já concluídas, sem digitação nem medidor animado.
- Leitor de tela: região `aria-live="polite"` anuncia cada etapa; o foco vai para o veredito quando a resposta chega.

**Fase B — resposta**

```
Onde eu posso cobrar mais cachê?                         confiança: média ⓘ
Peça de 15% a 25% acima da tabela em Campinas, Porto Alegre, Florianópolis.

  4,3x            3,9x            3,0x
  Campinas        Porto Alegre    Florianópolis      (vs mediana das praças)

Em Campinas há 1.954 ouvintes a cada 100 mil habitantes, 4,3x a mediana…

[ mapa de praças — bolhas por faixa de cachê ]
[ tabela: praças com prêmio de cachê ]

O que fazer
☐ Anexe o card da cidade na proposta para o contratante.
☐ Peça casa maior antes de pedir cachê maior: lotar vale mais que preço.
☐ Use a calculadora de ingressos para dimensionar a casa.   [Abrir calculadora]

Fontes usadas: Ouvintes por cidade · População IBGE 2022      [Como calculamos]

Continue
[Qual a próxima cidade para tocar?] [Quantos ingressos dá pra vender?] [Show grande dá retorno?]
```

- Ordem fixa: pergunta → **veredito** (1 frase, maior texto da tela) → números (2–3) → explicação (≤3 frases) → blocos visuais → o que fazer (checklist que o usuário marca, salvo no navegador) → confiança → fontes → perguntas seguintes.
- `confianca.nivel` alta/média/baixa com o motivo num popover. Honestidade é o que separa de horóscopo.
- Blocos visuais por `tipo` (ver §7.3). Todo gráfico tem versão em tabela ("ver como tabela").
- Botão **Copiar resposta** (texto pronto para WhatsApp/e-mail) e **Compartilhar** (link direto `/fresno/p/:id`).

### 5.4 Perguntar (lista + texto livre)

- Lista das 18 perguntas agrupadas pelos 7 temas de `respostas.json → temas`.
- Texto livre na barra: casamento aproximado com `pergunta` + `variacoes` (§8). Se casar, mostra "Entendi como: *Onde eu posso cobrar mais cachê?*" e abre. Se não casar, abre o **cartão de fallback** (texto em `respostas.json → fallback`) com 3 perguntas próximas e o convite "Na versão com IA, o sistema responde qualquer pergunta com os dados ao vivo."
- Toda pergunta digitada que não casou é registrada (evento de analytics `pergunta_sem_resposta`). Isso é pesquisa de produto e munição de venda.

### 5.5 Simuladores (o que faz parecer sistema)

Três simuladores com conta feita no navegador, a partir de `data.json`:

| Simulador | Entrada | Saída | Fórmula |
|---|---|---|---|
| **Ingressos por cidade** | cidade (busca), taxa de conversão (slider 1–6%, padrão 3–5%) | faixa de ingressos, casa sugerida (até 400 / 400–800 / 800–2 mil / 2–5 mil / 5 mil+) | ouvintes × taxa |
| **Prêmio de cachê** | cachê base em R$ (campo), cidade | cachê sugerido por faixa de demanda | demanda ≥1,5 → +15% a +25%; 1–1,5 → tabela; 0,6–1 → −10% a tabela (festival); <0,6 → abertura |
| **Janela de lançamento** | mês de lançamento (12 botões) | efeito esperado do mês (índice sazonal), comparação com o melhor mês, recomendação | índice do mês seguinte − índice do mês de lançamento + mediana dos lançamentos |

Cada simulador tem um texto de leitura que muda com a entrada ("Em Campinas, com 3% a 5% de conversão: 670 a 1.110 pessoas. Casa sugerida: 800 a 2 mil lugares.").

### 5.6 Mapa

Silhueta do Brasil (mesmo polígono do v1) em tela cheia; bolhas por cidade (área = ouvintes, cor = faixa de cachê com legenda em texto). Tocar numa cidade abre uma gaveta: densidade, demanda vs mediana, faixa de cachê, ingressos, tendência do YouTube, botão "Simular ingressos aqui".

### 5.7 Dados

Os módulos do v1 (praças, shows, lançamentos, catálogo, playlists, público, parcerias) em abas, reaproveitando os mesmos gráficos. Link "Baixar relatório" para `/fresno/relatorio`.

### 5.8 Conversão (fechamento)

Item fixo no rail: **"Quer isso vivo?"** abre um painel lateral: o que muda na versão paga (dados atualizados toda semana, alertas no dia, perguntas livres com IA, área da equipe) + contato (de `config.json → contato`). Também aparece no fim de cada resposta a partir da 3ª pergunta feita.

## 6. Design system

### 6.1 Plano e revisão (skill frontend-design)

Primeira ideia foi repetir o v1: fundo quase preto com um vermelho vivo. A skill aponta exatamente isso como clichê ("near-black com um único acento vibrante"), e o v1 já está nesse lugar. Revisão: o sistema ganha a paleta de **casa de show com luz de cena** — fundo violeta-tinta (não preto neutro), painéis de coxia, um único acento âmbar de refletor que só aparece quando algo está ativo (pensando, selecionado, foco). A cor do artista fica restrita à capa. Segunda revisão: tirei rótulos em caixa alta, eyebrows e numeração 01/02 (que eram tiques do v1); a hierarquia vem de tamanho e peso.

### 6.2 Tokens

**Cor — sistema (fixa)**
| Token | Hex | Uso |
|---|---|---|
| `palco` | `#16141D` | fundo da aplicação |
| `coxia` | `#1F1C28` | painéis, cartões, mesa |
| `ferragem` | `#2E2A3A` | bordas, divisores, trilho dos medidores |
| `luz` | `#EDE9F2` | texto principal (13,9:1 sobre coxia) |
| `fumaca` | `#9C95AB` | texto de apoio (5,8:1 sobre coxia) |
| `refletor` | `#F2B33D` | estado ativo: pensando, canal aceso, foco, seleção (9,0:1 sobre coxia) |

**Cor — artista (por `config.json`)**: `capa` (cor do disco atual) só na faixa de capa do artista e no avatar.

**Cor — dados** (validadas com o validador de paleta da skill dataviz, modo escuro, superfície `#1F1C28`: todas passam)
| Token | Hex | Uso |
|---|---|---|
| `dado-1` | `#E5533F` | série única / feminino |
| `dado-2` | `#3A8FD6` | segunda série / masculino |
| `dado-pos` | `#2E9E8F` | acima da média |
| `dado-neg` | `#E5533F` | abaixo da média |
| `dado-neutro` | `#4A4250` | contexto, "o resto" |

**Tipografia**
| Papel | Família | Notas |
|---|---|---|
| Display (veredito, nome do artista, números grandes) | **Bricolage Grotesque** (variável, 600–800, largura condensada no nome do artista) | tem cara de cartaz de show sem ser a fonte "padrão de IA" |
| Interface e texto | **Instrument Sans** (400/500/600) | `tabular-nums` só em tabelas, eixos e medidores |

Escala (razão 1,25): 13 · 15 · 17 · 21 · 26 · 33 · 41 · 52. Veredito: 33–41. Corpo: 17/1,55. Linha de leitura ≤72 caracteres.

**Forma e movimento**
- Raio: 6px em controles, 12px em painéis, 999px em chips de pergunta. Hierarquia por raio, não um raio para tudo.
- Sem sombras cinzas genéricas: profundidade por camada de cor (`palco` → `coxia` → `ferragem`).
- Movimento só onde responde à ação: raciocínio (uma coreografia), abrir gaveta, marcar checklist. Nada de "fade-up" em cada bloco. Duração 160–240 ms; medidores 400 ms ease-out.

### 6.3 Componentes

| Componente | Descrição | Estados |
|---|---|---|
| `BarraDePergunta` | input com sugestões em tempo real (perguntas que casam) | vazio, digitando, sugestão destacada, sem resultado |
| `ChipPergunta` | pergunta clicável (pill) | normal, hover, foco, já vista (✓ discreto) |
| `MesaDeCruzamento` | 18 canais verticais em 2 fileiras de 9 (rótulo `curto` + medidor + led; nome completo em foco/toque) | ocioso (medidor baixo, nível = volume de dados da fonte), ativo (sobe, led âmbar), usado (fica a meio nível com led apagado) |
| `CaboDeLuz` | linha SVG animada da etapa ativa até os canais | só durante o raciocínio |
| `Raciocinio` | lista de etapas com digitação e ✓ | executando, concluído, pulado |
| `Veredito` | frase-resposta | — |
| `NumeroChave` | valor grande + rótulo humano | — |
| `Bloco` | renderizador por tipo (§7.3) | carregando não existe (dados locais) |
| `Checklist` | ações com caixa de marcar persistida | marcado/não |
| `SeloConfianca` | alta/média/baixa + popover com motivo | — |
| `Medidor` | barra horizontal 0–100 (índices) | — |
| `Simulador` | formulário + leitura dinâmica | — |
| `GavetaCidade` | detalhe de cidade no mapa | aberta/fechada |
| `PainelConversao` | "Quer isso vivo?" | — |

### 6.4 Regras de UX e acessibilidade (skill ui-ux-pro-max, prioridade crítica)

- Contraste de texto ≥ 4,5:1 (tokens acima já verificados); foco sempre visível (anel `refletor` 2px), nunca remover outline.
- Alvos de toque ≥ 44×44 px com ≥ 8 px entre eles (chips, botões do mês). Os canais da mesa são indicadores, não botões; no celular a mesa vira faixa rolável com canais de 44 px.
- Nada só em hover: tudo que aparece em hover aparece em toque e em foco de teclado.
- Toda ação tem retorno: pergunta enviada → raciocínio começa em < 100 ms; marcar ação → ✓ imediato.
- Botões só com ícone têm `aria-label`. Gráficos têm resumo em texto e "ver como tabela".
- Teclado: `/` foca a pergunta, setas navegam sugestões, `Enter` abre, `Esc` pula o raciocínio e fecha gavetas.
- Rodar o checklist pré-entrega da skill antes do deploy.

## 7. Modelo de dados

### 7.1 Arquivos que o app lê

```
app/public/data/fresno/data.json        # saída de analytics.py (KPIs, índices, cidades, séries…)
app/public/data/fresno/respostas.json   # saída de answers.py (perguntas, alertas, temas, fontes)
app/public/data/fresno/config.json      # tema/capa, contato, textos
```

Gerados por `python3 scripts/build.py fresno && python3 scripts/answers.py fresno` + um passo de cópia (ver §10). **Nenhum número é digitado no app.**

### 7.2 Pergunta (`respostas.json → perguntas[]`)

```ts
type Pergunta = {
  id: string;                    // slug, vira a URL
  tema: 'cache'|'shows'|'lancamentos'|'catalogo'|'publico'|'playlists'|'parcerias';
  destaque?: boolean;            // aparece em "Comece por aqui"
  simulador?: 'ingressos'|'janela'|'cache';
  pergunta: string;
  variacoes: string[];           // termos para casar texto livre
  pensando: { texto: string; fontes: FonteId[]; ms: number }[];
  veredito: string;
  explicacao: string;
  numeros: { valor: string; rotulo: string }[];
  blocos: Bloco[];
  acoes: string[];
  confianca: { nivel: 'alta'|'média'|'baixa'; motivo: string };
  seguintes: string[];           // ids
};
```

`FonteId` = chaves de `respostas.json → fontes` (18 canais da mesa; cada uma tem `nome` e `curto`).

### 7.3 Tipos de bloco visual

| `tipo` | Lê de `data.json` | Visual |
|---|---|---|
| `mapa` | `cidades` | silhueta + bolhas; `destacar[]` opcional |
| `tabela` | qualquer lista; `colunas[]`, `filtro` | tabela ordenável |
| `barras` | lista + `campo` | barras horizontais ranqueadas; `destacar[]` |
| `barras_divergentes` | `lancamentos` / `serie_inv.lista` | positivo/negativo a partir do zero |
| `sazonalidade` | `sazonalidade` | 12 barras divergentes, meses fortes em destaque |
| `previsao` | `historico` + `previsao` | linha + faixa provável |
| `casos_show` | `shows.casos_cidade` | 4 mini-séries com a data do show marcada |
| `pontos_eventos` | `shows.eventos` | dispersão no tempo, festival × próprio |
| `piramides` | `publico` + `plataformas[]` | pirâmides idade × gênero lado a lado |
| `linha` | lista + `campo` | linha simples |
| `lista` | `playlists.recomendadas`, `co_palco` | linhas com valor à direita |
| `linha_do_tempo` | `contexto.aniversarios` | anos em sequência |
| `citacoes` | `comentarios.destaques` | 2 citações |
| `simulador` | conforme `simulador` | simulador embutido |

Os componentes de gráfico do v1 (`template/dashboard.html`) já resolvem quase todos esses tipos em SVG puro: portar para componentes React mantendo a lógica.

## 8. Casamento de texto livre (demo)

1. Normalizar (minúsculas, sem acento, sem pontuação, remover palavras vazias: "o, a, de, eu, minha…").
2. Para cada pergunta: pontuação = 3 × (termos de `variacoes` contidos no texto) + 1 × (palavras em comum com `pergunta`).
3. Melhor pontuação ≥ 3 → abre com "Entendi como: …". Duas perguntas empatadas → mostra as duas para escolher.
4. Abaixo de 3 → fallback com as 3 perguntas de maior pontuação.
5. Na versão com IA, este módulo é substituído por uma chamada ao endpoint (§12) que devolve o mesmo tipo `Pergunta`.

## 9. Coreografia do raciocínio (especificação)

| Momento | O que acontece | Tempo |
|---|---|---|
| 0 ms | Pergunta sobe para o topo; painel "Pensando" abre; foco no botão Pular | 160 ms |
| por etapa | texto digita; canais de `fontes` sobem o medidor (0 → nível) e acendem; cabo de luz liga etapa ↔ canais | `ms` da etapa (600–900) |
| fim da etapa | ✓; canais ficam a meio nível, led apaga | 120 ms |
| fim | painel "Pensando" recolhe para uma linha ("Cruzou 2 fontes em 4 etapas · ver"); veredito entra | 240 ms |

Teto total: 4,5 s. Pular leva direto ao fim. Repetição da mesma pergunta: pula por padrão.

## 10. Arquitetura técnica

**Stack:** Vite + React 18 + TypeScript + React Router + CSS com variáveis (tokens em `tokens.css`; Tailwind opcional) + `motion` (Framer Motion) só para a coreografia + `@vercel/analytics`. Gráficos em SVG próprio (sem biblioteca de gráfico).

```
bi-do-artista/
├─ app/                         # novo (Vite)
│  ├─ index.html
│  ├─ src/
│  │  ├─ main.tsx, App.tsx, routes.tsx
│  │  ├─ styles/tokens.css, base.css
│  │  ├─ data/useArtist.ts       # carrega data/respostas/config por slug
│  │  ├─ lib/match.ts            # casamento de texto (§8)
│  │  ├─ lib/format.ts           # números pt-BR
│  │  ├─ components/shell/…      # Rail, BarraDePergunta, MesaDeCruzamento, CaboDeLuz
│  │  ├─ components/answer/…     # Raciocinio, Veredito, NumeroChave, Checklist, SeloConfianca
│  │  ├─ components/blocks/…     # Mapa, Tabela, Barras, Divergente, Linha, Piramide, …
│  │  ├─ components/sims/…       # SimIngressos, SimCache, SimJanela
│  │  └─ pages/…                 # Inicio, Pergunta, Perguntas, Simular, Mapa, Dados
│  └─ public/data/<slug>/        # gerado pelo pipeline (commitado)
├─ scripts/ (analytics, answers, build, ingest) + scripts/sync_app.py (novo)
├─ public/<slug>/index.html      # relatório v1
└─ vercel.json
```

**`scripts/sync_app.py` (novo):** roda `analytics`/`build`/`answers` e copia `data.json`, `respostas.json` e o `config.json` público para `app/public/data/<slug>/`; copia `public/<slug>/index.html` para `app/public/<slug>/relatorio/index.html`.

**`vercel.json` (atualizar):**
```json
{
  "buildCommand": "cd app && npm ci && npm run build",
  "outputDirectory": "app/dist",
  "cleanUrls": true,
  "rewrites": [{ "source": "/((?!data/|assets/|.*\\..*).*)", "destination": "/index.html" }],
  "headers": [{ "source": "/(.*)", "headers": [{ "key": "X-Robots-Tag", "value": "noindex, nofollow" }] }]
}
```
Arquivos estáticos (`/fresno/relatorio/index.html`, `/data/...`) são servidos antes do rewrite.

**Performance:** JS inicial < 180 KB gzip; `data.json` + `respostas.json` carregados em paralelo (≈150 KB); primeira pintura < 1,5 s em 4G.

**Analytics (eventos):** `pergunta_aberta {id, origem: chip|texto|alerta|seguinte}`, `raciocinio_pulado`, `pergunta_sem_resposta {texto}`, `simulador_usado {sim, cidade|mes}`, `acao_marcada {id}`, `cta_aberto`, `resposta_copiada`.

## 11. Plano de construção (para o Claude Code)

Antes de começar, instalar as skills de design no projeto e segui-las:
```bash
npx claude-code-templates@latest --skill creative-design/frontend-design
npx claude-code-templates@latest --skill creative-design/ui-ux-pro-max
```

| Fase | Entrega | Pronto quando |
|---|---|---|
| 0. Fundação | `app/` Vite+TS, rotas, tokens, fontes, `sync_app.py`, `vercel.json` | `/fresno` abre com shell vazio na Vercel |
| 1. Shell | Rail, BarraDePergunta, MesaDeCruzamento (estado ocioso), layout responsivo | 3 larguras sem quebra; teclado funciona |
| 2. Pergunta | Raciocínio + coreografia + resposta (veredito, números, explicação, ações, confiança, seguintes) | as 18 perguntas abrem por URL, pular funciona, reduced-motion ok |
| 3. Blocos | os 14 tipos de bloco (portar SVG do v1) + "ver como tabela" | todas as perguntas renderizam todos os blocos |
| 4. Início | KPIs, índices em medidor, alertas, comece por aqui, temas | alertas levam às perguntas certas |
| 5. Texto livre | `match.ts` + fallback + evento `pergunta_sem_resposta` | 20 frases de teste (§13) casam como esperado |
| 6. Simuladores | ingressos, cachê, janela | leituras mudam ao mexer |
| 7. Mapa e Dados | mapa com gaveta; abas de dados; link do relatório | — |
| 8. Conversão e polimento | painel "Quer isso vivo?", copiar/compartilhar, OG image, checklist da skill | Lighthouse ≥ 90 acessibilidade e desempenho |

## 12. Caminho para a versão com IA (não construir agora, só não bloquear)

- Endpoint `POST /api/perguntar {slug, texto}` → devolve `Pergunta` (mesmo tipo). A interface não muda.
- O raciocínio deixa de ser roteiro: o servidor transmite as etapas reais (streaming) com as fontes consultadas, e a mesa acende de verdade.
- Dados passam de CSV para API Chartmetric agendada → Supabase. Área logada para a equipe do artista. Alertas por e-mail/WhatsApp.

## 13. Critérios de aceite

- [ ] As 18 perguntas abrem por chip, por URL e por texto livre; cada uma mostra raciocínio, veredito, números, blocos, ações, confiança e seguintes.
- [ ] Números exibidos batem com `data.json`/`respostas.json` (nenhum valor fixo no código).
- [ ] Mesa de cruzamento acende exatamente as fontes de cada etapa.
- [ ] Pular, reduced-motion e repetição funcionam.
- [ ] Texto livre: "quanto cobrar em campinas" → cachê; "quando soltar o single" → quando lançar; "show gratuito vale a pena" → show dá retorno; "quem ouve fresno" → público; "qual a receita da banda" → fallback.
- [ ] Simuladores calculam ao vivo e explicam o resultado em frase.
- [ ] Funciona em 390px de largura; alvos ≥ 44px; foco visível; contraste ≥ 4,5:1.
- [ ] `/fresno/relatorio` continua no ar.
- [ ] Commit na `main` publica sozinho na Vercel.

## 14. Fora do escopo desta versão

LLM real, login, banco, API Chartmetric, edição pelo usuário, multi-artista na mesma tela, modo fã separado (o tom leve pode vir só por copy num v2.1).
