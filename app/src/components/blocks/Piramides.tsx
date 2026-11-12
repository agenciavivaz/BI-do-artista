import { dec } from '../../lib/format';
import { Legenda, Responsivo } from './chart';

const NOMES: Record<string, string> = { streaming: 'Streaming', tiktok: 'TikTok', instagram: 'Instagram', social: 'Redes sociais', youtube: 'YouTube' };

function Piramide({ nome, p, max }: { nome: string; p: any; max: number }) {
  const linhas: { faixa: string; M: number; F: number }[] = p.faixas;
  const top = p.segmento_top;
  const rowH = 30;
  return (
    <figure className="piramide">
      <figcaption>
        <strong>{NOMES[nome] ?? nome}</strong>
        <span className="apoio">
          {dec(p.masc, 0)}% homens · {dec(p.fem, 0)}% mulheres
        </span>
      </figcaption>
      <Responsivo
        altura={linhas.length * rowH + 4}
        rotulo={`${NOMES[nome] ?? nome}: ${dec(p.masc, 0)}% homens e ${dec(p.fem, 0)}% mulheres. Maior grupo: ${top.faixa} anos, ${top.sexo === 'M' ? 'homens' : 'mulheres'}, ${dec(top.pct, 1)}%`}
      >
        {(w) => {
          const centro = w / 2, labW = 46, lado = (w - labW) / 2 - 34;
          return (
            <g>
              {linhas.map((l, i) => {
                const y = i * rowH + 3;
                const wm = (l.M / max) * lado, wf = (l.F / max) * lado;
                return (
                  <g key={l.faixa}>
                    <rect x={centro - labW / 2 - wm} y={y} width={Math.max(wm, 0.5)} height={rowH - 8} rx={2} fill="var(--dado-2)" />
                    <rect x={centro + labW / 2} y={y} width={Math.max(wf, 0.5)} height={rowH - 8} rx={2} fill="var(--dado-1)" />
                    <text x={centro} y={y + 14} textAnchor="middle" className="gr-texto">{l.faixa}</text>
                    {l.M >= max * 0.2 && <text x={centro - labW / 2 - wm - 5} y={y + 14} textAnchor="end" className="gr-valor num">{dec(l.M, 1)}%</text>}
                    {l.F >= max * 0.2 && <text x={centro + labW / 2 + wf + 5} y={y + 14} className="gr-valor num">{dec(l.F, 1)}%</text>}
                  </g>
                );
              })}
            </g>
          );
        }}
      </Responsivo>
      <p className="piramide-top">Maior grupo: <strong>{top.faixa} anos, {top.sexo === 'M' ? 'homens' : 'mulheres'} ({dec(top.pct, 1)}%)</strong></p>
    </figure>
  );
}

export function Piramides({ publico, plataformas }: { publico: any; plataformas: string[] }) {
  const lista = plataformas.filter((k) => publico[k]);
  const max = Math.max(...lista.flatMap((k) => publico[k].faixas.flatMap((f: any) => [f.M, f.F])), 1);
  return (
    <>
      <Legenda itens={[{ cor: 'var(--dado-2)', texto: 'Homens' }, { cor: 'var(--dado-1)', texto: 'Mulheres' }]} />
      <div className="piramides">{lista.map((k) => <Piramide key={k} nome={k} p={publico[k]} max={max} />)}</div>
      <p className="apoio nota">Porcentagem do público de cada plataforma, por idade e gênero. Todas na mesma escala.</p>
    </>
  );
}
