# Brainstorm — BI do Artista

> Sessão de produto feita antes do PRD. Objetivo: decidir **o que o painel precisa dizer** para um artista/empresário falar "uau" em 60 segundos, sem login e sem ser "pessoa de dados".

## 1. Enquadramento

| Pergunta | Resposta |
|---|---|
| O que estamos explorando? | Um painel público (link) que transforma exports da Chartmetric em **decisões de carreira**: onde tocar, quanto cobrar, quando lançar, o que postar, pra quem vender. |
| Por que agora? | Ferramentas de dado existem (Chartmetric, Soundcharts, Viberate, Spotify for Artists), mas entregam métrica, não direção. A lacuna é a **leitura**. |
| Quem tem o problema? | Escritório/empresário/booker de artista de porte médio (300k–3M ouvintes) com selo próprio ou independente. Artista muito pequeno não tem dado suficiente; artista de major já tem analista. |
| O que fazem hoje? | Olham o Spotify for Artists e o Instagram, decidem praça e cachê por feeling e histórico do contratante. |
| Restrições do MVP | Só CSV da Chartmetric, sem login, sem banco, HTML estático na Vercel, 1 template replicável por artista. |
| Resultado ótimo | O empresário encaminha o link pro artista e responde o e-mail pedindo "o resto". |

### Job to be done

- **Empresário/booker:** "Quando vou negociar uma data, quero um argumento com número para pedir mais cachê e escolher a praça certa, para fechar melhor e com menos risco."
- **Artista:** "Quando planejo lançamento e conteúdo, quero saber o que meus fãs reais respondem, para crescer sem virar escravo do algoritmo."
- **Fã (público do TikTok):** "Quero descobrir curiosidades da banda que eu amo." → combustível do conteúdo "comente até chegar na Fresno".

## 2. Divergir — cruzamentos que viram decisão

Cada ideia abaixo cruza pelo menos duas fontes. Marcadas com ✅ as que o export atual sustenta.

**Cachê & turnê**
- ✅ **Densidade de fãs por cidade** (ouvintes ÷ população IBGE) → "pedir 15–25% a mais onde a densidade é 1,5x a média".
- ✅ **Efeito show na cidade**: série diária de ouvintes por cidade antes/depois de um show (ex.: Redenção → Porto Alegre).
- ✅ **Show próprio vs festival/turnê coletiva**: impacto em ouvintes, já descontada a sazonalidade.
- ✅ **Ingressos potenciais** por praça (ouvintes × 3–5% para base fiel) → tamanho de casa recomendado.
- ✅ **Com quem dividir palco** (artistas que mais dividiram line-up + artistas semelhantes com público mais jovem).
- 🔜 Preço de ingresso × capacidade × lotação (precisa de bilheteria).

**Lançamentos**
- ✅ **Sazonalidade própria** do artista (índice mensal 2019–2025) → janela de lançamento.
- ✅ **Efeito de cada lançamento** em ouvintes (30 dias, ajustado à sazonalidade).
- ✅ **Fadiga de série** (14 singles semanais em 2021: o efeito cai a cada capítulo).
- ✅ **Calendário de aniversários** de disco (catálogo forte + nostalgia).
- ✅ **Previsão 6 meses** (nível dessazonalizado × sazonalidade, com faixa).

**Catálogo & setlist**
- ✅ Força ao vivo por faixa (streams 90d + YouTube + playlists).
- ✅ Sons que viralizam em vídeo (TikTok/Reels) → entram no setlist e no corte de conteúdo.
- ✅ Força do catálogo (discos 10+ anos vs disco novo).

**Playlists**
- ✅ Editorial parado × playlists de fãs crescendo → pitch.
- ✅ Dependência de editorial (% do alcance).
- ✅ Playlists recomendadas para pitch (Chartmetric).

**Público & conteúdo**
- ✅ **"Duas bandas"**: demografia streaming × TikTok × Instagram.
- ✅ Temas dos comentários (nostalgia, "quem ainda ouve em 20XX").
- ✅ Plataformas crescendo × caindo (X −20%, TikTok +14%).

**Marcas & produtos**
- ✅ Afinidade de marcas (Pepsi, Schweppes, Dolly…) → patrocínio.
- ✅ Prova de disposição a pagar (jaqueta de R$ 950 esgotada) → produtos premium de nostalgia.

**Ideias "e se fizéssemos o contrário?"**
- Em vez de mostrar tudo, mostrar **só 8 decisões** na primeira dobra e esconder o resto em abas. (Adotado.)
- Em vez de dashboard, uma **carta** escrita para o artista. (Adotado parcialmente: o topo é escrito como carta curta.)
- Remover gráficos de linha genéricos de seguidores (todo mundo já tem). (Adotado: viram sparkline.)

## 3. Provocar — onde isso quebra

| Premissa | Risco | Como mitigamos no MVP |
|---|---|---|
| Ouvintes por cidade refletem demanda de ingresso | Snapshot da Chartmetric por cidade é de 2024 | Avisar no painel; usar a série diária 2025–26 das top 5 cidades para o efeito show. |
| "Impacto" de show é causal | Sazonalidade e lançamentos se misturam | Ajuste sazonal e falar em "associado a", nunca "causou". |
| Prêmio de 15–25% de cachê | É regra de bolso, não modelo | Mostrar como faixa, com a fórmula aberta no "como calculamos". |
| Empresário entende índice 0–100 | Pode parecer caixa-preta | Cada índice tem frase humana + fórmula. |
| Dado de 1 export vale para todos | Exports variam por artista | Pipeline por padrão de nome + avisos de qualidade por artista. |

**Pergunta mais arriscada:** o empresário vai abrir um link frio? → Teste mais barato: enviar 10 links personalizados e medir abertura (Vercel Analytics) e resposta.

## 4. Convergir — o que entra no MVP

1. **Carta de abertura** + 4 índices proprietários (Lealdade, Momentum, Catálogo, Viral).
2. **8–10 decisões** ("O que fazer agora"), cada uma com prova numérica.
3. **Cachê & turnê:** mapa + tabela de praças com faixa de cachê e ingressos potenciais.
4. **Efeito show:** casos por cidade + show próprio × festival.
5. **Lançamentos:** sazonalidade, efeito por lançamento, previsão 6 meses, calendário de aniversários.
6. **Catálogo & setlist:** força ao vivo + sons virais.
7. **Playlists**, **Público & conteúdo**, **Marcas & parcerias**, **Comparativo com pares**.
8. **Metodologia e qualidade dos dados** (transparência = credibilidade).

**Deixado para depois:** LLM conversando com os dados, alertas, bilheteria, API em tempo real, login.

## 5. Próximos passos

- PRD (docs/PRD.md) e design system (docs/design-system.md).
- Construir o template + pipeline e publicar a Fresno.
- Rodar o template para mais 2 artistas para validar que o pipeline é genérico.
