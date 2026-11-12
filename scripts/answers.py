"""
Gera o catálogo de perguntas e respostas pré-prontas do "sistema" (v2) a partir
dos números calculados por analytics.py. Na demo, a interface simula o raciocínio
e mostra estas respostas; na versão com API, uma LLM gera respostas novas usando
o mesmo formato.

    python3 scripts/answers.py fresno     ->  artists/fresno/respostas.json

Regra: nenhum número é digitado aqui. Tudo vem de `data` (saída do analytics).
O texto editorial só costura os números.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from analytics import ROOT, build  # noqa: E402

# Fontes que acendem na "mesa de cruzamento" enquanto o sistema "pensa"
FONTES = {
    'ouvintes': {'nome': 'Ouvintes mensais (Spotify)', 'curto': 'Ouvint.'},
    'seguidores': {'nome': 'Seguidores (8 plataformas)', 'curto': 'Seguid.'},
    'cidades': {'nome': 'Ouvintes por cidade', 'curto': 'Cidades'},
    'ibge': {'nome': 'População IBGE 2022', 'curto': 'IBGE'},
    'cidade_diaria': {'nome': 'Ouvintes por cidade, dia a dia', 'curto': 'Cid/dia'},
    'youtube_cidades': {'nome': 'YouTube por cidade', 'curto': 'YT cid.'},
    'shows': {'nome': 'Agenda de shows', 'curto': 'Shows'},
    'lancamentos': {'nome': 'Histórico de lançamentos', 'curto': 'Lançam.'},
    'faixas': {'nome': 'Desempenho por faixa', 'curto': 'Faixas'},
    'albuns': {'nome': 'Discografia', 'curto': 'Discos'},
    'sons': {'nome': 'Sons no TikTok e Reels', 'curto': 'Sons'},
    'playlists': {'nome': 'Playlists do Spotify', 'curto': 'Playlist'},
    'demografia': {'nome': 'Idade e gênero por plataforma', 'curto': 'Público'},
    'comentarios': {'nome': 'Comentários do YouTube', 'curto': 'Coment.'},
    'marcas': {'nome': 'Afinidade de marcas', 'curto': 'Marcas'},
    'pares': {'nome': 'Artistas semelhantes', 'curto': 'Pares'},
    'co_palco': {'nome': 'Artistas que dividiram palco', 'curto': 'Palco'},
    'imprensa': {'nome': 'Notícias de 2026', 'curto': 'Imprensa'},
}


def br(x, d=1, signed=False):
    if x is None:
        return '–'
    s = f"{x:+.{d}f}" if signed else f"{x:.{d}f}"
    return s.replace('.', ',').replace('-', '−')


def n(x):
    return f"{x:,.0f}".replace(',', '.')


def short(x):
    if x >= 1e6:
        return br(x / 1e6, 1) + ' mi'
    if x >= 1e3:
        return br(x / 1e3, 0 if x >= 1e5 else 1) + ' mil'
    return n(x)


def step(texto, fontes, ms=700):
    return {'texto': texto, 'fontes': fontes, 'ms': ms}


def build_answers(d):
    A = []
    cid = d['cidades']
    nome = d['meta']['artista']
    premium = sorted([c for c in cid if c['faixa'] == 'premium'], key=lambda c: -c['demanda_rel'])
    sp = next((c for c in cid if c['cidade'] == 'São Paulo'), None)
    ytc = {c['cidade'].replace('Sao Paulo', 'São Paulo'): c for c in cid}
    med = d['cidades_mediana_100k']

    # ---------------------------------------------------------------- cachê & turnê
    p0 = premium[0]
    A.append({
        'id': 'onde-cobrar-mais', 'tema': 'cache', 'destaque': True,
        'pergunta': 'Onde eu posso cobrar mais cachê?',
        'variacoes': ['cachê', 'cobrar mais', 'preço do show', 'valor do show', 'onde cobrar', 'aumentar cachê'],
        'pensando': [
            step(f"Lendo ouvintes de {len(cid)} cidades", ['cidades']),
            step('Dividindo pela população de cada cidade (IBGE)', ['cidades', 'ibge']),
            step(f"Comparando com a mediana: {n(med)} fãs por 100 mil habitantes", ['cidades', 'ibge']),
            step('Separando as praças em 4 faixas de cachê', ['cidades']),
        ],
        'veredito': f"Peça de 15% a 25% acima da tabela em {', '.join(c['cidade'] for c in premium[:3])}.",
        'explicacao': (f"Em {p0['cidade']} há {n(p0['por100k'])} ouvintes a cada 100 mil habitantes, "
                       f"{br(p0['demanda_rel'])}x a mediana das praças"
                       + (f" e {br(p0['por100k']/sp['por100k'])}x São Paulo" if sp else '') +
                       ". Muita gente fã por habitante significa ingresso vendido com menos mídia, e isso é argumento de negociação."),
        'numeros': [{'valor': br(c['demanda_rel']) + 'x', 'rotulo': f"{c['cidade']} vs mediana"} for c in premium[:3]],
        'blocos': [
            {'tipo': 'mapa', 'dados': 'cidades', 'titulo': 'Fãs por habitante'},
            {'tipo': 'tabela', 'dados': 'cidades', 'colunas': ['cidade', 'por100k', 'demanda_rel', 'faixa', 'publico', 'conv_pct'],
             'filtro': {'faixa': ['premium']}, 'titulo': 'Praças com prêmio de cachê'},
        ],
        'acoes': ['Anexe o card da cidade na proposta para o contratante.',
                  'Peça casa maior antes de pedir cachê maior: lotar vale mais que preço.',
                  'Use a calculadora de ingressos para dimensionar a casa.'],
        'confianca': {'nivel': 'média', 'motivo': 'Ouvintes por cidade são de um snapshot de 2024; a ordem das praças muda pouco, os números exatos mudam.'},
        'seguintes': ['proxima-cidade', 'quantos-ingressos', 'show-da-retorno'],
    })

    # próxima cidade: densidade boa + YouTube subindo, ou volume grande com densidade baixa
    rising = [c for c in cid if c.get('yt_3m') is not None and c['yt_3m'] > 0]
    volume = sorted([c for c in cid if c['faixa'] in ('construcao', 'cheia') and c['ouvintes'] > 9000], key=lambda c: -c['ouvintes'])[:3]
    alvo = rising[0] if rising else premium[0]
    A.append({
        'id': 'proxima-cidade', 'tema': 'cache',
        'pergunta': 'Qual a próxima cidade para tocar?',
        'variacoes': ['próxima cidade', 'onde tocar', 'turnê', 'roteiro', 'nova praça', 'cidade nova'],
        'pensando': [
            step('Procurando cidades com público crescendo agora', ['youtube_cidades']),
            step('Cruzando com fãs por habitante', ['cidades', 'ibge']),
            step('Separando praça para show próprio de praça para festival', ['cidades', 'shows']),
        ],
        'veredito': f"{alvo['cidade']} para show próprio; {', '.join(c['cidade'] for c in volume)} via festival.",
        'explicacao': (f"{alvo['cidade']} é a única grande praça com visualizações no YouTube subindo nos últimos 3 meses "
                       f"({br(alvo['yt_3m'],0,True)}%) e tem {br(alvo['demanda_rel'])}x a densidade de fãs da mediana. "
                       f"{', '.join(c['cidade'] for c in volume)} têm muito ouvinte em número absoluto, mas pouco por habitante: "
                       "entrar por festival ou line-up dividido reduz o risco."),
        'numeros': [{'valor': br(alvo['yt_3m'], 0, True) + '%', 'rotulo': f"YouTube em {alvo['cidade']} (3 meses)"},
                    {'valor': br(alvo['demanda_rel']) + 'x', 'rotulo': 'densidade vs mediana'}],
        'blocos': [{'tipo': 'barras', 'dados': 'cidades', 'campo': 'yt_3m', 'titulo': 'Variação de views no YouTube em 3 meses, por cidade'},
                   {'tipo': 'mapa', 'dados': 'cidades', 'destacar': [alvo['cidade']] + [c['cidade'] for c in volume]}],
        'acoes': [f"Teste demanda em {alvo['cidade']} com anúncio local de \"show em breve\" antes de fechar casa.",
                  'Monte rota regional para dividir o custo de viagem.'],
        'confianca': {'nivel': 'média', 'motivo': 'Tendência de YouTube é de 3 meses; confirmar com venda de ingresso anterior na cidade.'},
        'seguintes': ['quantos-ingressos', 'festival-ou-proprio'],
    })

    pp = d['publico_praca']
    mod = pp['modelo']
    val = mod.get('validacao') or {}
    com_casa = sorted([c for c in cid if c.get('chance_esgotar') is not None], key=lambda c: -c['publico'])
    crescer = [c for c in com_casa if c['folga'] and c['folga'] >= pp['limiares']['crescer']
               and (c['ancora'] or {}).get('capacidade', 0) >= 500]
    melhor = com_casa[0] if com_casa else cid[0]
    alvo = crescer[0] if crescer else melhor
    A.append({
        'id': 'quantos-ingressos', 'tema': 'cache', 'simulador': 'ingressos',
        'pergunta': 'Quantos ingressos dá pra vender numa cidade?',
        'variacoes': ['ingressos', 'lotar', 'tamanho da casa', 'capacidade', 'vender ingresso', 'casa de show',
                      'casa maior', 'segunda data', 'esgotar', 'bilheteria'],
        'pensando': [
            step('Pegando os ouvintes da cidade e corrigindo o snapshot para hoje', ['cidades', 'ouvintes']),
            step(f"Virando base de fãs: {d['kpis']['lealdade']:.0f} seguidores a cada 100 ouvintes", ['cidades', 'seguidores']),
            step(f"Lendo a agenda própria da banda: {mod['n_provas']} shows desde 2024", ['shows', 'imprensa']),
            step(f"Ajustando a regressão nos {mod['n_shows']} shows com capacidade de casa conhecida", ['shows', 'cidades']),
            step(f"Testando o modelo: tira um show, tenta prever ele — erro mediano de {val.get('erro_mediano_pct','–')}%",
                 ['shows', 'imprensa']),
            step('Projetando público, chance de esgotar e bilheteria', ['cidades', 'ibge']),
        ],
        'veredito': (f"{melhor['cidade']}: {n(melhor['publico'])} pessoas é o cenário mais provável, "
                     f"{melhor['chance_esgotar']}% de chance de esgotar a casa que a banda usou lá"
                     + (f". Em {alvo['cidade']}, a previsão já passa da casa usada." if crescer else '.')),
        'explicacao': (f"A conta não é uma taxa de conversão escolhida a dedo nem uma média. É uma regressão sobre os shows "
                       f"próprios da banda, com o público crescendo com a base de fãs da praça elevada a "
                       f"{br(mod['beta'][1],2)} — menor que 1, ou seja, praça grande converte uma fatia menor. "
                       f"Show esgotado entra como piso e não como teto, porque lotar diz que a banda venderia pelo menos "
                       f"aquilo. Testado show a show, o modelo erra {val.get('erro_mediano_pct','–')}% na mediana e "
                       f"{val.get('erro_medio_pct','–')}% na média — é a margem com que esses números devem ser lidos."),
        'numeros': [{'valor': n(c['publico']), 'rotulo': f"{c['cidade']} · {c['chance_esgotar']}% de esgotar"} for c in com_casa[:3]],
        'blocos': [{'tipo': 'simulador', 'simulador': 'ingressos', 'dados': 'cidades'},
                   {'tipo': 'tabela', 'dados': 'cidades',
                    'colunas': ['cidade', 'base_fa', 'publico_min', 'publico', 'publico_max', 'confianca', 'bilheteria', 'veredito_casa'],
                    'titulo': 'Público provável por praça'},
                   {'tipo': 'tabela', 'dados': 'publico_praca.modelo.validacao.linhas',
                    'colunas': ['cidade', 'local', 'data', 'real', 'previsto', 'erro_pct'],
                    'titulo': 'O quanto o modelo erra, show a show'}],
        'acoes': ([f"Em {', '.join(c['cidade'] for c in crescer[:3])}, a previsão passa da casa usada: peça casa maior ou uma segunda data."]
                  if crescer else []) +
                 ['Prefira a casa que lota no limite de baixo da faixa: casa cheia vira conteúdo e escassez.',
                  'Anote capacidade e ocupação de cada show em config.json → calibracao.ancoras: a regressão se refaz sozinha.'],
        'confianca': {'nivel': 'média',
                      'motivo': (f"Regressão sobre {mod['n_shows']} shows próprios com capacidade de casa conhecida, de "
                                 f"{mod['n_provas']} na agenda. Na validação show a show o erro mediano é de "
                                 f"{val.get('erro_mediano_pct','–')}% e o pior caso foi {val.get('erro_maximo_pct','–')}%. "
                                 f"Capacidade de casa quase nunca é publicada no Brasil e a ocupação é presumida quando a "
                                 f"fonte não diz: com bilheteria oficial, a margem cai.")},
        'seguintes': ['onde-cobrar-mais', 'proxima-cidade'],
    })

    # ---------------------------------------------------------------- shows
    cases = sorted(d['shows']['casos_cidade'], key=lambda c: -c['lift'])
    c0 = cases[0]
    A.append({
        'id': 'show-da-retorno', 'tema': 'shows', 'destaque': True,
        'pergunta': 'Show grande dá retorno no streaming?',
        'variacoes': ['show aumenta', 'show grande', 'depois do show', 'efeito do show', 'show gratuito', 'aumento no spotify'],
        'pensando': [
            step('Abrindo a série diária de ouvintes de 5 cidades', ['cidade_diaria']),
            step('Marcando as datas dos shows de 2026', ['shows', 'imprensa']),
            step('Medindo antes × 30 dias depois de cada show', ['cidade_diaria', 'shows']),
        ],
        'veredito': f"Sim: {c0['titulo'].split(',')[-1].strip()} ganhou {br(c0['lift'],0)}% de ouvintes depois do show na {c0['titulo'].split(',')[0].strip()}.",
        'explicacao': (f"Após {c0['descricao']}, os ouvintes em {c0['titulo'].split(',')[-1].strip()} foram de {br(c0['antes'],0,True)}% "
                       f"para {br(c0['pico'],0,True)}% em relação a nov/2025. Show grande na cidade certa funciona como campanha de mídia."),
        'numeros': [{'valor': br(c['lift'], 0, True) + '%', 'rotulo': c['titulo']} for c in cases],
        'blocos': [{'tipo': 'casos_show', 'dados': 'shows.casos_cidade'}],
        'acoes': ['Faça 1 show de grande porte por ano numa praça-chave com marca pagando a conta.',
                  'Publique conteúdo do show na semana seguinte: é quando a cidade está ouvindo.'],
        'confianca': {'nivel': 'alta', 'motivo': 'Série diária da cidade com o salto exatamente na semana do show.'},
        'seguintes': ['festival-ou-proprio', 'marca-certa'],
    })
    bt = {b['tipo']: b for b in d['shows']['por_tipo']}
    fest, prop = bt.get('Festival / turnê coletiva'), bt.get('Show próprio')
    A.append({
        'id': 'festival-ou-proprio', 'tema': 'shows',
        'pergunta': 'Vale mais tocar em festival ou fazer show próprio?',
        'variacoes': ['festival', 'show próprio', 'line-up', 'abrir show', 'turnê coletiva'],
        'pensando': [
            step(f"Separando {fest['n'] + prop['n']} eventos desde 2019 em dois tipos", ['shows']),
            step('Descontando o efeito do mês (dezembro sempre cai)', ['shows', 'ouvintes']),
            step('Comparando a mediana de cada grupo', ['shows', 'ouvintes']),
        ],
        'veredito': 'Festival traz público novo; show próprio monetiza quem já é fã.',
        'explicacao': (f"Depois de festival ou turnê coletiva os ouvintes mudam {br(fest['mediana'],1,True)}% na mediana "
                       f"({fest['positivos']:.0f}% dos casos com alta), contra {br(prop['mediana'],1,True)}% em show próprio. "
                       "Palco dividido coloca a banda na frente de quem ainda não ouve."),
        'numeros': [{'valor': br(fest['mediana'], 1, True) + '%', 'rotulo': 'festival / coletivo'},
                    {'valor': br(prop['mediana'], 1, True) + '%', 'rotulo': 'show próprio'}],
        'blocos': [{'tipo': 'pontos_eventos', 'dados': 'shows.eventos'}],
        'acoes': ['2 a 3 festivais ou line-ups de nostalgia por semestre.', 'Shows próprios nas praças de prêmio de cachê.'],
        'confianca': {'nivel': 'média', 'motivo': f"{fest['n'] + prop['n']} eventos: amostra pequena, direção consistente."},
        'seguintes': ['com-quem-dividir-palco', 'onde-cobrar-mais'],
    })

    # ---------------------------------------------------------------- lançamentos
    saz = {s['mes']: s['idx'] for s in d['sazonalidade']}
    lif = [l for l in d['lancamentos'] if l['data'] >= '2023-01-01']
    best_rel = max(lif, key=lambda x: x['ajustado'])
    A.append({
        'id': 'quando-lancar', 'tema': 'lancamentos', 'destaque': True, 'simulador': 'janela',
        'pergunta': 'Quando devo lançar o próximo trabalho?',
        'variacoes': ['quando lançar', 'mês de lançamento', 'data de lançamento', 'próximo single', 'próximo álbum', 'lançamento'],
        'pensando': [
            step(f"Lendo ouvintes diários desde {d['meta']['desde'][:4]}", ['ouvintes']),
            step(f"Calculando o padrão de cada mês ({d['sazonalidade_anos']})", ['ouvintes']),
            step('Medindo o efeito real de cada lançamento, sem o efeito do mês', ['lancamentos', 'ouvintes']),
        ],
        'veredito': 'Entre o fim de julho e agosto. Segure inéditas de dezembro a março.',
        'explicacao': (f"{', '.join(d['melhores_meses'])} são os meses mais fortes da banda (agosto {br(saz['ago'],0,True)}%) e "
                       f"{', '.join(d['piores_meses'])} os mais fracos (janeiro {br(saz['jan'],0,True)}%). Lançar em julho/agosto pega a subida natural. "
                       f"O melhor resultado recente foi '{best_rel['nome']}': {br(best_rel['ajustado'],0,True)}% em 1 mês, já sem o efeito do mês."),
        'numeros': [{'valor': br(saz['ago'], 0, True) + '%', 'rotulo': 'agosto'}, {'valor': br(saz['jan'], 0, True) + '%', 'rotulo': 'janeiro'}],
        'blocos': [{'tipo': 'sazonalidade', 'dados': 'sazonalidade'}, {'tipo': 'simulador', 'simulador': 'janela', 'dados': 'sazonalidade'}],
        'acoes': ['De dezembro a março: ao vivo, bastidor e catálogo.', 'Primeiro single em julho; álbum em agosto/setembro.'],
        'confianca': {'nivel': 'alta', 'motivo': 'Padrão se repete em 7 anos completos de dados.'},
        'seguintes': ['album-ou-partes', 'proximos-meses'],
    })
    si = d['serie_inv']
    A.append({
        'id': 'album-ou-partes', 'tema': 'lancamentos',
        'pergunta': 'Lanço o álbum inteiro ou em partes?',
        'variacoes': ['partes', 'capítulos', 'álbum inteiro', 'singles', 'formato de lançamento', 'deluxe'],
        'pensando': [
            step(f"Separando o projeto de {si['n']} singles semanais de 2021", ['lancamentos']),
            step('Medindo o efeito de cada capítulo', ['lancamentos', 'ouvintes']),
            step('Comparando com o álbum em 2 partes de 2024', ['lancamentos', 'ouvintes']),
        ],
        'veredito': 'Em partes, mas no máximo 2 ou 3, com 6 a 10 semanas entre elas.',
        'explicacao': (f"Nos {si['n']} singles semanais de 2021 o efeito caiu de {br(si['primeiro'],0,True)}% no primeiro para "
                       f"{br(si['ultimo'],0,True)}% no último: o público cansa do mesmo gatilho. O álbum de 2024 em 2 partes manteve picos de dois dígitos."),
        'numeros': [{'valor': br(si['primeiro'], 0, True) + '%', 'rotulo': '1º capítulo'}, {'valor': br(si['ultimo'], 0, True) + '%', 'rotulo': f"{si['n']}º capítulo"}],
        'blocos': [{'tipo': 'barras_divergentes', 'dados': 'serie_inv.lista', 'titulo': 'Efeito de cada capítulo (2021)'}],
        'acoes': ['Parte 1 com o single mais forte; parte 2 com o feat.'],
        'confianca': {'nivel': 'média', 'motivo': 'Um único projeto em série; padrão claro, mas é um caso.'},
        'seguintes': ['quando-lancar', 'qual-lancamento-funcionou'],
    })
    A.append({
        'id': 'qual-lancamento-funcionou', 'tema': 'lancamentos',
        'pergunta': 'Qual lançamento mais funcionou?',
        'variacoes': ['melhor lançamento', 'o que funcionou', 'qual single', 'mais funcionou'],
        'pensando': [step('Listando lançamentos desde 2022', ['lancamentos']),
                     step('Comparando ouvintes 1 mês depois com a semana anterior', ['lancamentos', 'ouvintes']),
                     step('Tirando o efeito do mês', ['ouvintes'])],
        'veredito': f"'{best_rel['nome']}' ({best_rel['data'][:4]}): {br(best_rel['ajustado'],0,True)}% em 1 mês.",
        'explicacao': 'Os melhores resultados vieram de álbum dividido em partes, de feat com artista de fora e do disco novo. Single solto em novembro ou janeiro quase não mexe.',
        'numeros': [{'valor': br(l['ajustado'], 0, True) + '%', 'rotulo': l['nome']} for l in sorted(lif, key=lambda x: -x['ajustado'])[:3]],
        'blocos': [{'tipo': 'barras_divergentes', 'dados': 'lancamentos', 'titulo': 'Efeito de cada lançamento (sem efeito do mês)'}],
        'acoes': ['Repita o formato vencedor: parte de álbum ou feat, lançado entre julho e setembro.'],
        'confianca': {'nivel': 'média', 'motivo': 'Efeito de 1 mês também carrega shows e playlists da época.'},
        'seguintes': ['quando-lancar', 'com-quem-dividir-palco'],
    })
    fc = d['previsao']
    jan = next((f for f in fc if f['mes'].startswith('jan')), fc[0])
    A.append({
        'id': 'proximos-meses', 'tema': 'lancamentos',
        'pergunta': 'O que esperar dos próximos 6 meses?',
        'variacoes': ['previsão', 'próximos meses', 'vai cair', 'vai crescer', 'projeção', 'futuro'],
        'pensando': [step('Calculando o nível real, sem efeito do mês, dos últimos 12 meses', ['ouvintes']),
                     step('Aplicando o padrão de cada mês', ['ouvintes']),
                     step('Desenhando a faixa provável (80%)', ['ouvintes'])],
        'veredito': f"Janeiro deve ficar perto de {short(jan['valor'])} ouvintes. É a queda de todo ano, não perda de público.",
        'explicacao': (f"A base sem efeito sazonal está em {short(d['base_dessazonalizada'])}. A faixa provável para janeiro vai de "
                       f"{short(jan['min'])} a {short(jan['max'])}; a recuperação vem a partir de abril."),
        'numeros': [{'valor': short(f['valor']), 'rotulo': f['mes']} for f in fc[:3]],
        'blocos': [{'tipo': 'previsao', 'dados': 'historico+previsao'}],
        'acoes': ['Não leia a queda de janeiro como crise; planeje o conteúdo de catálogo para esse período.'],
        'confianca': {'nivel': 'média', 'motivo': 'Projeção estatística simples; um lançamento ou show grande muda a curva.'},
        'seguintes': ['quando-lancar'],
    })

    # ---------------------------------------------------------------- catálogo & setlist
    T = d['faixas']
    ig = d['sons']['instagram']
    antigas = {t['faixa'].lower() for t in T}
    novas = [s for s in ig if '2026' in str(s.get('desde', '')) and s['som'].lower() not in antigas][:3]
    A.append({
        'id': 'setlist', 'tema': 'catalogo', 'destaque': True,
        'pergunta': 'Quais músicas não podem faltar no setlist?',
        'variacoes': ['setlist', 'repertório', 'músicas do show', 'tocar no show', 'hits'],
        'pensando': [step('Lendo streams dos últimos 90 dias por faixa', ['faixas']),
                     step('Somando views no YouTube e presença em playlists', ['faixas', 'playlists']),
                     step('Cruzando com os sons que mais viralizam em vídeo', ['sons'])],
        'veredito': f"{T[0]['faixa']}, {T[1]['faixa']} e {T[2]['faixa']} são obrigatórias; {', '.join(s['som'] for s in novas[:2])} entram como as novas que o público usa em vídeo.",
        'explicacao': (f"{T[0]['faixa']} fez {short(T[0]['streams_90d'])} streams só nos últimos 90 dias, sendo uma música de {T[0]['idade_anos']:.0f} anos. "
                       "E os sons mais usados no Reels em 2026 incluem faixas do disco novo: o setlist pode equilibrar hino e presente."),
        'numeros': [{'valor': str(int(t['forca'])), 'rotulo': t['faixa']} for t in T[:3]],
        'blocos': [{'tipo': 'tabela', 'dados': 'faixas', 'colunas': ['faixa', 'forca', 'streams_90d', 'youtube', 'playlists']},
                   {'tipo': 'barras', 'dados': 'sons.instagram', 'campo': 'views', 'titulo': 'Sons mais usados no Reels'}],
        'acoes': ['Abra ou feche com o hino; coloque a faixa nova que viraliza no meio, quando o celular sobe.',
                  'Grave a faixa nova ao vivo em vertical para alimentar o som no Reels.'],
        'confianca': {'nivel': 'média', 'motivo': 'O export cobre 5 faixas monitoradas; a API cobre o catálogo inteiro.'},
        'seguintes': ['viralizando', 'edicao-comemorativa'],
    })
    tt = d['sons']['tiktok']
    A.append({
        'id': 'viralizando', 'tema': 'catalogo',
        'pergunta': 'Que músicas estão viralizando em vídeo?',
        'variacoes': ['viralizando', 'tiktok', 'reels', 'viral', 'trend', 'som'],
        'pensando': [step('Lendo os sons mais usados no TikTok', ['sons']), step('Lendo os sons mais usados no Reels', ['sons']),
                     step('Separando hino antigo de faixa nova', ['sons', 'albuns'])],
        'veredito': f"{ig[0]['som']} lidera no Reels; {tt[0]['som']} lidera no TikTok.",
        'explicacao': (f"{ig[0]['som']} soma {short(ig[0]['views'])} de views nos principais vídeos do Reels. No TikTok, "
                       f"{tt[0]['som']} tem {short(tt[0]['views'])} em {n(tt[0]['videos'])} vídeos. Vídeos usando o som cresceram muito em 12 meses."),
        'numeros': [{'valor': short(ig[0]['views']), 'rotulo': ig[0]['som']}, {'valor': short(tt[0]['views']), 'rotulo': tt[0]['som']}],
        'blocos': [{'tipo': 'barras', 'dados': 'sons.instagram', 'campo': 'views'}, {'tipo': 'barras', 'dados': 'sons.tiktok', 'campo': 'views'}],
        'acoes': ['Libere o trecho de 15 segundos mais cantado como som oficial.', 'Repost dos melhores vídeos de fãs no perfil da banda.'],
        'confianca': {'nivel': 'alta', 'motivo': 'Contagem direta das plataformas.'},
        'seguintes': ['publico-de-verdade', 'onde-investir-conteudo'],
    })
    old = [a for a in d['albuns'] if a['ano'] <= 2016]
    ann = d['contexto'].get('aniversarios', [])
    big = next((a for a in ann if 'grande' in a.get('status', '')), ann[0] if ann else None)
    A.append({
        'id': 'edicao-comemorativa', 'tema': 'catalogo',
        'pergunta': 'Qual disco merece edição comemorativa?',
        'variacoes': ['aniversário', 'vinil', 'edição especial', 'comemorativa', 'disco antigo', 'relançamento'],
        'pensando': [step('Medindo a popularidade atual de cada disco', ['albuns']),
                     step('Cruzando com os aniversários dos próximos anos', ['albuns', 'imprensa']),
                     step('Lendo o que os fãs comentam nos clipes antigos', ['comentarios'])],
        'veredito': (f"{big['marco']} em {big['ano']}." if big else 'Veja o calendário de aniversários.'),
        'explicacao': (f"{old[0]['album']} ({old[0]['ano']}) segue com popularidade {old[0]['popularidade']} no Spotify, quase igual ao disco novo. "
                       + d['contexto'].get('prova_nostalgia', '')),
        'numeros': [{'valor': str(a['popularidade']), 'rotulo': f"{a['album']} ({a['ano']})"} for a in old[:3]],
        'blocos': [{'tipo': 'linha_do_tempo', 'dados': 'contexto.aniversarios'}, {'tipo': 'barras', 'dados': 'albuns', 'campo': 'popularidade'}],
        'acoes': ['Anuncie a turnê de aniversário com 12 meses de antecedência.', 'Vinil e coleção cápsula em pré-venda para medir demanda.'],
        'confianca': {'nivel': 'alta', 'motivo': 'Popularidade atual + prova de compra (jaqueta esgotada).'},
        'seguintes': ['marca-certa', 'setlist'],
    })

    # ---------------------------------------------------------------- público & conteúdo
    st, tk = d['publico']['streaming'], d['publico']['tiktok']
    A.append({
        'id': 'publico-de-verdade', 'tema': 'publico', 'destaque': True,
        'pergunta': 'Quem é o meu público de verdade?',
        'variacoes': ['público', 'quem me ouve', 'idade', 'homem ou mulher', 'gênero', 'perfil do fã', 'fãs'],
        'pensando': [step('Lendo idade e gênero do streaming', ['demografia']), step('Lendo idade e gênero do TikTok e do Instagram', ['demografia']),
                     step('Comparando quem ouve com quem assiste', ['demografia', 'seguidores'])],
        'veredito': f"Existem duas {nome}s: quem ouve tem 25–34 anos; quem assiste tem 18–24.",
        'explicacao': (f"No streaming o público é {st['masc']:.0f}% masculino e concentrado em {st['faixa_top']} anos. No TikTok, "
                       f"{tk['segmento_top']['pct']:.0f}% são mulheres de {tk['segmento_top']['faixa']}. A geração nova chega pelo vídeo e ainda não virou ouvinte recorrente."),
        'numeros': [{'valor': f"{st['masc']:.0f}%", 'rotulo': 'homens no streaming'}, {'valor': f"{tk['fem']:.0f}%", 'rotulo': 'mulheres no TikTok'}],
        'blocos': [{'tipo': 'piramides', 'dados': 'publico', 'plataformas': ['streaming', 'tiktok', 'instagram']}],
        'acoes': ['Vídeo curto: faixas novas e bastidor, para 18–24.', 'Ingresso VIP, vinil e merch premium: para 25–34.'],
        'confianca': {'nivel': 'alta', 'motivo': 'Dados demográficos das próprias plataformas.'},
        'seguintes': ['onde-investir-conteudo', 'o-que-fas-falam'],
    })
    plats = {p['plataforma']: p for p in d['plataformas']}
    up = sorted(d['plataformas'], key=lambda p: -(p['g12'] or 0))
    A.append({
        'id': 'onde-investir-conteudo', 'tema': 'publico',
        'pergunta': 'Em qual rede eu devo investir conteúdo?',
        'variacoes': ['rede social', 'instagram', 'x', 'twitter', 'onde postar', 'conteúdo'],
        'pensando': [step('Comparando 12 meses de seguidores em 8 plataformas', ['seguidores']),
                     step('Somando os vídeos que usam as músicas', ['sons']),
                     step('Vendo onde está o público que ainda não ouve', ['demografia'])],
        'veredito': f"{up[0]['plataforma']} e Instagram. O X vira canal de aviso.",
        'explicacao': (f"{up[0]['plataforma']} cresceu {br(up[0]['g12'],0,True)}% e Instagram {br(plats['Instagram']['g12'],0,True)}% em 12 meses; "
                       f"o X perdeu {br(abs(plats['X / Twitter']['g12']),0)}% dos seguidores no mesmo período."),
        'numeros': [{'valor': br(p['g12'], 0, True) + '%', 'rotulo': p['plataforma']} for p in up[:2]] +
                   [{'valor': br(plats['X / Twitter']['g12'], 0, True) + '%', 'rotulo': 'X / Twitter'}],
        'blocos': [{'tipo': 'tabela', 'dados': 'plataformas', 'colunas': ['plataforma', 'total', 'g12', 'spark']}],
        'acoes': ['3 vídeos curtos por semana (palco, estúdio, fã).', 'X só para aviso de show e lançamento.'],
        'confianca': {'nivel': 'alta', 'motivo': 'Séries diárias de seguidores de cada plataforma.'},
        'seguintes': ['viralizando', 'publico-de-verdade'],
    })
    cm = d['comentarios']
    A.append({
        'id': 'o-que-fas-falam', 'tema': 'publico',
        'pergunta': 'O que os fãs mais falam sobre a banda?',
        'variacoes': ['comentários', 'o que falam', 'fãs falam', 'sentimento', 'nostalgia'],
        'pensando': [step(f"Lendo {n(cm['n'])} comentários mais curtidos do YouTube", ['comentarios']),
                     step('Agrupando por tema', ['comentarios'])],
        'veredito': f"Saudade. {cm['temas'][0]['pct']:.0f}% dos comentários falam de nostalgia.",
        'explicacao': (f"Depois da nostalgia vem \"quem ainda ouve em 20XX?\" ({cm['temas'][1]['pct']:.0f}%): o fã volta todo ano e avisa que voltou. "
                       "É o combustível de produto comemorativo e de turnê de aniversário."),
        'numeros': [{'valor': f"{t['pct']:.0f}%", 'rotulo': t['tema']} for t in cm['temas'][:3]],
        'blocos': [{'tipo': 'barras', 'dados': 'comentarios.temas', 'campo': 'pct'}, {'tipo': 'citacoes', 'dados': 'comentarios.destaques'}],
        'acoes': ['Responda e fixe o comentário "quem ainda ouve em 2026?" todo começo de ano.'],
        'confianca': {'nivel': 'média', 'motivo': 'Classificação por palavras-chave; a versão com IA lê o sentido.'},
        'seguintes': ['edicao-comemorativa'],
    })

    # ---------------------------------------------------------------- playlists
    pr = d['playlists']['resumo']
    dp = d.get('destaque_playlist') or {}
    A.append({
        'id': 'playlists-editoriais', 'tema': 'playlists',
        'pergunta': 'Por que não entro em mais playlists editoriais?',
        'variacoes': ['playlist', 'editorial', 'spotify', 'curadoria', 'pitch'],
        'pensando': [step('Lendo a evolução diária de playlists desde 2022', ['playlists']),
                     step('Separando editorial, algorítmica e de fã', ['playlists']),
                     step('Calculando quanto do alcance depende de editorial', ['playlists'])],
        'veredito': f"As editoriais pararam em {pr['editoriais']} desde {pr['editoriais_parado_desde']}; os fãs continuam colocando a banda nas deles.",
        'explicacao': (f"Mesmo com disco novo, o número de editoriais não mudou. Já as playlists de fãs cresceram {br(pr['usuarios_g12'],0,True)}% "
                       f"em 12 meses ({n(pr['usuarios'])}). Só {pr['dependencia_editorial']:.0f}% do alcance vem de editorial: base sólida, teto baixo."
                       + (f" O melhor sinal recente: {dp['posicao']}º lugar na {dp['playlist']} com \"{dp['faixa']}\"." if dp else '')),
        'numeros': [{'valor': str(pr['editoriais']), 'rotulo': 'editoriais'}, {'valor': short(pr['usuarios']), 'rotulo': 'playlists de fãs'},
                    {'valor': f"{pr['dependencia_editorial']:.0f}%", 'rotulo': 'do alcance é editorial'}],
        'blocos': [{'tipo': 'linha', 'dados': 'playlists.evolucao', 'campo': 'usuarios'}, {'tipo': 'lista', 'dados': 'playlists.recomendadas'}],
        'acoes': ['Pitch editorial 4 semanas antes de cada lançamento, com o recorte "rock nostalgia".', 'Contate os 10 curadores-fãs com mais seguidores.'],
        'confianca': {'nivel': 'alta', 'motivo': 'Série diária de playlists do Spotify.'},
        'seguintes': ['quando-lancar'],
    })

    # ---------------------------------------------------------------- parcerias
    bev = [b for b in d['marcas'] if 'drink' in b['categoria'].lower()][:3]
    A.append({
        'id': 'marca-certa', 'tema': 'parcerias', 'destaque': True,
        'pergunta': 'Que marca combina com o meu público?',
        'variacoes': ['marca', 'patrocínio', 'patrocinador', 'publi', 'parceria comercial'],
        'pensando': [step('Lendo as marcas que o público segue no Instagram', ['marcas']),
                     step('Calculando quantas vezes acima da média', ['marcas']),
                     step('Cruzando com idade e cidades do público', ['demografia', 'cidades'])],
        'veredito': f"{', '.join(b['marca'] for b in bev)}: bebida tem o fit mais forte.",
        'explicacao': (f"O público segue {bev[0]['marca']} {br(bev[0]['afinidade'])}x mais que a média do Instagram, com {bev[0]['match']:.0f}% de correspondência de perfil. "
                       "É argumento pronto para patrocínio de turnê ou de show gratuito como o da Redenção."),
        'numeros': [{'valor': br(b['afinidade']) + 'x', 'rotulo': b['marca']} for b in bev],
        'blocos': [{'tipo': 'barras', 'dados': 'marcas', 'campo': 'afinidade'}],
        'acoes': ['Leve à marca: idade, gênero, cidades de prêmio e o caso da Redenção.'],
        'confianca': {'nivel': 'média', 'motivo': 'Afinidade mede quem segue, não quem compra.'},
        'seguintes': ['show-da-retorno', 'com-quem-dividir-palco'],
    })
    cop = d['co_palco']
    young = sorted([p for p in d['pares'] if p['artista'] != nome and p['lealdade'] and p['lealdade'] > 100 and (p.get('tiktok') or 0) > 500000], key=lambda p: -p['lealdade'])[:3]
    A.append({
        'id': 'com-quem-dividir-palco', 'tema': 'parcerias',
        'pergunta': 'Com quem vale dividir palco ou fazer feat?',
        'variacoes': ['feat', 'parceria', 'dividir palco', 'colaboração', 'artista parecido', 'abrir show'],
        'pensando': [step('Listando quem mais dividiu palco com a banda', ['co_palco']),
                     step('Lendo os 30 artistas com público mais parecido', ['pares']),
                     step('Procurando quem traz o público que falta', ['pares', 'demografia'])],
        'veredito': f"{cop[0]['artista']} e {cop[1]['artista']} para palco; {', '.join(p['artista'] for p in young[:2])} para feat.",
        'explicacao': (f"{cop[0]['artista']} ({cop[0]['eventos']} palcos juntos) e {cop[1]['artista']} ({cop[1]['eventos']}) são a dobradinha que já funciona ao vivo. "
                       f"Para feat, {' e '.join(p['artista'] for p in young[:2])} têm base ainda mais fiel e muito mais força no TikTok "
                       f"({' e '.join(short(p['tiktok']) for p in young[:2] if p.get('tiktok'))} de seguidores), onde está a geração que hoje só assiste."),
        'numeros': [{'valor': str(c['eventos']), 'rotulo': f"palcos com {c['artista']}"} for c in cop[:2]],
        'blocos': [{'tipo': 'lista', 'dados': 'co_palco'}, {'tipo': 'barras', 'dados': 'pares', 'campo': 'lealdade', 'destacar': [nome]}],
        'acoes': ['Feat lançado em julho/agosto, antes da turnê.'],
        'confianca': {'nivel': 'média', 'motivo': 'Similaridade de público medida pela Chartmetric; validar afinidade artística.'},
        'seguintes': ['qual-lancamento-funcionou', 'festival-ou-proprio'],
    })
    return A


def alerts(d):
    cid = {c['cidade']: c for c in d['cidades']}
    pr = d['playlists']['resumo']
    plats = {p['plataforma']: p for p in d['plataformas']}
    yt = d['youtube_cidades_12m'][0]
    jan = next((f for f in d['previsao'] if f['mes'].startswith('jan')), None)
    return [
        {'tipo': 'oportunidade', 'titulo': f"{yt['cidade']}: YouTube {br(yt['var_12m'],0,True)}% em 12 meses", 'pergunta': 'proxima-cidade'},
        {'tipo': 'investigar', 'titulo': 'Itabuna (BA) disparou +164% em outubro', 'pergunta': None,
         'texto': 'Show, vídeo viral ou erro de coleta? Na versão com API, o sistema avisa no dia.'},
        {'tipo': 'atencao', 'titulo': f"Playlists editoriais paradas em {pr['editoriais']}", 'pergunta': 'playlists-editoriais'},
        {'tipo': 'atencao', 'titulo': f"X {br(plats['X / Twitter']['g12'],0,True)}% em 12 meses", 'pergunta': 'onde-investir-conteudo'},
        {'tipo': 'previsao', 'titulo': f"Janeiro: queda sazonal para ~{short(jan['valor'])} ouvintes" if jan else 'Previsão', 'pergunta': 'proximos-meses'},
    ]


TEMAS = [
    {'id': 'cache', 'nome': 'Cachê e turnê', 'descricao': 'Onde tocar, quanto cobrar, tamanho de casa'},
    {'id': 'shows', 'nome': 'Shows', 'descricao': 'O que cada show faz pelo streaming'},
    {'id': 'lancamentos', 'nome': 'Lançamentos', 'descricao': 'Quando e em que formato lançar'},
    {'id': 'catalogo', 'nome': 'Catálogo e setlist', 'descricao': 'O que o público quer ouvir agora'},
    {'id': 'publico', 'nome': 'Público e conteúdo', 'descricao': 'Quem ouve, quem assiste, onde postar'},
    {'id': 'playlists', 'nome': 'Playlists', 'descricao': 'Quem coloca a banda para tocar'},
    {'id': 'parcerias', 'nome': 'Parcerias', 'descricao': 'Marcas e artistas com o mesmo público'},
]


def main(slug):
    data, _ = build(slug)
    out = {'artista': data['meta']['artista'], 'gerado_em': data['meta']['gerado_em'],
           'fontes': FONTES, 'temas': TEMAS, 'alertas': alerts(data), 'perguntas': build_answers(data),
           'fallback': {
               'titulo': 'Essa pergunta precisa da versão com IA',
               'texto': 'Na demo, o sistema responde as perguntas mais comuns de carreira. Na versão completa, ele cruza todos os dados ao vivo para qualquer pergunta.',
           }}
    path = ROOT / 'artists' / slug / 'respostas.json'
    path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'ok  {path.relative_to(ROOT)}  ({len(out["perguntas"])} perguntas, {len(out["alertas"])} alertas)')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
