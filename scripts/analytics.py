"""
Motor de análise do BI do Artista.

Lê os CSVs exportados da Chartmetric (já com nomes canônicos em data/raw/<slug>/)
e devolve um dicionário com KPIs, índices proprietários, cruzamentos e
recomendações. Tudo que aparece no dashboard nasce aqui — nada é digitado à mão,
exceto o contexto editorial em artists/<slug>/config.json.
"""
from __future__ import annotations

import json
import math
import re
from pathlib import Path

import numpy as np
import pandas as pd

import publico

ROOT = Path(__file__).resolve().parent.parent

MESES = {'jan': 1, 'fev': 2, 'mar': 3, 'abr': 4, 'mai': 5, 'jun': 6, 'jul': 7,
         'ago': 8, 'set': 9, 'out': 10, 'nov': 11, 'dez': 12}
MES_NOME = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

# População (IBGE, Censo 2022) das cidades que costumam aparecer nos exports.
POPULACAO = {
    'Sao Paulo': 11451245, 'Rio de Janeiro': 6211423, 'Brasilia': 2817068, 'Fortaleza': 2428678,
    'Salvador': 2418005, 'Belo Horizonte': 2315560, 'Manaus': 2063547, 'Curitiba': 1773733,
    'Recife': 1488920, 'Goiania': 1437237, 'Porto Alegre': 1332845, 'Belem': 1303403,
    'Guarulhos': 1291771, 'Campinas': 1139047, 'São Luís': 1037775, 'Maceio': 957916,
    'Campo Grande': 898100, 'João Pessoa': 833932, 'Joao Pessoa': 833932, 'São Bernardo do Campo': 810729,
    'Natal': 751300, 'Santo Andre': 748919, 'Osasco': 728615, 'Sorocaba': 723682,
    'Uberlandia': 713224, 'Ribeirao Preto': 698642, 'Sao Jose dos Campos': 697054,
    'Cuiaba': 650912, 'Joinville': 616317, 'Florianopolis': 537211, 'Londrina': 555965,
    'Niteroi': 481749, 'Sao Jose do Rio Preto': 480439, 'Vila Velha': 467722,
    'Caxias do Sul': 463501, 'Jundiai': 443221, 'Santos': 418608, 'Maringa': 409657,
    'Bauru': 379146, 'Blumenau': 361261, 'Canoas': 347657, 'Vitória': 322869, 'Vitoria': 322869,
    'São José': 270299, 'Itajai': 264054, 'Novo Hamburgo': 227646, 'Lisbon': 545796,
}

# Coordenadas (lon, lat) para o mapa.
COORD = {
    'Sao Paulo': (-46.63, -23.55), 'Rio de Janeiro': (-43.20, -22.91), 'Porto Alegre': (-51.23, -30.03),
    'Curitiba': (-49.27, -25.43), 'Campinas': (-47.06, -22.91), 'Belo Horizonte': (-43.94, -19.92),
    'Brasilia': (-47.88, -15.79), 'Fortaleza': (-38.54, -3.73), 'Florianopolis': (-48.55, -27.60),
    'Recife': (-34.88, -8.05), 'Manaus': (-60.02, -3.12), 'Salvador': (-38.50, -12.97),
    'Sorocaba': (-47.46, -23.50), 'Goiania': (-49.25, -16.68), 'Guarulhos': (-46.53, -23.46),
    'Santos': (-46.33, -23.96), 'Santo Andre': (-46.54, -23.66), 'Belem': (-48.50, -1.46),
    'Ribeirao Preto': (-47.81, -21.18), 'Bauru': (-49.06, -22.31), 'Joinville': (-48.85, -26.30),
    'Sao Jose dos Campos': (-45.89, -23.18), 'Osasco': (-46.79, -23.53), 'Campo Grande': (-54.62, -20.47),
    'São Bernardo do Campo': (-46.56, -23.69), 'Vitória': (-40.31, -20.32), 'Londrina': (-51.16, -23.31),
    'Blumenau': (-49.07, -26.92), 'Uberlandia': (-48.28, -18.92), 'Maringa': (-51.94, -23.42),
    'Natal': (-35.21, -5.79), 'Canoas': (-51.18, -29.92), 'Vila Velha': (-40.29, -20.33),
    'Maceio': (-35.74, -9.67), 'Joao Pessoa': (-34.86, -7.12), 'São Luís': (-44.30, -2.53),
    'Niteroi': (-43.10, -22.88), 'Caxias do Sul': (-51.18, -29.17), 'Novo Hamburgo': (-51.13, -29.68),
    'Jundiai': (-46.88, -23.19), 'Sao Jose do Rio Preto': (-49.38, -20.82), 'Cuiaba': (-56.10, -15.60),
    'Itajai': (-48.66, -26.91), 'São José': (-48.63, -27.59),
}

NOME_BONITO = {
    'Sao Paulo': 'São Paulo', 'Brasilia': 'Brasília', 'Florianopolis': 'Florianópolis',
    'Goiania': 'Goiânia', 'Belem': 'Belém', 'Ribeirao Preto': 'Ribeirão Preto',
    'Sao Jose dos Campos': 'São José dos Campos', 'Santo Andre': 'Santo André',
    'Uberlandia': 'Uberlândia', 'Maringa': 'Maringá', 'Maceio': 'Maceió', 'Joao Pessoa': 'João Pessoa',
    'Niteroi': 'Niterói', 'Jundiai': 'Jundiaí', 'Sao Jose do Rio Preto': 'São José do Rio Preto',
    'Cuiaba': 'Cuiabá', 'Itajai': 'Itajaí', 'Vitoria': 'Vitória',
}


# ----------------------------------------------------------------------------- helpers

