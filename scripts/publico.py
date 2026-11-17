"""
Público provável por praça — regressão ponderada sobre a agenda real da banda.

Por que existe
-------------
A primeira versão usava "3% a 5% dos ouvintes mensais da cidade". Isso errava de
3 a 5 vezes para baixo: em Porto Alegre a conta dava 720–1.200 pessoas enquanto a
banda quase esgota o Auditório Araújo Vianna (3.628 lugares) duas vezes por ano.
Três motivos:

1. **Denominador velho.** Os ouvintes por cidade vêm de um snapshot de 2024,
   enquanto o total de ouvintes mensais é de hoje.
2. **Ouvinte mensal não é fã.** "Ouvintes mensais" conta quem tocou a música nos
   últimos 28 dias. Quem compra ingresso de uma banda consolidada inclui o fã que
   já não streama toda semana. O Spotify mede isso pelo outro lado: os "super
   listeners" são ~2% dos ouvintes mensais e compram ~50% dos ingressos
   (Spotify Fan Study, 2025).
3. **A fatia não é constante.** Praça pequena e apaixonada converte muito mais
   que metrópole grande.

O modelo
--------
Não é média de taxa: é uma **regressão linear ponderada em escala log** sobre a
agenda pública da banda (as casas próprias dos últimos anos, com capacidade e o
que se sabe de bilheteria):

    ln(publico) = b0 + b1 * ln(base_fa) + b2 * ln(demanda_rel) + erro

    base_fa     = ouvintes_snapshot x (ouvintes_atuais / soma_snapshot) x lealdade
    demanda_rel = ouvintes por 100 mil habitantes / mediana das praças

`b1` mede o efeito de escala (praça maior, fatia menor), `b2` o efeito de
afinidade local. Cada show entra com um **peso**: bilheteria confirmada pesa 1,
ocupação presumida pesa menos, casa de configuração variável (arena) pesa pouco.

O que sai disso, para cada praça:

* **P50** — o público mais provável (a mediana da predição).
* **Faixa P10–P90** — intervalo de predição de verdade, somando o erro do ajuste
  e a distância da praça ao centro dos dados (alavancagem). Praça parecida com as
  que a banda já tocou tem faixa estreita; praça fora da nuvem tem faixa larga.
* **Chance de esgotar** a última casa tocada na cidade, pela lognormal da predição.
* **Veredito de crescimento** — casa maior / segunda data / manter / casa menor,
  comparando o P50 com a capacidade da última casa.

Censura: show esgotado não diz quanto a banda venderia, diz que venderia *pelo
menos* a capacidade da casa. Por isso, por cidade, só a maior evidência entra no
ajuste, e um esgotamento confirmado funciona como piso do P50.

Uso
---
    python3 scripts/publico.py fresno     # recalcula o público no data.json do app

Também é importado por `analytics.py`, para o pipeline completo dar o mesmo número.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

CASAS = [400, 800, 2000, 5000, float('inf')]  # faixas de casa (PRD §5.5)
Z90 = 1.2816  # quantil 90% da normal padrão -> faixa P10–P90

PADRAO = {
    # usados só quando não há show suficiente para a regressão
    'conv_ref_pct': 6.1,
    'base_ref': 40000.0,
    'expoente_escala': 0.30,
    'expoente_demanda': 0.30,
    'ocupacao_presumida': 0.85,   # show próprio sem notícia de bilheteria
    'peso_presumido': 0.45,
    'peso_confirmado': 1.0,
    'peso_arena': 0.0,            # casa de configuração variável: capacidade não diz lotação, fica fora do ajuste
    # bilheteria: no Brasil metade do público costuma pagar meia-entrada, então o
    # ticket médio fica perto de 75% da inteira. É uma premissa, e aparece como tal.
    # A ocupação presumida (85%) e a capacidade divulgada já carregam erro. Sem
    # este piso, a regressão com muitos pontos censurados declara uma precisão
    # que ela não tem: o resíduo do ponto imputado é zero por construção.
    'sigma_minimo': 0.15,
    # Esgotar uma casa de 2.400 prova demanda de pelo menos 2.400 — não prova
    # 5.000. Sem um teto, a imputação do ponto censurado vira profecia: ela sobe
    # até onde a curva quiser e depois reforça a própria curva.
    'teto_imputacao': 1.5,
    'fator_meia': 0.75,
    'crescer': 1.15,              # P50 >= 1,15x a casa -> casa maior ou outra data
    'encolher': 0.70,             # P50 <= 0,70x a casa -> casa menor ou festival
}


def _km(a, b) -> float:
    """Distância em km entre dois pares (lon, lat)."""
    (lo1, la1), (lo2, la2) = a, b
    g = math.pi / 180
    h = (0.5 - math.cos((la2 - la1) * g) / 2
         + math.cos(la1 * g) * math.cos(la2 * g) * (1 - math.cos((lo2 - lo1) * g)) / 2)
    return 2 * 6371 * math.asin(math.sqrt(max(h, 0.0)))


def _sombra(cidade: dict, cidades: list[dict], alcance=150.0) -> float:
    """Quanto uma praça maior e perto puxa o público desta.

    Campinas fica a 84 km de São Paulo e tem um quinto da base paulistana: o fã
    de Campinas vai ao show de São Paulo. Santo André, Guarulhos, Santos e
    Sorocaba são casos ainda mais extremos. A medida é a maior razão
    base_vizinha/base_local decaindo com a distância.
    """
    if not cidade.get('coord'):
        return 0.0
    melhor = 0.0
    for o in cidades:
        if o is cidade or not o.get('coord') or o['ouvintes'] <= cidade['ouvintes']:
            continue
        melhor = max(melhor, (o['ouvintes'] / cidade['ouvintes'])
                     * math.exp(-_km(cidade['coord'], o['coord']) / alcance))
    return melhor


def _base_regiao(cidade: dict, cidades: list[dict], base_de, alcance=120.0) -> float:
    """Base da praça somada à das cidades menores ao redor.

    Quem mora em São José vai ao show em Florianópolis; quem mora em Canoas vai
    a Porto Alegre. A contagem por município subestima a praça-polo e é a outra
    metade da mesma moeda da sombra.
    """
    total = base_de(cidade)
    if not cidade.get('coord'):
        return total
    for o in cidades:
        if o is cidade or not o.get('coord') or o['ouvintes'] >= cidade['ouvintes']:
            continue
        total += base_de(o) * math.exp(-_km(cidade['coord'], o['coord']) / alcance)
    return total


def _dezena(x: float) -> int:
    return int(round(x / 100.0) * 100) if x >= 2000 else int(round(x / 10.0) * 10)


def _norm_cdf(z: float) -> float:
    return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))


# --------------------------------------------------------------------- álgebra

def _resolver(A: list[list[float]], b: list[float]) -> list[float] | None:
    """Gauss-Jordan com pivoteamento parcial. Devolve None se singular."""
    n = len(A)
    M = [list(linha) + [b[i]] for i, linha in enumerate(A)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c]))
        if abs(M[p][c]) < 1e-12:
            return None
        M[c], M[p] = M[p], M[c]
        piv = M[c][c]
        M[c] = [v / piv for v in M[c]]
        for r in range(n):
            if r != c and M[r][c]:
                f = M[r][c]
                M[r] = [v - f * w for v, w in zip(M[r], M[c])]
    return [linha[n] for linha in M]


def _inverter(A: list[list[float]]) -> list[list[float]] | None:
    n = len(A)
    cols = []
    for j in range(n):
        c = _resolver(A, [1.0 if i == j else 0.0 for i in range(n)])
        if c is None:
            return None
        cols.append(c)
    return [[cols[j][i] for j in range(n)] for i in range(n)]


def _phi(z: float) -> float:
    return math.exp(-0.5 * z * z) / math.sqrt(2 * math.pi)


def _wls_censurado(X, y, w, censurado, voltas=8, piso_sigma=0.0, teto=1.5):
    """Regressão com observações censuradas à esquerda (shows esgotados).

    Um show esgotado não mede a demanda: mede o tamanho da casa. O que se sabe é
    que a demanda era *pelo menos* aquilo. Tratar esse ponto como se fosse o
    número exato puxa a curva para baixo — é por isso que, no ajuste simples, São
    Paulo e Porto Alegre ficavam subestimados justamente nas noites que lotaram.

    Aqui usamos o procedimento padrão para dado censurado (Tobit por EM): ajusta,
    e para cada show esgotado troca o valor observado pela média da normal
    truncada acima da capacidade, E[y | y >= c]. Repete até estabilizar. Quem não
    esgotou entra como está, porque aí o público realmente mediu a demanda.
    """
    atual = list(y)
    ajuste = _wls(X, atual, w)
    if not ajuste or not any(censurado):
        return ajuste
    for _ in range(voltas):
        beta, _, sigma, _, _ = ajuste
        if sigma <= 1e-6:
            break
        novo = list(atual)
        for i, c in enumerate(censurado):
            if not c:
                continue
            mu = sum(b * xv for b, xv in zip(beta, X[i]))
            a = (y[i] - mu) / sigma
            cauda = 1 - _norm_cdf(a)
            esperado = mu + sigma * (_phi(a) / cauda if cauda > 1e-6 else a + 1 / max(a, 1e-3))
            novo[i] = min(max(y[i], esperado), y[i] + math.log(teto))
        if max(abs(novo[i] - atual[i]) for i in range(len(y))) < 1e-4:
            atual = novo
            break
        atual = novo
        proximo = _wls(X, atual, w)
        if not proximo:
            break
        ajuste = proximo
    beta, inv, sigma, r2, gl = ajuste

    # O valor imputado cai em cima da reta, então o resíduo dele é zero por
    # construção e o sigma despenca — o modelo pareceria muito mais preciso do
    # que é. Para o ponto censurado, a variância certa é a da normal truncada
    # acima da capacidade, não zero.
    soma, peso_total = 0.0, 0.0
    for i, c in enumerate(censurado):
        mu = sum(b * xv for b, xv in zip(beta, X[i]))
        if not c:
            soma += w[i] * (y[i] - mu) ** 2
        else:
            a = (y[i] - mu) / max(sigma, 1e-6)
            cauda = 1 - _norm_cdf(a)
            lam = _phi(a) / cauda if cauda > 1e-6 else a + 1 / max(a, 1e-3)
            soma += w[i] * (sigma ** 2) * max(1 + a * lam - lam * lam, 0.05)
        peso_total += w[i]
    gl_efetivo = max(len(y) - len(beta), 1)
    sigma = math.sqrt(soma / peso_total * len(y) / gl_efetivo) if peso_total else sigma
    return beta, inv, max(sigma, piso_sigma), r2, gl


def _wls(X: list[list[float]], y: list[float], w: list[float]):
    """Mínimos quadrados ponderados. Devolve (beta, (X'WX)^-1, sigma, r2, gl)."""
    n, k = len(X), len(X[0])
    XtWX = [[sum(w[i] * X[i][a] * X[i][b] for i in range(n)) for b in range(k)] for a in range(k)]
    XtWy = [sum(w[i] * X[i][a] * y[i] for i in range(n)) for a in range(k)]
    beta = _resolver(XtWX, XtWy)
    inv = _inverter(XtWX) if beta else None
    if beta is None or inv is None:
        return None
    res = [y[i] - sum(beta[a] * X[i][a] for a in range(k)) for i in range(n)]
    gl = max(n - k, 1)
    sqe = sum(w[i] * res[i] ** 2 for i in range(n))
    sigma = math.sqrt(sqe / gl)
    my = sum(w[i] * y[i] for i in range(n)) / sum(w)
    sqt = sum(w[i] * (y[i] - my) ** 2 for i in range(n))
    r2 = 1 - sqe / sqt if sqt > 1e-12 else None
    return beta, inv, sigma, r2, gl


def _loocv(X, y, w, censurado=None, desloc=None, piso=0.0, teto=1.5, z=Z90):
    """Validação leave-one-out: tira um show, ajusta nos outros, tenta prever ele.

    É a única medida honesta de erro de um modelo com poucos pontos — o R² do
    ajuste sempre parece bom porque o próprio show ajudou a desenhar a curva.
    Devolve o erro por show, o erro mediano e a cobertura da faixa P10–P90
    (quanto dos shows cai dentro do intervalo que o modelo promete).
    """
    n = len(X)
    if n < 4:
        return None
    censurado = censurado or [False] * n
    desloc = desloc or [0.0] * n
    linhas, dentro, razao = [], 0, []
    for i in range(n):
        Xi = [X[j] for j in range(n) if j != i]
        yi = [y[j] for j in range(n) if j != i]
        wi = [w[j] for j in range(n) if j != i]
        ci = [censurado[j] for j in range(n) if j != i]
        di = [desloc[j] for j in range(n) if j != i]
        fora = _wls_censurado(Xi, yi, wi, ci, piso_sigma=piso, teto=teto)
        if not fora:
            continue
        beta, inv, sigma, _, _ = fora
        mu = sum(b * xv for b, xv in zip(beta, X[i]))
        lev = sum(X[i][a] * inv[a][b] * X[i][b] for a in range(len(beta)) for b in range(len(beta)))
        ep = sigma * math.sqrt(1.0 + max(lev, 0.0))
        real, prev = math.exp(y[i] + desloc[i]), math.exp(mu + desloc[i])
        razao.append(abs(y[i] - mu) / ep if ep else 0.0)
        if abs(y[i] - mu) <= z * ep:
            dentro += 1
        linhas.append({'previsto': _dezena(prev), 'real': _dezena(real),
                       'esgotou': bool(censurado[i]),
                       'erro_pct': 0 if (censurado[i] and prev >= real) else round((prev / real - 1) * 100)})
    if not linhas:
        return None
    medidos = [l for l in linhas if not l['esgotou']]
    pisos = [l for l in linhas if l['esgotou']]
    furados = [l for l in pisos if l['previsto'] < l['real']]
    erros = sorted(abs(l['erro_pct']) for l in medidos) or [0]
    meio = len(erros) // 2
    razoes = sorted(razao[i] for i, l in enumerate(linhas) if not l['esgotou'] and razao[i] > 0) or [z]
    alvo = razoes[min(int(math.ceil(0.8 * len(razoes))) - 1, len(razoes) - 1)] if razoes else z
    return {
        'fator_faixa': round(max(alvo / z, 1.0), 3),
        'n': len(linhas),
        'n_medidos': len(medidos),
        'n_pisos': len(pisos),
        'pisos_respeitados': sum(1 for l in pisos if l['previsto'] >= l['real']),
        'erro_mediano_pct': erros[meio] if len(erros) % 2 else round((erros[meio - 1] + erros[meio]) / 2),
        'erro_medio_pct': round(sum(erros) / len(erros)),
        'erro_maximo_pct': erros[-1],
        'cobertura_pct': round(sum(1 for i, l in enumerate(linhas) if not l['esgotou'] and razao[i] <= z) / len(medidos) * 100) if medidos else 0,
        'linhas': linhas,
    }


# ------------------------------------------------------------------- calibração

def _publico_do_show(a: dict, p: dict) -> tuple[float | None, float, bool]:
    """(público estimado do show, peso, esgotou?)"""
    peso = a.get('peso')
    if a.get('publico'):
        return float(a['publico']), float(peso if peso is not None else p['peso_confirmado']), bool(a.get('esgotou'))
    cap = a.get('capacidade')
    if not cap:
        return None, 0.0, False
    ocup = a.get('ocupacao')
    confirmado = ocup is not None
    if not confirmado:
        ocup = p['ocupacao_presumida']
    if peso is None:
        if confirmado:
            peso = p['peso_confirmado']
        elif a.get('escalavel'):
            peso = p['peso_arena']   # capacidade de arena não diz quanto a banda levou
        else:
            peso = p['peso_presumido']
    return float(cap) * float(ocup), float(peso), bool(confirmado and float(ocup) >= 0.97)


def _fator_tempo(historico: list[dict]) -> callable:
    """Quanto a banda era menor na data do show (série de ouvintes mensais).

    Um show de 2019 aconteceu com outra base. Sem isso, a regressão compara
    públicos de épocas diferentes como se fossem a mesma banda.
    """
    MES = {'jan': 1, 'fev': 2, 'mar': 3, 'abr': 4, 'mai': 5, 'jun': 6,
           'jul': 7, 'ago': 8, 'set': 9, 'out': 10, 'nov': 11, 'dez': 12}

    def iso(rotulo: str) -> str | None:  # "dez/23" -> "2023-12"
        try:
            m, a = rotulo.split('/')
            return f"20{int(a):02d}-{MES[m[:3].lower()]:02d}"
        except Exception:
            return None

    serie = sorted((iso(h['mes']), float(h['valor'])) for h in (historico or [])
                   if h.get('valor') and iso(h.get('mes', '')))
    if not serie:
        return lambda data: 1.0
    hoje = serie[-1][1]
    inicio = serie[0][0]

    def fator(data: str) -> float:
        if not hoje:
            return 1.0
        mes = data[:7]
        if mes < inicio:
            return 0.0  # fora da janela da série: não dá para comparar épocas
        anterior = [v for m, v in serie if m <= mes]
        return max((anterior[-1] if anterior else hoje) / hoje, 0.05)
    return fator


TERMOS = {
    'const': lambda u: 1.0,
    'ln_base': lambda u: math.log(u['base']),
    'ln_demanda': lambda u: math.log(u['demanda_rel']),
    'casa': lambda u: 1.0 if u.get('e_casa') else 0.0,
    # momentum local: variação de views no YouTube em 3 meses, em escala log
    'momentum': lambda u: math.log(max(1 + (u.get('yt_3m') or 0) / 100.0, 0.2)),
    # sombra de uma praça maior e perto (São Paulo sobre Campinas, por exemplo)
    'sombra': lambda u: math.log(1 + (u.get('sombra') or 0.0)),
    # base da praça somada à das cidades menores ao redor (a praça-polo)
    'ln_base_regiao': lambda u: math.log(max(u.get('base_regiao') or u['base'], 1.0)),
    # quantos festivais a banda já fez nessa praça nos 24 meses anteriores
    'festivais': lambda u: math.log(1 + (u.get('festivais') or 0)),
}

# fórmulas candidatas, da mais simples para a mais complexa. A escolhida é a que
# erra menos na validação leave-one-out — não a que tem o R² mais bonito.
# Limites de plausibilidade. Com 6 ou 8 shows, a validação sozinha chega a
# escolher uma curva absurda (público crescendo mais que proporcionalmente à
# base, ou afinidade pesando mais que o tamanho da praça) que acerta os shows
# medidos e manda uma praça pequena para perto de zero. Estes limites são a
# parte de teoria: mercado satura, então o expoente da base fica abaixo de 1.
LIMITES = {'ln_base': (0.30, 1.00), 'ln_demanda': (0.0, 1.00), 'casa': (-0.3, 1.0),
           'momentum': (-0.3, 0.6), 'sombra': (-1.0, 0.0), 'festivais': (-1.0, 0.5),
           'ln_base_regiao': (0.30, 1.00)}

ESPECIFICACOES = [
    ('só escala', ['const', 'ln_base'], None),
    ('escala + afinidade fixa', ['const', 'ln_base'], 'afinidade'),
    ('escala + afinidade', ['const', 'ln_base', 'ln_demanda'], None),
    ('escala + cidade natal', ['const', 'ln_base', 'casa'], None),
    ('escala + afinidade + cidade natal', ['const', 'ln_base', 'ln_demanda', 'casa'], None),
    ('escala + afinidade + momentum', ['const', 'ln_base', 'ln_demanda', 'momentum'], None),
    ('escala regional', ['const', 'ln_base_regiao'], 'afinidade'),
    ('escala regional sem afinidade', ['const', 'ln_base_regiao'], None),
    ('escala + sombra de praça maior', ['const', 'ln_base', 'sombra'], None),
    ('escala + festivais na praça', ['const', 'ln_base', 'festivais'], None),
    ('escala + sombra + festivais', ['const', 'ln_base', 'sombra', 'festivais'], None),
]


def _monta(usadas, termos, fixo, prior):
    X = [[TERMOS[t](u) for t in termos] for u in usadas]
    y = [math.log(u['publico_show']) for u in usadas]
    if fixo == 'afinidade':
        y = [y[i] - prior * math.log(u['demanda_rel']) for i, u in enumerate(usadas)]
    return X, y, [u['peso'] for u in usadas]


def calibrar(cidades: list[dict], kpis: dict, cal: dict, historico: list[dict] | None = None, data_referencia: str | None = None) -> dict:
    p = {**PADRAO, **{k: v for k, v in (cal or {}).items() if k in PADRAO}}
    soma = sum(c['ouvintes'] for c in cidades) or 1
    atuais = kpis.get('ouvintes') or soma
    f_atualiza = atuais / soma
    f_fa = (kpis.get('lealdade') or 100) / 100.0
    casa_natal = (cal or {}).get('cidade_casa')
    por_nome = {c['cidade']: c for c in cidades}
    base_de = lambda c: c['ouvintes'] * f_atualiza * f_fa
    no_tempo = _fator_tempo(historico)

    ancoras = [a for a in ((cal or {}).get('ancoras') or [])
               if not data_referencia or a.get('data', '') <= data_referencia]
    festivais = {}
    for a in ancoras:
        if a.get('tipo') == 'festival':
            festivais.setdefault(a['cidade'], []).append(a['data'])

    def meses(d1, d2):
        return abs((int(d1[:4]) * 12 + int(d1[5:7])) - (int(d2[:4]) * 12 + int(d2[5:7])))

    def festivais_ate(cidade_nome, data, janela=24):
        return sum(1 for f in festivais.get(cidade_nome, []) if f <= data and meses(f, data) <= janela)

    provas = []
    for a in ancoras:
        if a.get('tipo') == 'festival':
            continue
        c = por_nome.get(a['cidade'])
        if not c:
            continue
        pub_show, peso, esgotou = _publico_do_show(a, p)
        if base_de(c) <= 0:
            continue
        ft = no_tempo(a['data'])
        if ft <= 0:   # show anterior à série de ouvintes: não entra
            continue
        provas.append({**a, 'publico_show': pub_show, 'peso': peso,
                       'esgotou': esgotou or bool(a.get('censurado')),
                       'sombra': _sombra(c, cidades),
                       'base_regiao': _base_regiao(c, cidades, base_de) * ft,
                       'festivais': festivais_ate(a['cidade'], a['data']),
                       'fator_tempo': round(ft, 3), 'base': base_de(c) * ft, 'yt_3m': c.get('yt_3m'),
                       'sem_bilheteria': not pub_show,
                       'demanda_rel': max(c.get('demanda_rel') or 1.0, 0.05)})

    # Uma linha por praça e por ano: o maior show daquela temporada.
    #
    # Dois shows na mesma cidade no mesmo ano costumam ser a mesma demanda vista
    # duas vezes (uma delas num formato menor), então fica a maior. Anos
    # diferentes entram separados, com o fator de época corrigindo o tamanho que
    # a banda tinha na data.
    melhor: dict[tuple[str, str], dict] = {}
    for pr in (q for q in provas if q['publico_show'] and q['peso'] > 0 and not q.get('fora_do_ajuste')):
        chave = (pr['cidade'], pr['data'][:4])
        atual = melhor.get(chave)
        if atual is None or pr['publico_show'] > atual['publico_show']:
            melhor[chave] = pr
    # Descarta a temporada que a própria praça já desmentiu: se a mesma cidade
    # fez quase o dobro em até 2 anos, aquela noite menor foi escolha de casa, não
    # teto de demanda. Sem isso, uma data de clube derruba a curva da cidade toda.
    def desmentida(pr):
        for outra in melhor.values():
            if outra is pr or outra['cidade'] != pr['cidade']:
                continue
            meses = abs(int(outra['data'][:4]) * 12 + int(outra['data'][5:7])
                        - int(pr['data'][:4]) * 12 - int(pr['data'][5:7]))
            if meses <= 24 and outra['publico_show'] >= 1.8 * pr['publico_show']:
                return True
        return False

    descartadas = [pr for pr in melhor.values() if desmentida(pr)]
    usadas = sorted((pr for pr in melhor.values() if pr not in descartadas),
                    key=lambda x: -x['publico_show'])
    no_ajuste = {(u['cidade'], u['data'], u['local']) for u in usadas}

    for u in usadas:
        u['e_casa'] = u['cidade'] == casa_natal

    # escolhe a fórmula pela validação: a que erra menos ao prever um show que
    # ficou de fora do ajuste. Empate -> a mais simples (menos coeficientes).
    prior = p['expoente_demanda']
    n_medidos = sum(1 for u in usadas if not u['esgotou'])
    candidatas = []
    for nome, termos, fixo in ESPECIFICACOES:
        k = len(termos) + (1 if fixo else 0)
        if len(usadas) < k + 3:          # menos de 3 graus de liberdade: não testa
            continue
        if n_medidos < k + 2:            # coeficientes demais para os shows com número
            continue
        X, y, w = _monta(usadas, termos, fixo, prior)
        cen = [bool(u['esgotou']) for u in usadas]
        desl = ([prior * math.log(u['demanda_rel']) for u in usadas]
                if fixo == 'afinidade' else [0.0] * len(usadas))
        ajuste = _wls_censurado(X, y, w, cen, piso_sigma=p['sigma_minimo'], teto=p['teto_imputacao'])
        if not ajuste:
            continue
        if any(not (LIMITES[t][0] <= ajuste[0][i] <= LIMITES[t][1])
               for i, t in enumerate(termos) if t in LIMITES):
            continue   # coeficiente fora do plausível: a fórmula é descartada
        val = _loocv(X, y, w, cen, desl, p['sigma_minimo'], p['teto_imputacao'])
        if not val:
            continue
        candidatas.append({'nome': nome, 'termos': termos, 'fixo': fixo, 'ajuste': ajuste, 'val': val, 'k': k})

    escolhida = min(candidatas, key=lambda c: (c['val']['erro_mediano_pct'], c['k'])) if candidatas else None

    if escolhida:
        beta, inv, sigma, r2, gl = escolhida['ajuste']
        termos = list(escolhida['termos'])
        coefs = list(beta)
        if escolhida['fixo'] == 'afinidade':   # o prior volta como coeficiente explícito
            termos.append('ln_demanda')
            coefs.append(prior)
        val = escolhida['val']
        for linha, u in zip(val['linhas'], usadas):
            linha.update({'cidade': u['cidade'], 'local': u['local'], 'data': u['data']})
        modelo = {
            'tipo': 'regressao',
            'formula': escolhida['nome'],
            'termos': termos,
            'beta': [round(b, 4) for b in coefs],
            'erro_padrao': [round(math.sqrt(max(sigma * sigma * inv[i][i], 0)), 4) for i in range(len(beta))],
            'inv': inv,
            'inv_termos': list(escolhida['termos']),
            'sigma': round(sigma, 4),
            'r2': round(r2, 3) if r2 is not None else None,
            'gl': gl,
            'n_shows': len(usadas), 'n_provas': len(provas),
            'afinidade_fixa': escolhida['fixo'] == 'afinidade',
            'validacao': val,
            'fator_faixa': (val or {}).get('fator_faixa', 1.0),
            'comparacao': [{'formula': c['nome'], 'coeficientes': c['k'],
                            'beta': [round(b, 3) for b in c['ajuste'][0]],
                            'termos': c['termos'], 'fixo': c['fixo'],
                            'r2': round(c['ajuste'][3], 3) if c['ajuste'][3] is not None else None,
                            'erro_mediano_pct': c['val']['erro_mediano_pct'],
                            'erro_medio_pct': c['val']['erro_medio_pct'],
                            'cobertura_pct': c['val']['cobertura_pct']} for c in candidatas],
            'cidades': sorted({c for c, _ in melhor}),
        }
    else:
        b1 = 1 - p['expoente_escala']
        b0 = math.log(p['conv_ref_pct'] / 100.0) - (b1 - 1) * math.log(p['base_ref'])
        modelo = {'tipo': 'referencia', 'formula': 'curva de referência (poucos shows medidos)',
                  'termos': ['const', 'ln_base', 'ln_demanda'],
                  'beta': [round(b0, 4), round(b1, 4), round(p['expoente_demanda'], 4)],
                  'erro_padrao': None, 'inv': None, 'inv_termos': None, 'sigma': 0.35, 'r2': None, 'gl': 0,
                  'n_shows': len(usadas), 'n_provas': len(provas), 'afinidade_fixa': True,
                  'validacao': None, 'comparacao': [], 'cidades': sorted({c for c, _ in melhor})}

    if usadas:
        modelo['faixa_base'] = [round(min(u['base'] for u in usadas)), round(max(u['base'] for u in usadas))]
        modelo['faixa_demanda'] = [round(min(u['demanda_rel'] for u in usadas), 2),
                                   round(max(u['demanda_rel'] for u in usadas), 2)]
    modelo['prior_demanda'] = p['expoente_demanda']
    if usadas:
        modelo['faixa_sombra'] = [round(min(u['sombra'] for u in usadas), 2),
                                  round(max(u['sombra'] for u in usadas), 2)]

    # quantas datas próprias cada praça recebeu nos últimos 12 meses (observado na agenda)
    hoje_ref = max([pr['data'] for pr in provas] + [f for lista in festivais.values() for f in lista] or ['2000-01'])
    datas = dict((cal or {}).get('datas_por_ano') or {})
    if provas:
        fim = max(pr['data'] for pr in provas)
        corte = f"{int(fim[:4]) - 1}{fim[4:]}"
        for pr in provas:
            if pr['data'] > corte:
                datas.setdefault(pr['cidade'], 0)
        for cid_nome in list(datas):
            n = len({pr['data'] for pr in provas if pr['cidade'] == cid_nome and pr['data'] > corte})
            datas[cid_nome] = max(datas[cid_nome], n)

    # preço de ingresso observado (inteira), por praça e no geral
    precos = {}
    for pr in provas:
        if pr.get('preco_inteira'):
            precos.setdefault(pr['cidade'], []).append(float(pr['preco_inteira']))
    todos = sorted(v for lista in precos.values() for v in lista)
    preco_geral = (todos[len(todos) // 2] if len(todos) % 2 else
                   (todos[len(todos) // 2 - 1] + todos[len(todos) // 2]) / 2) if todos else None

    return {
        'preco_por_cidade': {k: round(sorted(v)[len(v) // 2], 2) for k, v in precos.items()},
        'preco_geral': round(preco_geral, 2) if preco_geral else None,
        'fator_meia': p['fator_meia'],
        'fator_atualizacao': round(f_atualiza, 4), 'fator_fa': round(f_fa, 3),
        'ouvintes_snapshot': soma, 'ouvintes_atuais': atuais,
        'modelo': modelo, 'provas': provas, 'no_ajuste': no_ajuste, 'cidade_casa': casa_natal,
        'sombra': {c['cidade']: round(_sombra(c, cidades), 3) for c in cidades},
        'base_regiao': {c['cidade']: round(_base_regiao(c, cidades, base_de)) for c in cidades},
        'festivais': {nome: len(datas) for nome, datas in festivais.items()},
        'festivais_recentes': {c['cidade']: festivais_ate(c['cidade'], hoje_ref) for c in cidades},
        'limiares': {'crescer': p['crescer'], 'encolher': p['encolher']},
        'datas_por_ano': datas,
    }


# -------------------------------------------------------------------- predição

def estimar(cidade: dict, ctx: dict) -> dict:
    m = ctx['modelo']
    base = cidade['ouvintes'] * ctx['fator_atualizacao'] * ctx['fator_fa']
    u = {'base': base, 'demanda_rel': max(cidade.get('demanda_rel') or 1.0, 0.05),
         'e_casa': cidade['cidade'] == ctx.get('cidade_casa'), 'yt_3m': cidade.get('yt_3m'),
         'sombra': (ctx.get('sombra') or {}).get(cidade['cidade'], 0.0),
         'base_regiao': (ctx.get('base_regiao') or {}).get(cidade['cidade'], base),
         'festivais': (ctx.get('festivais_recentes') or {}).get(cidade['cidade'], 0)}
    mu = sum(b * TERMOS[t](u) for b, t in zip(m['beta'], m['termos']))

    # Guarda de extrapolação. A validação só mede acerto nas praças onde a banda
    # tocou — todas de afinidade média para alta. Quando a fórmula escolhida não
    # tem o termo de afinidade e a praça cai fora desse intervalo, corrigimos pelo
    # prior e alargamos a faixa: é extrapolação, e a tela diz isso.
    fora = 0.0
    if 'ln_demanda' not in m['termos'] and m.get('faixa_demanda'):
        lo, hi = m['faixa_demanda']
        dentro = min(max(u['demanda_rel'], lo), hi)
        fora = math.log(u['demanda_rel'] / dentro)
        mu += m.get('prior_demanda', 0.3) * fora
    if m.get('faixa_base'):
        blo, bhi = m['faixa_base']
        fora_base = math.log(base / min(max(base, blo), bhi))
    else:
        fora_base = 0.0

    # erro de predição = erro do modelo + onde esta praça cai na nuvem de shows
    if m['inv']:
        xv = [TERMOS[t](u) for t in m['inv_termos']]
        lev = sum(xv[i] * m['inv'][i][j] * xv[j] for i in range(len(xv)) for j in range(len(xv)))
    else:
        lev = 0.25
    extra = (m.get('prior_demanda', 0.3) * abs(fora)) ** 2 + (0.25 * abs(fora_base)) ** 2
    ep = math.sqrt((m['sigma'] ** 2) * (1.0 + max(lev, 0.0)) + extra) * (m.get('fator_faixa') or 1.0)

    p50 = math.exp(mu)
    p10, p90 = math.exp(mu - Z90 * ep), math.exp(mu + Z90 * ep)

    provas = sorted([pr for pr in ctx['provas'] if pr['cidade'] == cidade['cidade']],
                    key=lambda pr: pr['data'], reverse=True)
    piso = max([pr['publico_show'] for pr in provas if pr['esgotou'] and pr['publico_show']], default=0.0)
    if piso > p50:  # esgotou: casa cheia é piso, não teto
        f = piso / p50
        p50, p10, p90 = piso, max(p10 * f, piso * 0.9), p90 * f

    ultima = next((pr for pr in provas if pr.get('capacidade') and not pr.get('escalavel')), None)
    cap = float(ultima['capacidade']) if ultima else None
    chance = folga = None
    if provas:
        locais = sorted({pr['local'] for pr in provas})
        veredito = (f"já tocaram aqui ({', '.join(locais[:2])}), mas a capacidade da casa não é pública"
                    if not any(pr.get('capacidade') for pr in provas)
                    else 'casa de configuração variável: compare com a casa que quiser')
    else:
        veredito = 'praça ainda sem show próprio da banda'
    if cap:
        folga = p50 / cap
        chance = round((1 - _norm_cdf((math.log(cap) - math.log(p50)) / ep)) * 100)
        if folga >= ctx['limiares']['crescer']:
            veredito = 'cabe casa maior ou uma segunda data'
        elif folga >= ctx['limiares']['encolher']:
            veredito = 'avaliar a mesma casa; preço depende de bilheteria e custos'
        else:
            veredito = 'casa menor, festival ou mais mídia antes'

    datas = int((ctx.get('datas_por_ano') or {}).get(cidade['cidade'], 1))
    preco = (ctx.get('preco_por_cidade') or {}).get(cidade['cidade']) or ctx.get('preco_geral')
    ticket = round(preco * ctx['fator_meia']) if preco else None
    prova = lambda pr: {'local': pr['local'], 'data': pr['data'], 'capacidade': pr.get('capacidade'),
                        'ocupacao': pr.get('ocupacao'), 'tipo': pr.get('tipo', 'proprio'),
                        'motivo': pr.get('motivo'),
                        'publico': _dezena(pr['publico_show']) if pr['publico_show'] else None,
                        'esgotou': pr['esgotou'], 'fonte': pr.get('fonte', '')}
    return {
        'ouvintes_hoje': int(round(cidade['ouvintes'] * ctx['fator_atualizacao'])),
        'base_fa': int(round(base)),
        'conv_pct': round(p50 / base * 100, 2) if base else 0.0,
        'publico_min': _dezena(p10), 'publico': _dezena(p50), 'publico_max': _dezena(p90),
        'incerteza_pct': round((math.exp(Z90 * ep) - 1) * 100),
        'extrapolada': bool(abs(fora) > 0.01 or abs(fora_base) > 0.01),
        'ep': round(ep, 4),   # desvio da predição em log: dá a chance de esgotar qualquer casa
        'casa': next(i for i, teto in enumerate(CASAS) if p50 < teto),
        'confianca': 'alta' if any(pr['esgotou'] for pr in provas) else ('media' if provas else 'baixa'),
        'datas_ano': datas,
        'excedente': _dezena(p50 - cap) if cap and p50 > cap * 1.05 else None,
        'preco_inteira': preco,
        'ticket_medio': ticket,
        'bilheteria': int(round(p50 * ticket / 1000.0) * 1000) if ticket else None,
        'preco_proprio': bool((ctx.get('preco_por_cidade') or {}).get(cidade['cidade'])),
        'chance_esgotar': chance,
        'folga': round(folga, 2) if folga else None,
        'veredito_casa': veredito,
        'sombra': round(u['sombra'], 2),
        'base_regiao': int(u['base_regiao']),
        'festivais_24m': u['festivais'],
        'provas': [prova(pr) for pr in provas[:4]],
        'ancora': prova(ultima) if ultima else None,
    }


def aplicar(out: dict, cfg: dict) -> dict:
    ctx = calibrar(out['cidades'], out['kpis'], dict(cfg.get('calibracao') or {}), out.get('historico'), out.get('meta', {}).get('dados_ate'))
    for c in out['cidades']:
        e = estimar(c, ctx)
        c.update(e)
        c['ingressos_min'], c['ingressos_max'] = e['publico_min'], e['publico_max']
    out['publico_praca'] = {
        'fator_atualizacao': ctx['fator_atualizacao'], 'fator_fa': ctx['fator_fa'],
        'ouvintes_snapshot': ctx['ouvintes_snapshot'], 'ouvintes_atuais': ctx['ouvintes_atuais'],
        'modelo': {k: v for k, v in ctx['modelo'].items() if k != 'inv'},
        'limiares': ctx['limiares'], 'datas_por_ano': ctx['datas_por_ano'],
        'preco_geral': ctx['preco_geral'], 'preco_por_cidade': ctx['preco_por_cidade'],
        'fator_meia': ctx['fator_meia'],
        'shows_usados': sorted(
            [{'cidade': pr['cidade'], 'local': pr['local'], 'data': pr['data'],
              'capacidade': pr.get('capacidade'), 'ocupacao': pr.get('ocupacao'),
              'publico': _dezena(pr['publico_show']) if pr['publico_show'] else None,
              'peso': pr['peso'], 'esgotou': pr['esgotou'],
              'no_ajuste': (pr['cidade'], pr['data'], pr['local']) in ctx['no_ajuste'],
              'fator_tempo': pr['fator_tempo'],
              'fonte': pr.get('fonte', '')} for pr in ctx['provas']],
            key=lambda s: s['data'], reverse=True),
    }
    return out


def main(slug: str):
    cfg = json.loads((ROOT / 'artists' / slug / 'config.json').read_text(encoding='utf-8'))
    for alvo in (ROOT / 'app' / 'public' / 'data' / slug / 'data.json', ROOT / 'public' / slug / 'data.json'):
        if not alvo.exists():
            continue
        data = json.loads(alvo.read_text(encoding='utf-8'))
        aplicar(data, cfg)
        alvo.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
        m = data['publico_praca']['modelo']
        v = m.get('validacao')
        print(f"ok  {alvo.relative_to(ROOT)}  {m['tipo']}  n={m['n_shows']} de {m['n_provas']} shows  "
              f"beta={m['beta']}  sigma={m['sigma']}  R2={m['r2']}"
              + (f"  | leave-one-out: erro mediano {v['erro_mediano_pct']}%, "
                 f"médio {v['erro_medio_pct']}%, máximo {v['erro_maximo_pct']}%, "
                 f"cobertura {v['cobertura_pct']}%" if v else '  | sem validação'))


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
