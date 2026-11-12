# Perfil dos dados — exports Chartmetric (Fresno, nov/2026)

151 arquivos no projeto (≈110 CSV + 23 prints). O pipeline usa **42 CSVs** com nomes canônicos em `data/raw/fresno/`. Os prints são de telas da Chartmetric e não entram no cálculo.

## Visão geral

| Grupo | Arquivos (canônicos) | Grão | Período | Uso no painel |
|---|---|---|---|---|
| Séries diárias de base de fãs | `spotify_followers`, `instagram_followers`, `youtube_subscribers`, `tiktok_followers`, `x_followers`, `deezer_fans`, `twitch_followers`, `lastfm_listeners` | 1 linha por dia | 2017/2020 → 11/2026 | Plataformas, Momentum |
| Engajamento diário | `spotify_listeners` (desde 04/2018), `spotify_popularity`, `spotify_fan_conversion`, `chartmetric_rank`, `tiktok_sound_videos` | 1 linha por dia, com colunas de evento (Lançamentos, Concertos, posts) | 2018 → 11/2026 | Sazonalidade, previsão, efeito de lançamento, índices |
| Shows | `live_events` (65 eventos com "Impacto"), `co_performing` (200 artistas) | 1 linha por evento / artista | 2018 → 2026 | Efeito show, co-palco |
| Cidades | `cities_spotify` (45), `cities_audience` (66, com afinidade), `city_listener_evolution` (5 cidades, diário 11/2025→11/2026), `youtube_city_evolution` (5 cidades), `youtube_cities_trend` (38) | cidade | snapshot + 12 meses | Praças, cachê, efeito show na cidade |
| Demografia | `demo_streaming`, `demo_tiktok`, `demo_instagram`, `demo_youtube`, `demo_social`, `demo_general` | faixa etária × gênero | snapshot | "Duas bandas" |
| Faixas | `tracks_streams`, `tracks_playlist_count`, `tracks_playlist_reach`, `tracks_youtube`, `tracks_shazam` | faixa × dia desde o lançamento | 5 faixas | Força ao vivo |
| Catálogo | `albums` (103 lançamentos) | álbum | 2003 → 2026 | Força do catálogo |
| Conteúdo | `tiktok_sounds`, `instagram_sounds`, `tiktok_top_videos`, `youtube_comments` (1.000) | som / vídeo / comentário | snapshot | Sons virais, temas |
| Playlists | `playlist_evolution` (diário), `playlist_recommendations` (100), `milestones_spotify` (80) | dia / playlist / marco | 2006 → 2026 | Seção Playlists |
| Mercado | `similar_artists` (30), `brand_affinity` (15) | artista / marca | snapshot | Pares, marcas |

## Problemas encontrados

| Severidade | Problema | Tratamento |
|---|---|---|
| Alta | Export "Comparar faixas — Popularidade do Spotify" é idêntico ao de Streams | Descartado |
| Alta | Ouvintes por cidade (`cities_spotify`) é snapshot de ago–dez/2024 | Usado para densidade com aviso; série diária das 5 maiores cidades usada para efeitos recentes |
| Média | "Impacto" de show = 100% em 2018 (início da série) | Eventos de 2018 removidos; outliers > 60% removidos |
| Média | Lista de shows tem 65 eventos, não a agenda completa | Tratado como amostra |
| Média | Queda de −46% em 1 dia em Campinas (out/2026) | Falha de coleta; não usado nos casos |
| Baixa | Itabuna (BA) +164% em out/2026 | Sinal a investigar (show ou viral) |
| Baixa | Shazam só para 1 faixa | Fora do índice de força ao vivo |
| Baixa | "Demografia Geral" = "YouTube Assinantes" (mesmos números) | Usado só o de YouTube |
| Baixa | Dois exports duplicados (Spotify seguidores, Airplay, Classificação) | Mantido 1 |
| Baixa | Formatos mistos: datas "26 de jan. de 2021" / "Nov 11, 2026" / ISO; números "59.8K", "15,734", "1,2 mil", "5,4" | Parsers dedicados em `analytics.py` |

## Achados que viraram leitura no painel

- Ouvintes mensais oscilam entre 290 mil e 550 mil desde 2018: **platô longo com sazonalidade forte** (jan −7%, ago +6%).
- **128 seguidores para cada 100 ouvintes**: base fiel, alcance travado.
- Porto Alegre: ouvintes de +27% para +66% (vs nov/2025) na semana da Redenção.
- Série INVENTÁRIO (2021): efeito cai de +13% para ~0% em 14 capítulos.
- Streaming 56% masculino e 78% entre 25–34; TikTok 53% mulheres de 18–24.
- Playlists editoriais paradas em ~29 desde out/2024; playlists de fãs +6% em 12 meses.
- X −20% em 12 meses; TikTok +14%; vídeos usando o som +59%.

## Análises recomendadas para a v2

1. Efeito show por cidade para **todas** as cidades (precisa da série diária de cada uma via API).
2. Correlação posts × ouvintes (as colunas de posts já vêm nas séries diárias).
3. Curva de vida de cada faixa (dias desde o lançamento) para prever o pico de um single novo.
4. Cluster de público por cidade × idade (exige export cruzado ou API).
