# PRD — BI do Artista (MVP "Raio-X de carreira")

| | |
|---|---|
| **Status** | MVP v1 construído (Fresno) |
| **Dono** | Diego Rodrigues |
| **Data** | nov/2026 |
| **Formato** | Página estática pública (Vercel), 1 por artista, sem login |
| **Fonte de dados** | Exports CSV da Chartmetric + contexto público (imprensa) |

---

## 1. Visão em uma frase

Um raio-x de carreira, gratuito e personalizado, que transforma dados de streaming, redes e shows em **decisões com número** — onde tocar, quanto cobrar, quando lançar, o que postar e com quem fazer parceria — servindo de isca para uma relação recorrente de inteligência de carreira.

## 2. Problema

Artistas e escritórios têm dado demais e leitura de menos. Ferramentas como Chartmetric, Soundcharts, Viberate e Songstats agregam streaming, social e playlists num painel, mas o mercado as descreve como fortes em rastrear dados e fracas em transformá-los em direção de carreira. O próprio painel da Chartmetric é pesado e voltado a times estabelecidos. Resultado: decisões de praça, cachê e lançamento continuam no feeling.

**O que ninguém entrega hoje (nosso espaço):** cruzamento entre fontes + tradução em ação + contexto do artista, em português, para quem não é de dados.

## 3. Público (ICP)

### 3.1 Quem compra
| Segmento | Porte | Por que é o alvo | Prioridade |
|---|---|---|---|
| **Escritório / empresário de artista de porte médio** | 200 mil–3 mi ouvintes mensais, selo próprio ou independente com distribuidora | Tem dinheiro em jogo (cachê, turnê, merch), não tem analista, decide no feeling | **1 — alvo principal** |
| Booker / produtora de shows | carteira de 5–30 artistas | Precisa justificar cachê e praça para contratante | 2 |
| Artista em ascensão com equipe enxuta | 50–200 mil ouvintes | Quer crescer, compra serviço de conteúdo/lançamento | 3 |
| Artista de major | 3 mi+ | Já tem time de dados; só entra como case/conteúdo | fora |

**Regra prática de qualificação:** ≥ 150 mil ouvintes mensais **e** ≥ 20 shows/ano **e** sem analista de dados no time.

### 3.2 Quem usa o link
- **Empresário/booker** (quem recebe o e-mail): quer "cachê" e "praça".
- **Artista** (para quem o empresário encaminha): quer "fã", "lançamento", "conteúdo".
- **Fã** (via conteúdo no TikTok): quer curiosidade. Não compra, mas gera alcance e prova social.

## 4. Proposta de valor

- **Para o empresário:** "Saiba onde pedir mais cachê e qual tipo de show traz público novo — com o número para mostrar ao contratante."
- **Para o artista:** "Descubra quem são seus fãs de verdade, quando lançar e o que postar."
- **Isca:** a primeira entrega já vale dinheiro (ex.: argumento de cachê por cidade). O que se vende depois é a versão viva (mensal/API), o serviço (conteúdo, lançamento, CRM de fãs, roteiro de turnê) e parcerias (marcas).

## 5. Objetivos e métricas de sucesso

| Objetivo | Métrica | Meta do piloto (30 dias, 20 artistas) |
|---|---|---|
| O link gera curiosidade | Taxa de abertura do link enviado | ≥ 50% |
| O conteúdo prende | Tempo médio na página | ≥ 2 min |
| Vira conversa | Respostas ao e-mail/DM | ≥ 20% |
| Vira receita | Propostas aceitas | ≥ 2 |
| Conteúdo atrai | Comentários "faz da minha banda" no TikTok | 100+ por vídeo |

## 6. Escopo do MVP

### 6.1 Dentro
1. **Capa / carta**: nome do artista, 4 índices proprietários, frase-resumo.
2. **O que fazer agora**: 8–10 recomendações, cada uma com área, ação, prova e impacto esperado.
3. **Cachê & turnê**: mapa de praças, densidade de fãs por cidade, faixa de cachê, ingressos potenciais, tendência por cidade.
4. **Efeito show**: casos de show → ouvintes na cidade; show próprio × festival/turnê coletiva; lista de eventos.
5. **Lançamentos**: sazonalidade, efeito de cada lançamento, previsão de 6 meses, calendário de aniversários.
6. **Catálogo & setlist**: força ao vivo das faixas, sons que viralizam, álbuns que seguem vivos.
7. **Playlists**: editoriais × fãs, dependência editorial, playlists para pitch.
8. **Público & conteúdo**: demografia por plataforma, temas de comentários, plataformas que crescem e caem.
9. **Parcerias**: marcas com afinidade, artistas para dividir palco, comparativo com pares.
10. **Metodologia & qualidade dos dados** + CTA de contato.

### 6.2 Fora (por enquanto)
Login, banco de dados, API em tempo real, LLM conversacional, bilheteria, dados financeiros do artista, comparador multi-artista, edição pelo usuário.

## 7. Histórias de usuário

