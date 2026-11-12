"""
Gera o painel estático de um artista.

    python3 scripts/build.py fresno        # um artista
    python3 scripts/build.py --all         # todos em artists/

Saída: public/<slug>/index.html (autocontido) + public/<slug>/data.json
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from analytics import build, ROOT  # noqa: E402


def render(slug: str):
    data, cfg = build(slug)
    tpl = (ROOT / 'template' / 'dashboard.html').read_text(encoding='utf-8')
    tema = cfg['tema']
    for k, v in tema.items():
        tpl = tpl.replace(f'__C_{k}__', v)
    tpl = tpl.replace('__F_titulo__', tema.get('fonte_titulo', 'Archivo Black'))
    tpl = tpl.replace('__F_texto__', tema.get('fonte_texto', 'Inter'))
    title = f"{cfg['nome']} · Raio-X de carreira"
    desc = f"Onde tocar, quanto cobrar, quando lançar e o que postar: o raio-x de dados da carreira de {cfg['nome']}."
    tpl = tpl.replace('__TITLE__', title).replace('__DESC__', desc)
    js = lambda o: json.dumps(o, ensure_ascii=False, default=str).replace('</', '<\\/')
    cfg_pub = {k: v for k, v in cfg.items() if k in ('nome', 'subtitulo', 'cidade_origem', 'desde', 'carta', 'contato')}
    tpl = tpl.replace('__DATA__', js(data)).replace('__CFG__', js(cfg_pub))
    out = ROOT / 'public' / slug
    out.mkdir(parents=True, exist_ok=True)
    (out / 'index.html').write_text(tpl, encoding='utf-8')
    (out / 'data.json').write_text(json.dumps(data, ensure_ascii=False, indent=1, default=str), encoding='utf-8')
    print(f'ok  public/{slug}/index.html  ({len(tpl)//1024} KB, {len(data["recomendacoes"])} decisões)')


if __name__ == '__main__':
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    slugs = [p.name for p in (ROOT / 'artists').iterdir() if p.is_dir()] if args[0] == '--all' else args
    for s in slugs:
        render(s)
