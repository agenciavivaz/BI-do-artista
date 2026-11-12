"""
Prepara os dados do app (v2) a partir do pipeline.

    python3 scripts/sync_app.py fresno

1. Roda analytics + build (relatório v1) + answers (catálogo de perguntas).
2. Copia data.json, respostas.json e o config público para app/public/data/<slug>/.
3. Copia o relatório v1 para app/public/<slug>/relatorio/index.html.
"""
import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import answers  # noqa: E402
import build as build_v1  # noqa: E402
from analytics import ROOT  # noqa: E402

PUBLIC_CFG = ('nome', 'subtitulo', 'cidade_origem', 'desde', 'carta', 'contato', 'tema')


def main(slug):
    build_v1.render(slug)
    answers.main(slug)
    dst = ROOT / 'app' / 'public' / 'data' / slug
    dst.mkdir(parents=True, exist_ok=True)
    shutil.copy(ROOT / 'public' / slug / 'data.json', dst / 'data.json')
    shutil.copy(ROOT / 'artists' / slug / 'respostas.json', dst / 'respostas.json')
    cfg = json.loads((ROOT / 'artists' / slug / 'config.json').read_text(encoding='utf-8'))
    (dst / 'config.json').write_text(json.dumps({k: cfg[k] for k in PUBLIC_CFG if k in cfg}, ensure_ascii=False, indent=2), encoding='utf-8')
    rel = ROOT / 'app' / 'public' / slug / 'relatorio'
    rel.mkdir(parents=True, exist_ok=True)
    shutil.copy(ROOT / 'public' / slug / 'index.html', rel / 'index.html')
    print(f'ok  app/public/data/{slug}/  +  app/public/{slug}/relatorio/')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