- Como **empresário**, quero ver em 1 tela as 3 cidades onde posso pedir mais cachê, com o número que justifica, para anexar na proposta.
- Como **empresário**, quero saber se show em festival ou show próprio traz mais público novo, para montar a agenda do semestre.
- Como **artista**, quero saber o melhor mês para lançar e quanto meus lançamentos anteriores mexeram nos ouvintes.
- Como **artista**, quero entender quem me ouve e quem me assiste, para decidir o conteúdo de cada rede.
- Como **artista**, quero saber quais músicas estão vivas agora para montar o setlist.
- Como **qualquer leitor**, quero entender cada número sem saber estatística (frase humana + "como calculamos").
- Como **Diego**, quero gerar o painel de um novo artista trocando só CSVs e um arquivo de configuração.

## 8. Requisitos funcionais

| ID | Requisito | Prioridade |
|---|---|---|
| RF01 | Página carrega sem login, sem chamadas externas obrigatórias (dados embutidos) | P0 |
| RF02 | Tema (cores, fontes) definido por artista em `artists/<slug>/config.json` | P0 |
| RF03 | Todos os números calculados pelo pipeline a partir dos CSVs (nada digitado) | P0 |
| RF04 | Cada índice e recomendação mostra a prova e a fórmula | P0 |
| RF05 | Navegação por seções fixa no topo; funciona no celular | P0 |
| RF06 | Gráficos com tooltip ao passar o mouse/tocar | P1 |
| RF07 | Tabelas ordenáveis (cidades) | P1 |
| RF08 | Bloco de qualidade dos dados por artista | P0 |
| RF09 | CTA de contato (e-mail/WhatsApp) configurável | P0 |
| RF10 | Imprimir/exportar em PDF com layout legível | P2 |

## 9. Cálculos (dicionário de métricas)

| Métrica | Fórmula | Fonte | Uso |
|---|---|---|---|
| **Lealdade da Base (0–100)** | 0,6 × percentil de (seguidores ÷ ouvintes) entre os 30 artistas semelhantes + 0,4 × min(100, razão ÷ 1,5) | Spotify seguidores, ouvintes, clusters de similares | Diagnóstico "base fiel × alcance" |
| **Momentum (0–100)** | logística(0,35·Δouvintes + 0,2·ΔTikTok + 0,15·ΔInstagram + 0,15·Δvídeos com o som + 0,15·Δranking), cada Δ de 12 meses limitado a ±30% | várias | "Está esquentando ou esfriando?" |
| **Força do Catálogo (0–100)** | média de popularidade dos 4 melhores álbuns com 10+ anos ÷ popularidade do álbum mais recente | Discografia | Produtos de nostalgia, setlist |
| **Potencial Viral (0–100)** | logística(0,5·Δvídeos com o som [teto 60%] + 0,5·ΔTikTok) | TikTok | Investimento em vídeo curto |
| **Densidade de fãs** | ouvintes na cidade ÷ população (IBGE Censo 2022) × 100 mil | Cidades Spotify + IBGE | Praça e cachê |
| **Demanda relativa** | densidade ÷ mediana das cidades do artista | idem | ≥1,5 = prêmio 15–25%; 1–1,5 = tabela cheia; 0,6–1 = construção; <0,6 = abrir |
| **Ingressos potenciais** | ouvintes na cidade × 3% a 5% (faixa para base fiel; casual = 0,5–1%, engajado = 2–3%) | idem | Tamanho de casa |
| **Efeito show (cidade)** | pico de ouvintes da cidade em 30 dias ÷ média dos 7 dias anteriores − 1 | Evolução diária por cidade | Prova de valor de show grande |
| **Efeito show (tipo)** | impacto Chartmetric − variação sazonal do mês; mediana por tipo | Eventos ao vivo | Festival × show próprio |
| **Sazonalidade** | média mensal ÷ média do ano, médias dos anos completos (2019–2025) | Ouvintes diários desde 2018 | Janela de lançamento |
| **Efeito lançamento** | ouvintes (dias 21–35 após) ÷ (7 dias antes) − 1, menos a variação sazonal | Ouvintes + anotações de lançamento | Formato e timing |
| **Previsão 6 meses** | nível médio dessazonalizado dos últimos 12 meses × índice do mês; faixa ±1,28σ (~80%) | idem | Expectativa realista |
| **Força ao vivo da faixa** | 0,5·streams 90d + 0,3·views YouTube + 0,2·playlists (cada um normalizado 0–100) | Comparar faixas | Setlist |
| **Dependência editorial** | alcance de playlists editoriais ÷ alcance total | Evolução de playlists | Risco/teto de descoberta |
| **Duas bandas** | demografia streaming × TikTok × Instagram | Demografias | Conteúdo e produto |
| **Temas de comentário** | % de comentários (top 1.000 do YouTube) com termos por tema | Comentários YouTube | Narrativa/produto |

## 10. Experiência (UX)