def pt_date(s):
    m = re.match(r'(\d+) de (\w+)\.? de (\d+)', str(s))
    if not m:
        return pd.NaT
    return pd.Timestamp(int(m.group(3)), MESES[m.group(2)[:3]], int(m.group(1)))


def pct(s):
    try:
        return float(str(s).replace('%', '').replace(',', '.').strip())
    except ValueError:
        return float('nan')


def num(s):
    """'59.8K' / '1,2 mil' / '15,734' -> float"""
    s = str(s).strip()
    if s in ('', 'nan', '-', 'None'):
        return float('nan')
    mult = 1
    low = s.lower()
    if low.endswith('k'):
        mult, s = 1e3, s[:-1]
    elif low.endswith('m') and not low.endswith('mil'):
        mult, s = 1e6, s[:-1]
    elif low.endswith('mil'):
        mult, s = 1e3, s[:-3].strip()
        s = s.replace(',', '.')
        return float(s) * mult
    s = s.replace(',', '')
    try:
        return float(s) * mult
    except ValueError:
        return float('nan')


def clamp(x, lo=0, hi=100):
    return max(lo, min(hi, x))


def r(x, n=1):
    if x is None or (isinstance(x, float) and math.isnan(x)):
        return None
    return round(float(x), n)


class Data:
    def __init__(self, slug):
        self.dir = ROOT / 'data' / 'raw' / slug

    def has(self, key):
        return (self.dir / f'{key}.csv').exists()

    def df(self, key):
        return pd.read_csv(self.dir / f'{key}.csv', encoding='utf-8-sig')

    def series(self, key, col=1):
        d = self.df(key)
        idx = d['Data'].map(pt_date)
        s = pd.Series(pd.to_numeric(d.iloc[:, col], errors='coerce').values, index=idx).dropna()
        s = s[~s.index.isna()].sort_index()
        return s[~s.index.duplicated(keep='last')]

    def annotated(self, key):
        """Série + colunas de eventos (Lançamentos, Concertos) que a Chartmetric anota."""
        d = self.df(key)
        d['d'] = d['Data'].map(pt_date)
        return d.dropna(subset=['d']).sort_values('d')


def growth(s, days):
    if len(s) < 2:
        return None
    last = s.iloc[-1]
    prev = s[s.index <= s.index[-1] - pd.Timedelta(days=days)]
    if not len(prev) or prev.iloc[-1] == 0:
        return None
    return (last / prev.iloc[-1] - 1) * 100


# ----------------------------------------------------------------------------- blocos

def seasonality(listeners: pd.Series):
    m = listeners.resample('ME').mean().to_frame('v')
    m['y'] = m.index.year
    m['mo'] = m.index.month
    full_years = m.groupby('y').v.count()
    keep = full_years[full_years == 12].index
    m = m[m.y.isin(keep)]
    m['n'] = m.v / m.groupby('y').v.transform('mean')
    idx = (m.groupby('mo').n.mean() * 100 - 100)
    return {int(k): r(v, 1) for k, v in idx.items()}, sorted(keep.tolist())


def forecast(listeners: pd.Series, season: dict, months=6):
    monthly = listeners.resample('ME').mean()
    last12 = monthly.iloc[-13:-1] if listeners.index.max().day < 25 else monthly.iloc[-12:]
    deseason = [v / (1 + season[d.month] / 100) for d, v in last12.items()]
    base = float(np.mean(deseason))
    resid = np.std(deseason)
    out = []
    start = monthly.index[-1]
    for i in range(1, months + 1):
        d = (start + pd.offsets.MonthEnd(i))
        f = base * (1 + season[d.month] / 100)
        out.append({'mes': f"{MES_NOME[d.month-1]}/{str(d.year)[2:]}", 'valor': round(f),
                    'min': round(f - 1.28 * resid), 'max': round(f + 1.28 * resid)})
    hist = [{'mes': f"{MES_NOME[d.month-1]}/{str(d.year)[2:]}", 'valor': round(v)}
            for d, v in monthly.iloc[-36:].items()]
    return hist, out, base


def release_lifts(d: Data, listeners: pd.Series, season: dict):
    a = d.annotated('spotify_listeners')
    rel = a[a['Lançamentos'].notna()][['d', 'Lançamentos']]
    rows = []
    for _, row in rel.iterrows():
        t = row.d
        before = listeners[(listeners.index >= t - pd.Timedelta(days=7)) & (listeners.index < t)].mean()
        after = listeners[(listeners.index > t + pd.Timedelta(days=21)) & (listeners.index <= t + pd.Timedelta(days=35))].mean()
        if not (before > 0 and after > 0):
            continue
        raw = (after / before - 1) * 100
        m_after = (t + pd.Timedelta(days=28)).month
        adj = raw - (season[m_after] - season[t.month])
        nome = str(row['Lançamentos']).split(',')[0].strip()
        rows.append({'data': t.strftime('%Y-%m-%d'), 'nome': nome, 'bruto': r(raw), 'ajustado': r(adj),
                     'antes': round(before), 'depois': round(after)})
    df = pd.DataFrame(rows)
    # série INV (2021): agrupar como um único "projeto" para não poluir
    return df


