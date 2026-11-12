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
    'crescer': 1.15,              # P50 >= 1,15x a casa -> casa maior ou outra data
    'encolher': 0.70,             # P50 <= 0,70x a casa -> casa menor ou festival
}


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


def calibrar(cidades: list[dict], kpis: dict, cal: dict, historico: list[dict] | None = None) -> dict:
    p = {**PADRAO, **{k: v for k, v in (cal or {}).items() if k in PADRAO}}
    soma = sum(c['ouvintes'] for c in cidades) or 1
    atuais = kpis.get('ouvintes') or soma
    f_atualiza = atuais / soma
    f_fa = (kpis.get('lealdade') or 100) / 100.0
    por_nome = {c['cidade']: c for c in cidades}
    base_de = lambda c: c['ouvintes'] * f_atualiza * f_fa
    no_tempo = _fator_tempo(historico)

    provas = []
    for a in ((cal or {}).get('ancoras') or []):
        if a.get('tipo', 'proprio') == 'festival':
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
        provas.append({**a, 'publico_show': pub_show, 'peso': peso, 'esgotou': esgotou,
                       'fator_tempo': round(ft, 3), 'base': base_de(c) * ft,
                       'sem_bilheteria': not pub_show,
                       'demanda_rel': max(c.get('demanda_rel') or 1.0, 0.05)})

    # censura: por cidade, só a maior evidência entra no ajuste
    melhor: dict[tuple[str, str], dict] = {}
    for pr in (q for q in provas if q['publico_show'] and q['peso'] > 0 and not q.get('fora_do_ajuste')):
        chave = (pr['cidade'], pr['data'][:4])
        atual = melhor.get(chave)
        if atual is None or pr['publico_show'] > atual['publico_show']:
            melhor[chave] = pr
    usadas = sorted(melhor.values(), key=lambda x: -x['publico_show'])
    no_ajuste = {(u['cidade'], u['data'], u['local']) for u in usadas}

    # com poucos shows, ajustar 3 coeficientes é superajuste: fixa a afinidade no
    # prior do config e ajusta só o intercepto e a escala.
    b2_fixo = None if len(usadas) >= 10 else p['expoente_demanda']
    ajuste = None
    if len(usadas) >= 4:
        y = [math.log(u['publico_show']) for u in usadas]
        w = [u['peso'] for u in usadas]
        if b2_fixo is None:
            ajuste = _wls([[1.0, math.log(u['base']), math.log(u['demanda_rel'])] for u in usadas], y, w)
        else:
            yo = [y[i] - b2_fixo * math.log(u['demanda_rel']) for i, u in enumerate(usadas)]
            parcial = _wls([[1.0, math.log(u['base'])] for u in usadas], yo, w)
            if parcial:
                b, iv, sg, r2, gl = parcial
                ajuste = ([b[0], b[1], b2_fixo],
                          [[iv[0][0], iv[0][1], 0.0], [iv[1][0], iv[1][1], 0.0], [0.0, 0.0, 0.0]],
                          sg, r2, gl)

    if ajuste:
        beta, inv, sigma, r2, gl = ajuste
        modelo = {
            'tipo': 'regressao',
            'beta': [round(b, 4) for b in beta],
            'erro_padrao': [round(math.sqrt(max(sigma * sigma * inv[i][i], 0)), 4) for i in range(3)],
            'inv': inv, 'sigma': round(sigma, 4),
            'r2': round(r2, 3) if r2 is not None else None, 'gl': gl,
            'n_shows': len(usadas), 'n_provas': len(provas),
            'afinidade_fixa': b2_fixo is not None,
            'cidades': sorted({c for c, _ in melhor}),
        }
    else:
        b1 = 1 - p['expoente_escala']
        b0 = math.log(p['conv_ref_pct'] / 100.0) - (b1 - 1) * math.log(p['base_ref'])
        modelo = {'tipo': 'referencia', 'beta': [round(b0, 4), round(b1, 4), round(p['expoente_demanda'], 4)],
                  'erro_padrao': None, 'inv': None, 'sigma': 0.35, 'r2': None, 'gl': 0,
                  'n_shows': len(usadas), 'n_provas': len(provas), 'cidades': sorted(melhor)}

    # quantas datas próprias cada praça recebeu nos últimos 12 meses (observado na agenda)
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

    return {
        'fator_atualizacao': round(f_atualiza, 4), 'fator_fa': round(f_fa, 3),
        'ouvintes_snapshot': soma, 'ouvintes_atuais': atuais,
        'modelo': modelo, 'provas': provas, 'no_ajuste': no_ajuste,
        'limiares': {'crescer': p['crescer'], 'encolher': p['encolher']},
        'datas_por_ano': datas,
    }


