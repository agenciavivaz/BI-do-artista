"""
Copia os exports da Chartmetric (com os nomes originais que a plataforma gera)
para data/raw/<slug>/ com nomes canônicos que o motor entende.

    python3 scripts/ingest.py ~/Downloads/chartmetric-matue matue

Regras:
- Casamento por trechos do nome normalizado (sem acento, minúsculo).
- Quando mais de um arquivo casa com a mesma chave, fica o maior (mais histórico).
- Lista no final o que faltou: o painel funciona sem alguns blocos, mas avisa.
"""
import re
import shutil
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# ordem importa: padrões mais específicos primeiro
PADROES = [
    ('live_events', ['eventos ao vivo do artista']),
    ('spotify_fan_conversion', ['taxa de conversao de fas do spotify']),
    ('spotify_popularity', ['engajamento indice de popularidade do spotify']),
    ('spotify_listeners', ['engajamento ouvintes mensais do spotify']),
    ('spotify_followers', ['base de fas seguidores do spotify']),
    ('instagram_followers', ['base de fas seguidores do instagram']),
    ('youtube_subscribers', ['base de fas inscritos do youtube']),
    ('tiktok_followers', ['base de fas seguidores do tiktok']),
    ('x_followers', ['base de fas seguidores do x']),
    ('deezer_fans', ['base de fas fas do deezer']),
    ('twitch_followers', ['seguidores totais do twitch']),
    ('lastfm_listeners', ['base de fas ouvintes no lastfm']),
    ('co_performing', ['co performing artists']),
    ('brand_affinity', ['afinidade de marcas']),
    ('cities_audience', ['cities audience table']),
    ('cities_spotify', ['cidades principais']),
    ('city_listener_evolution', ['evolucao mensal de ouvintes na cidade']),
    ('youtube_city_evolution', ['evolucao mensal de visualizacoes do youtube']),
    ('youtube_cities_trend', ['youtube tendencia cidades']),
    ('demo_general', ['demografia da audiencia geral']),
    ('demo_streaming', ['demografia da audiencia streaming']),
    ('demo_instagram', ['demografia da audiencia instagram seguidores']),
    ('demo_tiktok', ['demografia da audiencia tiktok seguidores']),
    ('demo_youtube', ['demografia da audiencia youtube assinantes']),
    ('demo_social', ['demografia da audiencia social']),
    ('tracks_streams', ['comparar faixas streams do spotify']),
    ('tracks_playlist_count', ['comparar faixas contagem de listas de reproducao do spotify']),
    ('tracks_playlist_reach', ['comparar faixas alcance da lista de reproducao do spotify']),
    ('tracks_youtube', ['comparar faixas visualizacoes de videos do youtube']),
    ('tracks_shazam', ['comparar faixas contagens do shazam']),
    ('albums', ['discografia de albuns']),
    ('tiktok_sounds', ['principais sons']),
    ('instagram_sounds', ['popular instagram reels sounds']),
    ('tiktok_top_videos', ['artist top tiktok videos']),
    ('similar_artists', ['similar artist clusters']),
    ('playlist_evolution', ['evolucao de playlists do spotify']),
    ('playlist_recommendations', ['recomendacao de listas de reproducao do spotify']),
    ('youtube_comments', ['temas de comentarios principais do youtube']),
    ('milestones_spotify', ['spotify marcos']),
    ('chartmetric_rank', ['tendencias globais classificacao chartmetric']),
    ('tiktok_sound_videos', ['postagens do tiktok com sons de artistas']),
    ('instagram_engagement', ['seguidores do instagram contagem de publicacoes']),
]

ESSENCIAIS = {'spotify_listeners', 'spotify_followers', 'cities_spotify', 'live_events', 'demo_streaming', 'similar_artists'}


def norm(name: str) -> str:
    s = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


def header(path: Path) -> str:
    with open(path, encoding='utf-8-sig', errors='replace') as f:
        return f.readline()


def classify(path: Path):
    n = norm(path.stem)
    for key, pats in PADROES:
        if all(p in n for p in pats):
            if key == 'tiktok_sound_videos' and 'Total TikTok Videos' not in header(path):
                return None  # o outro export (views) não é usado
            if key == 'spotify_listeners' and 'Ouvintes Mensais' not in header(path):
                return None
            return key
    return None


def main(src: str, slug: str):
    src_dir = Path(src).expanduser()
    dst = ROOT / 'data' / 'raw' / slug
    dst.mkdir(parents=True, exist_ok=True)
    chosen = {}
    for p in sorted(src_dir.glob('*.csv')):
        k = classify(p)
        if not k:
            print(f'  ignorado  {p.name}')
            continue
        if k not in chosen or p.stat().st_size > chosen[k].stat().st_size:
            chosen[k] = p
    for k, p in chosen.items():
        shutil.copy(p, dst / f'{k}.csv')
        print(f'  {k:28s} <- {p.name}')
    faltam = [k for k, _ in PADROES if k not in chosen]
    print(f'\n{len(chosen)} arquivos em data/raw/{slug}/')
    if faltam:
        print('faltando:', ', '.join(faltam))
    crit = ESSENCIAIS - set(chosen)
    if crit:
        print('ATENÇÃO, essenciais faltando:', ', '.join(sorted(crit)))


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