def show_effect(d: Data, season: dict):
    ev = d.df('live_events')
    ev['dt'] = pd.to_datetime(ev['Data'], utc=True).dt.tz_localize(None)
    ev['impacto'] = ev['Impacto'].map(pct)
    ev['cap'] = ev['Capacidade'].map(num)
    ev = ev[(ev.dt.dt.year >= 2019) & (ev.impacto.abs() < 60)]  # 2018 = início da série (100% é artefato)
    festival_kw = r'festival|tour|lollapalooza|rock in rio|encontro|gpweek|sessions|coolritiba|turá|tura|coma'
    ev['tipo'] = np.where(ev['Evento'].str.lower().str.contains(festival_kw), 'Festival / turnê coletiva', 'Show próprio')
    ev['mes'] = ev.dt.dt.month
    ev['ajustado'] = ev.impacto - ev.mes.map(lambda m: season[(m % 12) + 1] - season[m])
    by = ev.groupby('tipo').agg(n=('impacto', 'size'), mediana=('ajustado', 'median'),
                                media=('ajustado', 'mean'), pos=('ajustado', lambda x: (x > 0).mean() * 100))
    events = [{'evento': e.Evento, 'local': e.Local, 'data': e.dt.strftime('%Y-%m-%d'),
               'capacidade': None if math.isnan(e.cap) else int(e.cap), 'impacto': r(e.impacto),
               'ajustado': r(e.ajustado), 'tipo': e.tipo} for e in ev.itertuples()]
    by_type = [{'tipo': k, 'n': int(v.n), 'mediana': r(v.mediana), 'media': r(v.media), 'positivos': r(v.pos, 0)}
               for k, v in by.iterrows()]
    return events, by_type


def city_show_cases(d: Data, cases: list):
    """Variação de ouvintes na cidade antes/depois de um show específico (série diária da Chartmetric)."""
    if not d.has('city_listener_evolution'):
        return []
    c = d.df('city_listener_evolution')
    c['d'] = c['Data'].map(pt_date)
    c = c.set_index('d').drop(columns='Data').sort_index()
    out = []
    for case in cases:
        col = case['coluna']
        if col not in c.columns:
            continue
        s = c[col].dropna()
        t = pd.Timestamp(case['data'])
        before = s[(s.index >= t - pd.Timedelta(days=7)) & (s.index < t)].mean()
        after_win = s[(s.index > t) & (s.index <= t + pd.Timedelta(days=30))]
        if after_win.empty or math.isnan(before):
            continue
        peak = after_win.max()
        lift = ((1 + peak / 100) / (1 + before / 100) - 1) * 100
        serie = s[(s.index >= t - pd.Timedelta(days=45)) & (s.index <= t + pd.Timedelta(days=60))]
        out.append({**case, 'antes': r(before), 'pico': r(peak), 'lift': r(lift),
                    'serie': [{'d': k.strftime('%Y-%m-%d'), 'v': r(v)} for k, v in serie.resample('3D').mean().dropna().items()]})
    return out


def cities(d: Data):
    c = d.df('cities_spotify')
    c.columns = ['cidade', 'pais', 'ouvintes', 'atualizado']
    c = c[c.pais == 'Brasil'].copy()
    c['pop'] = c.cidade.map(POPULACAO)
    c = c.dropna(subset=['pop'])
    c['por100k'] = c.ouvintes / c['pop'] * 1e5
    med = c.por100k.median()
    c['demanda_rel'] = c.por100k / med
    # afinidade (cities_audience_table) e tendência do YouTube
    aff = {}
    if d.has('cities_audience'):
        a = d.df('cities_audience')
        for _, row in a.iterrows():
            aff[str(row['Cidade'])] = pct(row['Afinidade'])
    yt = {}
    if d.has('youtube_cities_trend'):
        y = d.df('youtube_cities_trend')
        for _, row in y.iterrows():
            nome = str(row['Cidade']).split(' - ')[0]
            yt[nome] = {'m1': pct(row['Variação 1M (%)']), 'm3': pct(row['Variação 3M (%)']),
                        'views': row['Visualizações mensais']}
    rows = []
    for _, row in c.iterrows():
        nome = row.cidade
        bonito = NOME_BONITO.get(nome, nome)
        dr = row.demanda_rel
        if dr >= 1.5:
            faixa, acao = 'premium', 'Cobrar prêmio de 15–25% no cachê / ingresso'
        elif dr >= 1.0:
            faixa, acao = 'cheia', 'Tabela cheia — demanda acima da média'
        elif dr >= 0.6:
            faixa, acao = 'construcao', 'Praça em construção — festival ou casa menor'
        else:
            faixa, acao = 'abrir', 'Abrir mercado — abertura/festival, preço de entrada'
        ytinfo = yt.get(bonito) or yt.get(nome)
        rows.append({
            'cidade': bonito, 'ouvintes': int(row.ouvintes), 'populacao': int(row['pop']),
            'por100k': r(row.por100k, 0), 'demanda_rel': r(dr, 2), 'faixa': faixa, 'acao': acao,
            'afinidade': r(aff.get(nome), 1), 'yt_3m': r(ytinfo['m3']) if ytinfo else None,
            # público provável é calculado depois, em publico.aplicar() (modelo calibrado)
            'ingressos_min': None, 'ingressos_max': None,
            'coord': COORD.get(nome), 'atualizado': row.atualizado,
        })
    rows.sort(key=lambda x: -x['ouvintes'])
    return rows, r(med, 0)


def youtube_city_growth(d: Data):
    if not d.has('youtube_city_evolution'):
        return []
    y = d.df('youtube_city_evolution')
    last = y.dropna().iloc[-1]
    out = []
    for col in y.columns[1:]:
        out.append({'cidade': col.split(',')[0], 'var_12m': r(last[col])})
    return sorted(out, key=lambda x: -x['var_12m'])


def demographics(d: Data, key):
    if not d.has(key):
        return None
    df = d.df(key)
    idade = df[df.Categoria == 'Idade'].copy()
    idade['M'] = idade.Masculino.map(pct)
    idade['F'] = idade.Feminino.map(pct)
    faixas = [{'faixa': row.Grupo, 'M': r(row.M), 'F': r(row.F)} for row in idade.itertuples()]
    m, f = idade.M.sum(), idade.F.sum()
    tot = m + f
    top = max(faixas, key=lambda x: (x['M'] or 0) + (x['F'] or 0))
    cand = [(x['faixa'], 'M', x['M']) for x in faixas] + [(x['faixa'], 'F', x['F']) for x in faixas]
    seg = max(cand, key=lambda t: t[2] or 0)
    return {'faixas': faixas, 'masc': r(m / tot * 100), 'fem': r(f / tot * 100),
            'faixa_top': top['faixa'], 'segmento_top': {'faixa': seg[0], 'sexo': seg[1], 'pct': seg[2]}}