Princípios (detalhe em `docs/design-system.md`):
1. **Decisão antes do gráfico.** Toda seção abre com a frase "o que fazer" e só depois mostra a prova.
2. **Uma ideia por cartão.** Número grande + frase + contexto.
3. **Linguagem de bar, não de planilha.** "Para cada 100 ouvintes, 128 seguem a banda" em vez de "fan conversion rate 128%".
4. **Transparência como argumento.** "Como calculamos" em todo índice; seção de qualidade de dados.
5. **Cara do artista.** Tema por artista (cores do disco atual), tipografia forte, fundo escuro.
6. **Mobile primeiro** para o fã do TikTok; desktop confortável para o empresário.

Fluxo: Capa → Decisões → Cachê & turnê → Shows → Lançamentos → Catálogo → Playlists → Público → Parcerias → Metodologia/CTA.

## 11. Arquitetura técnica

```
data/raw/<slug>/*.csv        # exports da Chartmetric com nomes canônicos
artists/<slug>/config.json   # tema, contexto editorial, casos de show, avisos
scripts/ingest.py            # renomeia exports originais da Chartmetric -> nomes canônicos
scripts/analytics.py         # motor: KPIs, índices, cruzamentos, recomendações
scripts/build.py             # gera public/<slug>/index.html + data.json
template/dashboard.html      # template único (HTML + CSS + JS, SVG à mão, sem dependências)
public/                      # saída estática que a Vercel publica
```

- **Sem framework e sem biblioteca de gráfico**: SVG gerado em JS puro → página leve, carrega offline, nada quebra se um CDN cair.
- **Vercel**: projeto conectado ao repo, `outputDirectory = public`, sem build (o HTML gerado é commitado). Cada artista vira `/<slug>`.
- **Novo artista** (≈30 min):
  1. Exportar os CSVs da Chartmetric para uma pasta.
  2. `python3 scripts/ingest.py <pasta> <slug>`
  3. Copiar `artists/fresno/config.json` → `artists/<slug>/config.json` e ajustar tema/contexto.
  4. `python3 scripts/build.py <slug>` → commit → deploy automático.
- **Branch por artista** continua possível (duplicar a branch), mas a recomendação é **pasta por artista na main**: um único template, correções valem para todos.

## 12. Conteúdo e distribuição (isca)

- **E-mail/DM para escritórios**: assunto com o achado mais forte da cidade ou do show ("Porto Alegre ouviu 30% mais Fresno depois da Redenção").
- **TikTok "comente até chegar na sua banda"**: cada vídeo = 1 curiosidade do painel (ex.: "existem duas Fresnos"), com link na bio. O pedido do fã vira fila de produção e lista de prospecção.
- **Perfil novo e separado** do Diego ABM/mídia: tom leve, dado como entretenimento (música no MVP; futebol, influenciadores depois).

## 13. Roadmap

| Fase | Entrega |
|---|---|
| **v1 (agora)** | Painel estático por artista via CSV; Fresno publicado |
| v1.1 | +5 artistas; analytics de abertura (Vercel Analytics); OG image por artista para compartilhar |
| v2 | API Chartmetric → atualização semanal automática; alertas ("Itabuna +164%") |
| v3 | Área logada (Supabase), LLM que responde perguntas sobre os dados, MCP, bilheteria e merch do próprio artista |
| v4 | Outros verticais (futebol, influenciadores) com o mesmo motor |

## 14. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Termos de uso da Chartmetric para dados exibidos publicamente | Usar dados agregados e derivados, citar a fonte; validar plano/licença antes de escalar |
| Recomendação errada queimar credibilidade | Linguagem de "indica", faixas em vez de número exato, metodologia aberta |
| Exports inconsistentes entre artistas | `ingest.py` por padrão de nome + avisos automáticos de arquivo faltante |
| Artista não gostar de ser analisado sem pedir | Tom respeitoso, sem dados financeiros privados, link não indexado (noindex) |

## 15. Pesquisa de mercado — o que aproveitamos

- Ferramentas atuais (Chartmetric, Soundcharts, Songstats, Viberate) são fortes em rastreamento e fracas em direção de carreira → nosso foco é a leitura.
- Boas práticas de roteiro de turnê: analisar por cidade, comparar com a população, separar pico de linha de base, cruzar com redes e começar pequeno.
- Conversão de ouvintes em ingresso: casual 0,5–1%, engajado 2–3%, dedicado 3–5%, superfã 5–10% → usamos 3–5% porque a base da Fresno é fiel (128 seguidores por 100 ouvintes).

Fontes:
- [OnesToWatch — Songstats Competitors 2026](https://resources.onestowatch.com/?p=814)
- [OnesToWatch — Chartmetric alternatives](https://resources.onestowatch.com/?p=1018)
- [RouteNote — How to use streaming data to decide where to tour](https://routenote.com/radar/how-to-use-streaming-data-to-decide-where-to-tour/)
- [Orphiq — How to use Spotify analytics for tour routing](https://orphiq.com/resources/spotify-analytics-tour-routing)
- [Chartmetric — How to route a tour using streaming data](https://blog.chartmetric.com/how-to-route-a-tour-using-streaming-data-part-1-tour-planning-series/)