# -------------------------------------------------------------------- predição

def estimar(cidade: dict, ctx: dict) -> dict:
    m = ctx['modelo']
    base = cidade['ouvintes'] * ctx['fator_atualizacao'] * ctx['fator_fa']
    pen = max(cidade.get('demanda_rel') or 1.0, 0.05)
    x = [1.0, math.log(base), math.log(pen)]
    mu = sum(b * xi for b, xi in zip(m['beta'], x))

    # erro de predição = erro do modelo + onde esta praça cai na nuvem de shows
    lev = sum(x[i] * m['inv'][i][j] * x[j] for i in range(3) for j in range(3)) if m['inv'] else 0.25
    ep = m['sigma'] * math.sqrt(1.0 + max(lev, 0.0))

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
            veredito = 'mesma casa, com espaço para subir preço'
        else:
            veredito = 'casa menor, festival ou mais mídia antes'

    datas = int((ctx.get('datas_por_ano') or {}).get(cidade['cidade'], 1))
    prova = lambda pr: {'local': pr['local'], 'data': pr['data'], 'capacidade': pr.get('capacidade'),
                        'ocupacao': pr.get('ocupacao'),
                        'publico': _dezena(pr['publico_show']) if pr['publico_show'] else None,
                        'esgotou': pr['esgotou'], 'fonte': pr.get('fonte', '')}
    return {
        'ouvintes_hoje': int(round(cidade['ouvintes'] * ctx['fator_atualizacao'])),
        'base_fa': int(round(base)),
        'conv_pct': round(p50 / base * 100, 2) if base else 0.0,
        'publico_min': _dezena(p10), 'publico': _dezena(p50), 'publico_max': _dezena(p90),
        'incerteza_pct': round((math.exp(Z90 * ep) - 1) * 100),
        'ep': round(ep, 4),   # desvio da predição em log: dá a chance de esgotar qualquer casa
        'casa': next(i for i, teto in enumerate(CASAS) if p50 < teto),
        'confianca': 'alta' if any(pr['esgotou'] for pr in provas) else ('media' if provas else 'baixa'),
        'datas_ano': datas,
        'excedente': _dezena(p50 - cap) if cap and p50 > cap * 1.05 else None,
        'chance_esgotar': chance,
        'folga': round(folga, 2) if folga else None,
        'veredito_casa': veredito,
        'provas': [prova(pr) for pr in provas[:4]],
        'ancora': prova(ultima) if ultima else None,
    }


def aplicar(out: dict, cfg: dict) -> dict:
    ctx = calibrar(out['cidades'], out['kpis'], dict(cfg.get('calibracao') or {}), out.get('historico'))
    for c in out['cidades']:
        e = estimar(c, ctx)
        c.update(e)
        c['ingressos_min'], c['ingressos_max'] = e['publico_min'], e['publico_max']
    out['publico_praca'] = {
        'fator_atualizacao': ctx['fator_atualizacao'], 'fator_fa': ctx['fator_fa'],
        'ouvintes_snapshot': ctx['ouvintes_snapshot'], 'ouvintes_atuais': ctx['ouvintes_atuais'],
        'modelo': {k: v for k, v in ctx['modelo'].items() if k != 'inv'},
        'limiares': ctx['limiares'], 'datas_por_ano': ctx['datas_por_ano'],
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
        print(f"ok  {alvo.relative_to(ROOT)}  {m['tipo']}  n={m['n_shows']} de {m['n_provas']} shows  "
              f"beta={m['beta']}  sigma={m['sigma']}  R2={m['r2']}")


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