def platforms(d: Data):
    plats = [('Spotify', 'spotify_followers'), ('X / Twitter', 'x_followers'), ('YouTube', 'youtube_subscribers'),
             ('Last.fm', 'lastfm_listeners'), ('Deezer', 'deezer_fans'), ('Instagram', 'instagram_followers'),
             ('TikTok', 'tiktok_followers'), ('Twitch', 'twitch_followers')]
    out = []
    for nome, key in plats:
        if not d.has(key):
            continue
        s = d.series(key)
        out.append({'plataforma': nome, 'total': int(s.iloc[-1]), 'g12': r(growth(s, 365)), 'g24': r(growth(s, 730)),
                    'spark': [int(v) for v in s.resample('ME').last().iloc[-24:].values]})
    return out


def tracks(d: Data):
    def load(key):
        if not d.has(key):
            return None
        t = d.df(key)
        t.columns = ['id', 'nome', 'dia', 'v']
        return t
    st = load('tracks_streams')
    pl = load('tracks_playlist_count')
    reach = load('tracks_playlist_reach')
    yt = load('tracks_youtube')
    out = []
    for nome, g in st.groupby('nome'):
        g = g.sort_values('dia')
        last = g.v.iloc[-1]
        d30 = last - g[g.dia <= g.dia.max() - 30].v.iloc[-1]
        d90 = last - g[g.dia <= g.dia.max() - 90].v.iloc[-1]
        d365 = last - g[g.dia <= g.dia.max() - 365].v.iloc[-1] if g.dia.max() > 365 else None
        row = {'faixa': nome, 'streams': int(last), 'streams_30d': int(d30), 'streams_90d': int(d90),
               'streams_365d': int(d365) if d365 is not None else None, 'idade_anos': r(g.dia.max() / 365, 0)}
        for key, df in (('playlists', pl), ('alcance_playlists', reach), ('youtube', yt)):
            if df is not None:
                x = df[df.nome == nome].sort_values('dia')
                row[key] = int(x.v.iloc[-1]) if len(x) else None
        out.append(row)
    # Índice de força ao vivo: streams recentes (peso 0.5) + YouTube (0.3) + playlists (0.2), normalizado 0-100
    df = pd.DataFrame(out)
    for col in ('streams_90d', 'youtube', 'playlists'):
        df[col + '_n'] = df[col] / df[col].max() * 100
    df['forca'] = 0.5 * df.streams_90d_n + 0.3 * df.youtube_n + 0.2 * df.playlists_n
    df = df.sort_values('forca', ascending=False)
    return [{**{k: v for k, v in row.items() if not k.endswith('_n')}, 'forca': r(row['forca'], 0)}
            for row in df.to_dict('records')]


def sounds(d: Data):
    out = {'tiktok': [], 'instagram': []}
    if d.has('tiktok_sounds'):
        t = d.df('tiktok_sounds')
        for _, row in t.iterrows():
            if str(row['Artista']) == 'nan':
                continue
            v = num(str(row['Visualizações dos Principais Vídeos']).replace(',', '.'))
            prev = next((x for x in out['tiktok'] if x['som'] == row['Som']), None)
            if prev:
                prev['views'] += v; prev['videos'] += int(row['Total de vídeos'])
            else:
                out['tiktok'].append({'som': row['Som'], 'views': v, 'videos': int(row['Total de vídeos'])})
    if d.has('instagram_sounds'):
        t = d.df('instagram_sounds').dropna(subset=['Visualizações dos principais vídeos'])
        for _, row in t.head(12).iterrows():
            out['instagram'].append({'som': row['Som'], 'views': int(row['Visualizações dos principais vídeos']),
                                     'desde': row['Data da primeira publicação']})
    out['tiktok'].sort(key=lambda x: -x['views'])
    return out


def albums(d: Data):
    a = d.df('albums')
    a['ano'] = pd.to_datetime(a['Data de Lançamento'], errors='coerce').dt.year
    a = a[(a['Contagem de Faixas'] >= 5) & a['Popularidade do Spotify'].notna()]
    a = a.sort_values('Popularidade do Spotify', ascending=False).drop_duplicates('Título do Álbum')
    return [{'album': row['Título do Álbum'], 'ano': int(row.ano), 'popularidade': int(row['Popularidade do Spotify']),
             'alcance_playlists': None if math.isnan(row['Alcance de Listas de Reprodução do Spotify']) else int(row['Alcance de Listas de Reprodução do Spotify'])}
            for _, row in a.iterrows()]


