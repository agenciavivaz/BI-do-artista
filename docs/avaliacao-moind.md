# Avaliação de fontes Moind — Fresno

Consulta em 17/11/2026. Os dados do painel têm referência em 11/11/2026; não foram atualizados automaticamente pela consulta.

- Google Trends / DataForSEO: pesquisa `Fresno banda`, Brasil, últimos 12 meses, custo US$ 0,011 (run `01M7NDKY0QF3TB5CEP6ZRZ5VT5`). Muitos intervalos semanais vieram sem valor; dados ausentes não são zero. A consulta é ambígua e os valores são normalizados, não contagem de pessoas. O sinal não foi incorporado às previsões.
- Spotify / Litescrape: metadados públicos de artistas e catálogo, US$ 0,00015 por chamada. Pode ajudar a manter catálogo; a descrição não garante histórico de ouvintes ou público local.
- YouTube / Litescrape: perfil e conteúdo público, US$ 0,00015 por chamada. Útil para acompanhamento de conteúdo, mas um retrato isolado não estabelece crescimento nem venda de ingressos.
- Google Events: busca de eventos, preço variável. Ajuda na conferência de agenda e concorrência, mas não comprova público, capacidade real nem bilheteria.
- Instagram Profile Scraper / Apify: perfil, posts recentes e métricas públicas de engajamento, a partir de US$ 0,00081 por perfil. Bom para observar cadência e formatos; ruim para comparar posts sem controlar idade, mídia paga e alcance.
- YouTube Channel Videos / AnyAPI: vídeos, data, duração e, conforme a rota, visualizações, a partir de US$ 0,0008 por página. Pode alimentar velocidade por formato, mas não entrega returning viewers, fãs ou origem de tráfego.
- TikTok Profile Videos / AnyAPI: views, likes, comentários, salvamentos e compartilhamentos, a partir de US$ 0,0006 por página. É a melhor fonte pública encontrada para testar taxa de compartilhamento e salvamento por formato.

Nenhuma dessas fontes públicas substitui os dados privados das plataformas. Elas devem entrar como monitoramento de conteúdo e mercado, não como variáveis do modelo de ingressos sem histórico anterior a cada show e validação fora da amostra.

Para testar se uma fonte melhora a previsão de público, coletar dados históricos anteriores a cada show e bilheteria real por data, praça e configuração da casa. Comparar previsões fora da amostra em ordem temporal, inclusive com e sem cada fonte. Shows esgotados são pisos de demanda. A validação atual usa estimativas de ocupação e os mesmos dados para selecionar fórmulas; não mede precisão em shows futuros. A faixa e a chance de esgotar são cenários baseados em premissas, não probabilidades calibradas.

## Indicadores prioritários para uma versão conectada

1. Bilheteria por praça: ingressos vendidos por dia, capacidade configurada, preço médio líquido, mídia e data do anúncio.
2. Spotify for Artists: streams por ouvinte, saves, playlist adds e origem ativa versus programada. Métricas públicas não revelam esse funil.
3. YouTube Analytics for Artists: unique viewers, returning viewers, fãs e top fãs; visualização pública isolada não mede recorrência.
4. Conteúdo: views em 7 e 30 dias, compartilhamentos por mil views, salvamentos por mil views e ganho de seguidores por publicação.
5. Base própria: contatos consentidos, cidade, origem, compra de ingresso e compra de merch. É o elo que permite medir conversão e valor do fã sem somar a mesma pessoa em várias redes.

Referências: [Spotify — source of streams](https://support.spotify.com/by-en/artists/article/source-of-streams/), [Spotify — histórico disponível](https://support.spotify.com/us/artists/article/how-far-back-your-stats-go/), [Spotify Fan Study — merch e shows](https://artists.spotify.com/fan-study/merch-and-live), [YouTube Analytics for Artists](https://support.google.com/youtube/answer/18736729?hl=en), [YouTube — performance do artista](https://support.google.com/youtube/answer/9419340?hl=en).
