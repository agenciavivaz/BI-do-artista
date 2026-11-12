"""
Público provável por praça — modelo calibrado na bilheteria real.

Por que existe
-------------
A primeira versão usava "3% a 5% dos ouvintes mensais da cidade". Isso errava por
3 a 5 vezes para baixo: em Porto Alegre a conta dava 720–1.200 pessoas enquanto a
banda quase esgota o Auditório Araújo Vianna (3.628 lugares) e toca lá duas vezes
por ano. Três motivos:

1. **Denominador velho.** Os ouvintes por cidade vêm de um snapshot de 2024,
   enquanto o total de ouvintes mensais é de hoje.
2. **Ouvinte mensal não é fã.** "Ouvintes mensais" conta quem tocou a música nos
   últimos 28 dias. Quem compra ingresso de uma banda de 20 anos inclui o fã que
   já não streama toda semana. O Spotify mede isso pelo outro lado: os "super
   listeners" são ~2% dos ouvintes mensais e compram ~50% dos ingressos
   (Spotify Fan Study, 2025) — ou seja, a conta não é uma fatia fixa do ouvinte
   mensal. Aqui a base é corrigida pela lealdade (seguidores ÷ ouvintes).
3. **A fatia não é constante.** Praça pequena e apaixonada converte muito mais
   que metrópole grande. A fatia cai conforme a base da cidade cresce.

O que o mercado faz
-------------------
Promotor não usa taxa de conversão de streaming: ele ancora no que a banda já
vendeu naquela praça e escala para as praças novas por comparação. É isso que
este módulo faz — a taxa é **calibrada** nos shows reais (âncoras em
`artists/<slug>/config.json → calibracao.ancoras`), não arbitrada.

O modelo
--------
    ouvintes_hoje = ouvintes_snapshot x (ouvintes_atuais / soma_do_snapshot)
    base_fa       = ouvintes_hoje x (seguidores / ouvintes)            # lealdade
    conversao     = conv_ref x (base_fa/40 mil)^(-b) x demanda_rel^g x bonus_casa
    publico       = base_fa x conversao                                # +/- banda

Dois efeitos, os dois com evidência nos shows da banda:

* **escala** (`-b`): quanto maior a base da praça, menor a fatia que vira ingresso.
  São Paulo tem 4x a base de Porto Alegre e converte metade — metrópole tem mais
  oferta de show competindo pela mesma noite.
* **afinidade** (`g`): praça com muito fã por habitante (`demanda_rel`, o mesmo
  índice que define a faixa de cachê) converte mais. Entra sublinear (g = 0,3):
  afinidade alta ajuda, mas não multiplica.

`conv_ref` (a fatia numa praça de 40 mil fãs e afinidade na mediana) e `b` saem de
mínimos quadrados em escala log sobre as âncoras com ocupação conhecida — 2
âncoras dão ajuste exato; a partir da 3ª o resíduo aparece em
`publico_praca.residuo_pct`. Sem âncora, usa os padrões abaixo.

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

# Faixas de casa (PRD §5.5).
CASAS = [400, 800, 2000, 5000, float('inf')]

BASE_REF = 40000.0  # praça de referência: 40 mil fãs

PADRAO = {
    'conv_ref_pct': 6.1,        # fatia que compra ingresso numa praça de 40 mil fãs
    'expoente_escala': 0.296,   # b — queda da fatia conforme a praça cresce
    'expoente_demanda': 0.3,    # g — peso da afinidade local (demanda_rel)
    'bonus_cidade_casa': 1.0,   # cidade de origem; 1.0 = sem bônus (a escala já explica)
    'conv_min_pct': 2.0,
    'conv_max_pct': 20.0,
    'banda': {'alta': 0.12, 'media': 0.20, 'baixa': 0.30},
}


def _dezena(x: float) -> int:
    """Arredonda para dezena (10) ou centena (100) conforme a ordem de grandeza."""
    if x >= 2000:
        return int(round(x / 100.0) * 100)
    return int(round(x / 10.0) * 10)


def _ocupado(a: dict) -> float | None:
    """Público realizado da âncora, quando a ocupação é conhecida."""
    if a.get('publico'):
        return float(a['publico'])
    if a.get('capacidade') and a.get('ocupacao') is not None:
        return float(a['capacidade']) * float(a['ocupacao'])
    return None


def calibrar(cidades: list[dict], kpis: dict, cal: dict) -> dict:
    """Devolve os parâmetros globais do modelo, calibrados nas âncoras."""
    p = {**PADRAO, **{k: v for k, v in (cal or {}).items() if k in PADRAO}}
    soma = sum(c['ouvintes'] for c in cidades) or 1
    atuais = kpis.get('ouvintes') or soma
    f_atualiza = atuais / soma
    f_fa = (kpis.get('lealdade') or 100) / 100.0
    ancoras = list((cal or {}).get('ancoras') or [])
    por_cidade = {a['cidade']: a for a in ancoras}
    casa = (cal or {}).get('cidade_casa')

    def base_de(c):
        return c['ouvintes'] * f_atualiza * f_fa

    # ---- ajuste de c e b nas âncoras com ocupação conhecida: ln(conv) = ln(c) - b*ln(base)
    pontos = []
    for c in cidades:
        a = por_cidade.get(c['cidade'])
        real = _ocupado(a) if a else None
        if not real:
            continue
        base = base_de(c)
        if base <= 0:
            continue
        conv = real / base / (p['bonus_cidade_casa'] if c['cidade'] == casa else 1.0)
        conv /= max(c.get('demanda_rel') or 1.0, 0.05) ** p['expoente_demanda']
        pontos.append((math.log(base), math.log(conv * 100)))

    b = p['expoente_escala']
    lnc = math.log(p['conv_ref_pct']) + b * math.log(BASE_REF)  # ln(conv) em base = 1
    residuo = None
    if len(pontos) >= 2:
        n = len(pontos)
        mx = sum(x for x, _ in pontos) / n
        my = sum(y for _, y in pontos) / n
        var = sum((x - mx) ** 2 for x, _ in pontos)
        cov = sum((x - mx) * (y - my) for x, y in pontos)
        if var > 1e-9:
            b = -cov / var
            lnc = my + b * mx
            if n > 2:
                erros = [abs(math.exp(lnc - b * x) / math.exp(y) - 1) for x, y in pontos]
                residuo = round(sum(erros) / n * 100, 1)
    elif len(pontos) == 1:
        x, y = pontos[0]
        lnc = y + b * x

    return {
        'fator_atualizacao': round(f_atualiza, 4),
        'fator_fa': round(f_fa, 3),
        'conv_ref_pct': round(math.exp(lnc - b * math.log(BASE_REF)), 2),
        'base_ref': int(BASE_REF),
        'expoente_escala': round(b, 4),
        'expoente_demanda': p['expoente_demanda'],
        'bonus_cidade_casa': p['bonus_cidade_casa'],
        'cidade_casa': casa,
        'conv_min_pct': p['conv_min_pct'],
        'conv_max_pct': p['conv_max_pct'],
        'banda': p['banda'],
        'ancoras': ancoras,
        'ancoras_calibradas': len(pontos),
        'residuo_pct': residuo,
        'ouvintes_snapshot': soma,
        'ouvintes_atuais': atuais,
    }


def estimar(cidade: dict, ctx: dict) -> dict:
    """Campos de público provável de uma praça."""
    base = cidade['ouvintes'] * ctx['fator_atualizacao'] * ctx['fator_fa']
    bonus = ctx['bonus_cidade_casa'] if cidade['cidade'] == ctx.get('cidade_casa') else 1.0
    pen = max(cidade.get('demanda_rel') or 1.0, 0.05)
    conv = (ctx['conv_ref_pct'] * ((base / ctx['base_ref']) ** -ctx['expoente_escala'])
            * (pen ** ctx['expoente_demanda']) * bonus) if base > 0 else 0.0
    conv = max(ctx['conv_min_pct'], min(ctx['conv_max_pct'], conv))
    esperado = base * conv / 100.0

    ancora = next((a for a in ctx['ancoras'] if a['cidade'] == cidade['cidade']), None)
    realizado = _ocupado(ancora) if ancora else None
    if realizado:
        conf = 'alta'
    elif ancora or cidade['ouvintes'] >= 5000:
        conf = 'media'
    else:
        conf = 'baixa'
    banda = ctx['banda'][conf]

    faixa = next(i for i, teto in enumerate(CASAS) if esperado < teto)
    datas = int((ctx.get('datas_por_ano') or {}).get(cidade['cidade'], 1))
    return {
        'ouvintes_hoje': int(round(cidade['ouvintes'] * ctx['fator_atualizacao'])),
        'base_fa': int(round(base)),
        'conv_pct': round(conv, 2),
        'publico_min': _dezena(esperado * (1 - banda)),
        'publico': _dezena(esperado),
        'publico_max': _dezena(esperado * (1 + banda)),
        'casa': faixa,
        'confianca': conf,
        'datas_ano': datas,
        'publico_ano': _dezena(esperado * datas) if datas > 1 else None,
        'ancora': ({
            'local': ancora['local'], 'data': ancora['data'],
            'capacidade': ancora.get('capacidade'), 'ocupacao': ancora.get('ocupacao'),
            'publico': _dezena(realizado) if realizado else None,
            'fonte': ancora.get('fonte', ''),
        } if ancora else None),
    }


def aplicar(out: dict, cfg: dict) -> dict:
    """Escreve os campos de público em cada praça e o resumo em out['publico_praca']."""
    cal = dict(cfg.get('calibracao') or {})
    cal.setdefault('cidade_casa', cfg.get('cidade_origem'))
    ctx = calibrar(out['cidades'], out['kpis'], cal)
    ctx['datas_por_ano'] = cal.get('datas_por_ano') or {}
    for c in out['cidades']:
        e = estimar(c, ctx)
        c.update(e)
        # compatibilidade: a tabela e as respostas ainda leem estes dois campos
        c['ingressos_min'], c['ingressos_max'] = e['publico_min'], e['publico_max']
    resumo = {k: v for k, v in ctx.items() if k != 'ancoras'}
    resumo['ancoras'] = ctx['ancoras']
    resumo['datas_por_ano'] = ctx['datas_por_ano']
    out['publico_praca'] = resumo
    return out


def main(slug: str):
    cfg = json.loads((ROOT / 'artists' / slug / 'config.json').read_text(encoding='utf-8'))
    for alvo in (ROOT / 'app' / 'public' / 'data' / slug / 'data.json', ROOT / 'public' / slug / 'data.json'):
        if not alvo.exists():
            continue
        data = json.loads(alvo.read_text(encoding='utf-8'))
        aplicar(data, cfg)
        alvo.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
        p = data['publico_praca']
        print(f"ok  {alvo.relative_to(ROOT)}  "
              f"conv_ref={p['conv_ref_pct']}%  b={p['expoente_escala']}  "
              f"âncoras={p['ancoras_calibradas']}  resíduo={p['residuo_pct']}")


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