def playlists(d: Data):
    p = d.df('playlist_evolution')
    p['dt'] = pd.to_datetime(p['Date'], format='%b %d, %Y', errors='coerce')
    p = p[p.iloc[:, 1].notna()].copy()
    for c in p.columns[1:7]:
        p[c] = p[c].map(num)
    p = p.set_index('dt').drop(columns=['Date'])
    mth = p.resample('ME').last().iloc[-36:]
    ev = [{'mes': f"{MES_NOME[k.month-1]}/{str(k.year)[2:]}", 'editoriais': int(v.iloc[0]), 'usuarios': int(v.iloc[1]),
           'algoritmicas': int(v.iloc[2]), 'alcance_editorial': int(v.iloc[3]), 'alcance_usuarios': int(v.iloc[4])}
          for k, v in mth.iloc[:, :6].iterrows()]
    last = ev[-1]
    yago = ev[-13] if len(ev) >= 13 else ev[0]
    total_reach = last['alcance_editorial'] + last['alcance_usuarios'] + int(mth.iloc[-1, 5])
    # desde quando o nº de editoriais está parado
    ed = p.iloc[:, 0].dropna().resample('ME').median()
    cur = ed.iloc[-1]
    fora = ed[(ed - cur).abs() > 2]
    parado_desde = None
    if len(fora):
        desde = ed.index[ed.index > fora.index[-1]][0]
        if (ed.index[-1] - desde).days > 180:
            parado_desde = f"{MES_NOME[desde.month-1]}/{desde.year}"
    resumo = {'editoriais': last['editoriais'], 'usuarios': last['usuarios'],
              'usuarios_g12': r((last['usuarios'] / yago['usuarios'] - 1) * 100),
              'editoriais_g12': r((last['editoriais'] / yago['editoriais'] - 1) * 100),
              'dependencia_editorial': r(last['alcance_editorial'] / total_reach * 100),
              'editoriais_parado_desde': parado_desde}
    recs = []
    if d.has('playlist_recommendations'):
        rr = d.df('playlist_recommendations')
        rr['seg'] = rr['Seguidores'].map(num)
        rr = rr.sort_values('seg', ascending=False).head(8)
        recs = [{'playlist': row['Lista de Reprodução'], 'curador': row['Curador'], 'seguidores': int(row.seg),
                 'base': row['Artista'], 'url': row['URL da Lista de Reprodução do Spotify']} for _, row in rr.iterrows()]
    return ev, resumo, recs


def comments(d: Data):
    if not d.has('youtube_comments'):
        return None
    c = d.df('youtube_comments')
    txt = c.iloc[:, 0].astype(str).str.lower()
    temas = {
        'Nostalgia / "que saudade dessa época"': r'saudade|época|epoca|adolesc|infância|infancia|voltar no tempo|anos 2000|nostalg|lembr',
        '"Quem ainda ouve em 20XX?"': r'202[0-9]|201[0-9]|alguém em|alguem em|quem ainda|ainda ouv|ainda escut',
        'Cena emo / identidade': r'\bemo\b|franja|restart|nx zero|nxzero|orkut|mtv|colorid',
        'Emoção / choro': r'chor|lágrima|lagrima|arrepi|emocion',
        'Pessoas (irmão, ex, amigos)': r'namorad|\bex\b|irmã|irmao|irmão|mãe|\bpai\b|amig|filh',
        'Show / ao vivo': r'show|ao vivo|turnê|turne|assisti',
    }
    out = [{'tema': k, 'pct': r(txt.str.contains(v).mean() * 100, 0)} for k, v in temas.items()]
    top = c.sort_values('Curtidas', ascending=False).head(4)
    def cut(t, n=240):
        t = re.sub('<[^>]+>', '', str(t)).strip()
        return t if len(t) <= n else t[:n].rsplit(' ', 1)[0] + '…'
    quotes = [{'texto': cut(row.iloc[0]), 'curtidas': int(row['Curtidas'])} for _, row in top.iterrows()]
    return {'n': len(c), 'temas': sorted(out, key=lambda x: -x['pct']), 'destaques': quotes}


def peers(d: Data, me: str):
    s = d.df('similar_artists')
    cols = s.columns.tolist()
    out = []
    for _, row in s.iterrows():
        ml = num(row['Ouvintes Mensais'])
        fol = num(row['Seguidores'])
        out.append({'artista': row['Artista'], 'similaridade': pct(row['Similaridade']), 'ouvintes': int(ml),
                    'seguidores': int(fol), 'lealdade': r(fol / ml * 100, 0) if ml else None,
                    'estagio': row['Estágio de Carreira'], 'momento': row['Impulso Recente'],
                    'tiktok': None if math.isnan(num(row[cols[13]])) else int(num(row[cols[13]]))})
    return out


def co_performers(d: Data):
    if not d.has('co_performing'):
        return []
    c = d.df('co_performing').head(8)
    return [{'artista': row['Artista'], 'eventos': int(row['Eventos Compartilhados']),
             'ultimo': str(row['Último Evento Compartilhado'])} for _, row in c.iterrows()]


def brands(d: Data):
    if not d.has('brand_affinity'):
        return []
    b = d.df('brand_affinity').sort_values('Afinidade', ascending=False)
    seen, out = set(), []
    for _, row in b.iterrows():
        nome = row['Marca'].split('|')[0].strip()
        if nome in seen:
            continue
        seen.add(nome)
        out.append({'marca': nome, 'categoria': row['Categoria'], 'afinidade': r(row['Afinidade'], 2),
                    'match': r(row['Correspondência de Público'], 0)})
    return out


def playlist_highlight(d: Data):
    if not d.has('milestones_spotify'):
        return None
    m = d.df('milestones_spotify')
    m['d'] = m['Recência'].map(pt_date)
    for _, row in m.sort_values('d', ascending=False).iterrows():
        mt = re.search(r"agora é (\d+)(?:st|nd|rd|th) na playlist (.+?) de Spotify\s+\((\w+) \| ([\d.,]+K?) seguidores", str(row['Marco']))
        if mt and int(mt.group(1)) <= 5:
            return {'posicao': int(mt.group(1)), 'playlist': mt.group(2).strip(), 'tipo': mt.group(3),
                    'seguidores': mt.group(4), 'faixa': row['Título'], 'data': row.d.strftime('%Y-%m-%d')}
    return None


def milestones(d: Data):
    if not d.has('milestones_spotify'):
        return []
    m = d.df('milestones_spotify')
    m['d'] = m['Recência'].map(pt_date)
    m = m.sort_values('d', ascending=False).head(6)
    return [{'data': row.d.strftime('%Y-%m-%d'), 'marco': row['Marco']} for _, row in m.iterrows()]


# ----------------------------------------------------------------------------- índices

def logistic(x, k=0.15):
    return 100 / (1 + math.exp(-k * x))


def build(slug: str):
    cfg = json.loads((ROOT / 'artists' / slug / 'config.json').read_text(encoding='utf-8'))
    d = Data(slug)

    listeners = d.series('spotify_listeners')
    followers = d.series('spotify_followers')
    conv = d.series('spotify_fan_conversion')
    season, season_years = seasonality(listeners)
    hist, fc, base = forecast(listeners, season)
    lifts = release_lifts(d, listeners, season)
    events, by_type = show_effect(d, season)
    city_cases = city_show_cases(d, cfg.get('casos_show_cidade', []))
    city_rows, med_100k = cities(d)
    yt_growth = youtube_city_growth(d)
    plats = platforms(d)
    trk = tracks(d)
    snd = sounds(d)
    alb = albums(d)
    pl_ev, pl_res, pl_recs = playlists(d)
    com = comments(d)
    prs = peers(d, cfg['nome'])
    cop = co_performers(d)
    brd = brands(d)
    mil = milestones(d)
    demo = {k: demographics(d, f'demo_{k}') for k in ('streaming', 'tiktok', 'instagram', 'social', 'youtube')}

    tiktok_sound = d.series('tiktok_sound_videos') if d.has('tiktok_sound_videos') else None
    rank = d.series('chartmetric_rank') if d.has('chartmetric_rank') else None

    # ---- KPIs
    ml_now = listeners.iloc[-1]
    ml_12 = growth(listeners.rolling(28).mean().dropna(), 365)
    lealdade = followers.iloc[-1] / ml_now * 100
    total_fans = sum(p['total'] for p in plats)

    # ---- Índices (0-100)
    me = next((p for p in prs if p['artista'] == cfg['nome']), None)
    peer_loyal = [p['lealdade'] for p in prs if p['artista'] != cfg['nome'] and p['lealdade']]
    loyal_pct = (np.array(peer_loyal) < lealdade).mean() * 100
    idx_lealdade = clamp(0.6 * loyal_pct + 0.4 * clamp(lealdade / 1.5))

    cap = lambda x: max(-30, min(30, x or 0))
    g_ml = growth(listeners.rolling(28).mean().dropna(), 365) or 0
    g_tt = next((p['g12'] for p in plats if p['plataforma'] == 'TikTok'), 0) or 0
    g_ig = next((p['g12'] for p in plats if p['plataforma'] == 'Instagram'), 0) or 0
    g_snd = growth(tiktok_sound, 365) if tiktok_sound is not None else 0
    g_rank = -(growth(rank.rolling(28).mean().dropna(), 365) or 0) if rank is not None else 0  # ranking menor = melhor
    momentum_raw = 0.35 * cap(g_ml) + 0.2 * cap(g_tt) + 0.15 * cap(g_ig) + 0.15 * cap(g_snd) + 0.15 * cap(g_rank)
    idx_momentum = clamp(logistic(momentum_raw, 0.08))

    old = [a['popularidade'] for a in alb if a['ano'] <= pd.Timestamp.now().year - 10]
    new = max((a['popularidade'] for a in alb if a['ano'] >= pd.Timestamp.now().year - 2), default=None)
    idx_catalogo = clamp(np.mean(sorted(old, reverse=True)[:4]) / (new or max(old)) * 100) if old else None

    viral_views = sum(s['views'] for s in snd['instagram'][:10]) + sum(s['views'] for s in snd['tiktok'][:10])
    idx_viral = clamp(logistic(min(g_snd or 0, 60) * 0.5 + cap(g_tt) * 0.5, 0.05))

    indices = [
        {'chave': 'lealdade', 'nome': 'Lealdade da Base', 'valor': r(idx_lealdade, 0),
         'frase': f"{r(lealdade,0):.0f} seguidores para cada 100 ouvintes no Spotify",
         'explica': 'Seguidores ÷ ouvintes mensais, comparado com os 30 artistas mais parecidos. Alto = gente que escolheu seguir, não só ouviu por playlist.'},
        {'chave': 'momentum', 'nome': 'Momentum', 'valor': r(idx_momentum, 0),
         'frase': f"Ouvintes {g_ml:+.0f}% · TikTok {g_tt:+.0f}% · ranking {g_rank:+.0f}% em 12 meses",
         'explica': 'Crescimento em 12 meses de ouvintes (35%), TikTok (20%), Instagram (15%), vídeos usando o som (15%) e ranking Chartmetric (15%), cada um limitado a ±30%. 50 = estável.'},
        {'chave': 'catalogo', 'nome': 'Força do Catálogo', 'valor': r(idx_catalogo, 0),
         'frase': 'Discos com 10+ anos ainda rendem quase como o lançamento',
         'explica': 'Popularidade Spotify média dos 4 melhores álbuns com 10+ anos ÷ popularidade do álbum mais recente.'},
        {'chave': 'viral', 'nome': 'Potencial Viral', 'valor': r(idx_viral, 0),
         'frase': f"Vídeos usando o som {g_snd:+.0f}% em 12 meses · {viral_views/1e6:.1f} mi de views nos principais".replace('.', ','),
         'explica': 'Crescimento em 12 meses de vídeos que usam o som no TikTok (50%, teto de 60%) e de seguidores no TikTok (50%). 50 = estável.'},
    ]

    # ---- leituras que alimentam as recomendações
    best_months = sorted(season.items(), key=lambda x: -x[1])[:3]
    worst_months = sorted(season.items(), key=lambda x: x[1])[:3]
    lifts_df = lifts[~lifts.nome.str.startswith('INV0')] if len(lifts) else lifts
    lifts_list = lifts_df.sort_values('data').to_dict('records') if len(lifts_df) else []
    inv = lifts[lifts.nome.str.startswith('INV0')] if len(lifts) else lifts
    inv_first = inv.iloc[0].ajustado if len(inv) else None
    inv_last = inv.iloc[-1].ajustado if len(inv) else None

    out = {
        'meta': {'artista': cfg['nome'], 'slug': slug, 'gerado_em': pd.Timestamp.now().strftime('%Y-%m-%d'),
                 'dados_ate': listeners.index[-1].strftime('%Y-%m-%d'),
                 'desde': listeners.index[0].strftime('%Y-%m-%d'), 'fonte': 'Chartmetric (exports CSV)',
                 'arquivos': len(list(d.dir.glob('*.csv')))},
        'kpis': {'ouvintes': int(ml_now), 'ouvintes_g12': r(ml_12), 'seguidores_spotify': int(followers.iloc[-1]),
                 'lealdade': r(lealdade, 0), 'fas_total': int(total_fans),
                 'conversao_spotify': r(conv.iloc[-1], 0)},
        'indices': indices,
        'sazonalidade': [{'mes': MES_NOME[m - 1], 'idx': season[m]} for m in range(1, 13)],
        'sazonalidade_anos': f"{season_years[0]}–{season_years[-1]}",
        'melhores_meses': [MES_NOME[m - 1] for m, _ in best_months],
        'piores_meses': [MES_NOME[m - 1] for m, _ in worst_months],
        'historico': hist, 'previsao': fc, 'base_dessazonalizada': round(base),
        'lancamentos': lifts_list,
        'serie_inv': {'n': int(len(inv)), 'primeiro': r(inv_first), 'ultimo': r(inv_last),
                      'lista': [{'nome': x.nome.split(':')[0], 'ajustado': x.ajustado} for x in inv.itertuples()] if len(inv) else []},
        'shows': {'eventos': events, 'por_tipo': by_type, 'casos_cidade': city_cases},
        'cidades': city_rows, 'cidades_mediana_100k': med_100k, 'youtube_cidades_12m': yt_growth,
        'plataformas': plats,
        'faixas': trk, 'sons': snd, 'albuns': alb[:10],
        'playlists': {'evolucao': pl_ev, 'resumo': pl_res, 'recomendadas': pl_recs},
        'publico': demo, 'comentarios': com,
        'pares': prs, 'co_palco': cop, 'marcas': brd, 'marcos': mil, 'destaque_playlist': playlist_highlight(d),
        'contexto': cfg.get('contexto', {}),
        'qualidade': cfg.get('qualidade_dados', []),
    }
    publico.aplicar(out, cfg)  # público provável por praça, calibrado nas âncoras do config
    out['recomendacoes'] = recommendations(out, cfg)
    return out, cfg


# ----------------------------------------------------------------------------- recomendações

def fmt(n):
    return f"{n:,.0f}".replace(',', '.')


def br(x, d=1, signed=False):
    s = f"{x:+.{d}f}" if signed else f"{x:.{d}f}"
    return s.replace('.', ',').replace('-', '−')


def recommendations(o, cfg):
    recs = []
    cid = o['cidades']
    premium = [c for c in cid if c['faixa'] == 'premium']
    top_prem = sorted(premium, key=lambda c: -c['demanda_rel'])[:3]
    sp = next((c for c in cid if c['cidade'] == 'São Paulo'), None)
    if top_prem:
        nomes = ', '.join(c['cidade'] for c in top_prem)
        best = top_prem[0]
        recs.append({
            'area': 'Cachê & Turnê', 'icone': 'ticket',
            'titulo': f"Peça cachê 15–25% acima da tabela em {nomes}",
            'porque': (f"Em {best['cidade']} há {fmt(best['por100k'])} ouvintes a cada 100 mil habitantes — "
                       f"{br(best['demanda_rel'])}x a mediana das {len(cid)} maiores praças"
                       + (f" e {br(best['por100k']/sp['por100k'])}x São Paulo" if sp else '') + ". "
                       "Demanda concentrada é o melhor argumento de negociação: o contratante vende ingresso com menos mídia."),
            'acao': 'Use o card de cada cidade como anexo da proposta para o contratante.',
            'impacto': 'Receita de show',
        })
    # show coletivo vs próprio
    bt = {b['tipo']: b for b in o['shows']['por_tipo']}
    fest, prop = bt.get('Festival / turnê coletiva'), bt.get('Show próprio')
    if fest and prop:
        recs.append({
            'area': 'Shows', 'icone': 'mic',
            'titulo': 'Festivais e turnês coletivas rendem mais Spotify que show próprio',
            'porque': (f"Na mediana, depois de festival/turnê coletiva os ouvintes mudam {br(fest['mediana'], 1, True)}% "
                       f"(já descontada a sazonalidade) contra {br(prop['mediana'], 1, True)}% em show próprio. "
                       "Palco dividido coloca a banda na frente de quem ainda não é fã."),
            'acao': 'Priorize 2–3 festivais/line-ups de nostalgia por semestre; use show próprio para monetizar a base.',
            'impacto': 'Novos ouvintes',
        })
    cc = o['shows']['casos_cidade']
    if cc:
        c0 = max(cc, key=lambda x: x['lift'])
        recs.append({
            'area': 'Shows', 'icone': 'pin',
            'titulo': f"{c0['titulo']}: +{c0['lift']:.0f}% de ouvintes na cidade",
            'porque': (f"Após {c0['descricao']}, os ouvintes em {NOME_BONITO.get(c0['coluna'], c0['coluna'])} subiram {c0['lift']:.0f}% em até 30 dias. "
                       "Show grande na cidade certa funciona como campanha de mídia."),
            'acao': 'Repita o formato (gratuito/patrocinado ou de grande porte) em 1 praça-chave por ano, com marca parceira pagando a conta.',
            'impacto': 'Base local',
        })
    # lançamento
    melhores = ', '.join(o['melhores_meses'])
    piores = ', '.join(o['piores_meses'])
    lif = o['lancamentos']
    recent = [l for l in lif if l['data'] >= '2023-01-01']
    best_rel = max(recent, key=lambda x: x['ajustado']) if recent else None
    recs.append({
        'area': 'Lançamentos', 'icone': 'disc',
        'titulo': f"Próximo lançamento grande: entre o fim de julho e agosto",
        'porque': (f"Historicamente {melhores} são os meses mais fortes (até {max(x['idx'] for x in o['sazonalidade']):+.0f}% acima da média) "
                   f"e {piores} os mais fracos. Lançar em julho/agosto pega a subida natural do público."
                   + (f" O melhor resultado recente foi '{best_rel['nome']}' ({best_rel['ajustado']:+.0f}% em 1 mês, já sem efeito sazonal)." if best_rel else '')),
        'acao': 'Em dez–mar, segure inéditas: trabalhe catálogo, ao vivo e bastidores.',
        'impacto': 'Streams',
    })
    si = o['serie_inv']
    if si['n'] >= 5:
        recs.append({
            'area': 'Lançamentos', 'icone': 'layers',
            'titulo': 'Lançar em capítulos funciona — mas até o 3º capítulo',
            'porque': (f"Na série de {si['n']} singles semanais de 2021 o efeito caiu de {si['primeiro']:+.0f}% no primeiro para "
                       f"{si['ultimo']:+.0f}% no último. Já o álbum em 2 partes (2024) manteve picos de dois dígitos."),
            'acao': 'Divida o próximo disco em no máximo 2–3 partes, com 6–10 semanas entre elas.',
            'impacto': 'Streams',
        })
    # público
    st, tt = o['publico'].get('streaming'), o['publico'].get('tiktok')
    if st and tt:
        recs.append({
            'area': 'Conteúdo', 'icone': 'users',
            'titulo': 'Existem duas Fresnos: quem ouve não é quem assiste',
            'porque': (f"No streaming o público é {st['masc']:.0f}% masculino e concentrado em {st['faixa_top']} anos. "
                       f"No TikTok, {tt['segmento_top']['pct']:.0f}% são mulheres de {tt['segmento_top']['faixa']}. "
                       "Conteúdo de vídeo atrai uma geração nova que ainda não virou ouvinte recorrente."),
            'acao': 'TikTok/Reels: faixas novas + bastidor para a geração 18–24. Produtos premium e ingressos VIP: o público 25–34 de streaming.',
            'impacto': 'Conversão de fãs',
        })
    com = o['comentarios']
    if com:
        nost = next((t for t in com['temas'] if t['tema'].startswith('Nostalgia')), None)
        recs.append({
            'area': 'Produtos', 'icone': 'bag',
            'titulo': 'A nostalgia é o produto: aniversários de disco valem dinheiro',
            'porque': (f"{nost['pct']:.0f}% dos comentários mais curtidos no YouTube falam de saudade/época. "
                       + cfg.get('contexto', {}).get('prova_nostalgia', '')),
            'acao': 'Monte calendário de edições comemorativas (vinil, show do disco na íntegra, coleção cápsula) para os próximos aniversários.',
            'impacto': 'Merch & ingresso premium',
        })
    pr = o['playlists']['resumo']
    if pr['editoriais_parado_desde']:
        recs.append({
            'area': 'Playlists', 'icone': 'list',
            'titulo': f"Playlists editoriais pararam em {pr['editoriais']} — os fãs não",
            'porque': (f"O número de playlists editoriais do Spotify está parado em torno de {pr['editoriais']} desde {pr['editoriais_parado_desde']}, mesmo com disco novo, "
                       f"enquanto as playlists criadas por fãs cresceram {pr['usuarios_g12']:+.0f}% em 12 meses "
                       f"({fmt(pr['usuarios'])} hoje). Só {pr['dependencia_editorial']:.0f}% do alcance depende de editoriais: base sólida, teto baixo."),
            'acao': 'Pitch editorial a cada lançamento (rock, nostalgia, "emo") + ativar fãs curadores com maior alcance.',
            'impacto': 'Descoberta',
        })
    plats = {p['plataforma']: p for p in o['plataformas']}
    if 'X / Twitter' in plats and plats['X / Twitter']['g12'] < -10:
        recs.append({
            'area': 'Conteúdo', 'icone': 'trend',
            'titulo': 'Mova esforço do X para TikTok e Instagram',
            'porque': (f"O X perdeu {abs(plats['X / Twitter']['g12']):.0f}% dos seguidores em 12 meses, enquanto TikTok "
                       f"cresceu {plats['TikTok']['g12']:+.0f}% e Instagram {plats['Instagram']['g12']:+.0f}%."),
            'acao': 'X vira canal de aviso; criação de conteúdo vai para vídeo curto.',
            'impacto': 'Alcance',
        })
    marcas = o['marcas']
    if marcas:
        bev = [b for b in marcas if 'drink' in b['categoria'].lower()][:3]
        if bev:
            recs.append({
                'area': 'Parcerias', 'icone': 'spark',
                'titulo': f"Marcas com fit comprovado: {', '.join(b['marca'] for b in bev)}",
                'porque': (f"O público da banda segue essas marcas {br(bev[0]['afinidade'])}x mais que a média do Instagram, "
                           f"com {bev[0]['match']:.0f}% de correspondência de perfil. É argumento pronto para patrocínio de turnê."),
                'acao': 'Leve o recorte de público (idade, gênero, cidades) para a conversa com a marca.',
                'impacto': 'Patrocínio',
            })
    return recs
