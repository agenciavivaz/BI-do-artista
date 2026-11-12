import { useMemo, useState } from 'react';
import { compact, dec, int, signed } from '../../lib/format';
import { FAIXAS, type Cidade } from '../../types';
import { Leitura, Legenda, Responsivo } from './chart';

// Silhueta simplificada do Brasil (mesmo polígono do relatório v1).
const BR: [number, number][] = [[-51.6,4.4],[-50.0,1.8],[-49.2,0.3],[-48.5,-0.8],[-46.8,-0.9],[-45.3,-1.6],[-44.3,-2.5],[-42.5,-2.8],[-41.0,-2.9],[-39.5,-3.0],[-38.5,-3.7],[-37.3,-4.8],[-36.0,-5.1],[-35.2,-5.8],[-34.8,-7.1],[-34.9,-8.1],[-35.3,-9.0],[-35.7,-9.7],[-36.4,-10.5],[-37.1,-11.1],[-38.0,-12.4],[-38.5,-13.0],[-39.0,-14.8],[-39.1,-16.5],[-39.2,-17.7],[-39.7,-19.3],[-40.3,-20.3],[-41.0,-21.6],[-41.9,-22.4],[-42.0,-22.9],[-43.2,-23.0],[-44.6,-23.3],[-45.4,-23.8],[-46.3,-24.0],[-47.4,-24.7],[-48.0,-25.3],[-48.6,-26.5],[-48.5,-27.6],[-48.8,-28.6],[-49.7,-29.4],[-50.3,-30.4],[-51.0,-31.0],[-52.1,-32.2],[-52.7,-33.1],[-53.4,-33.7],[-53.5,-33.1],[-53.2,-32.6],[-53.8,-32.0],[-55.3,-31.0],[-56.0,-30.8],[-57.6,-30.2],[-56.8,-29.2],[-56.0,-28.2],[-55.0,-27.3],[-53.7,-26.2],[-54.6,-25.5],[-54.3,-24.0],[-55.6,-22.6],[-57.8,-22.1],[-58.0,-20.0],[-57.7,-19.0],[-58.4,-16.3],[-60.2,-16.2],[-60.4,-13.5],[-62.5,-13.0],[-64.4,-12.4],[-65.4,-10.8],[-66.6,-9.9],[-68.6,-11.0],[-70.6,-11.0],[-70.5,-9.5],[-72.2,-10.0],[-73.0,-9.4],[-73.9,-7.4],[-73.0,-5.0],[-70.0,-4.2],[-69.4,-1.2],[-69.6,0.6],[-70.0,1.5],[-67.3,2.0],[-66.9,1.2],[-65.5,0.8],[-64.2,1.9],[-63.4,2.3],[-64.0,4.0],[-62.8,4.0],[-61.0,4.5],[-60.7,5.2],[-60.0,4.5],[-59.6,4.0],[-59.8,2.4],[-59.0,1.3],[-56.6,1.9],[-55.0,2.4],[-54.0,2.2],[-52.9,2.2],[-51.6,4.4]];

const LON0 = -74.5, LON1 = -34, LAT0 = 5.6, LAT1 = -34.2;
const K = Math.cos((15 * Math.PI) / 180);
const RAZAO = ((LAT0 - LAT1) / ((LON1 - LON0) * K)); // altura / largura

export function descricaoCidade(c: Cidade) {
  return `${c.cidade}: ${int(c.ouvintes)} ouvintes, ${int(c.por100k)} por 100 mil habitantes (${dec(c.demanda_rel, 1)}x a mediana), ${FAIXAS[c.faixa].rotulo.toLowerCase()}`;
}

interface Props {
  cidades: Cidade[];
  destacar?: string[];
  onSelecionar?: (c: Cidade) => void;
  selecionada?: string | null;
  larguraMax?: number;
}

export function MapaBR({ cidades, destacar = [], onSelecionar, selecionada, larguraMax = 560 }: Props) {
  const [hover, setHover] = useState<Cidade | null>(null);
  const max = useMemo(() => Math.max(...cidades.map((c) => c.ouvintes)), [cidades]);
  const mostrar = hover ?? cidades.find((c) => c.cidade === selecionada) ?? null;

  return (
    <div className="mapa" style={{ maxWidth: larguraMax }}>
      <Leitura texto={mostrar ? descricaoCidade(mostrar) : null} dica={onSelecionar ? 'Toque numa bolha para abrir a cidade.' : 'Passe o mouse ou toque numa bolha para ler a cidade.'} />
      <Responsivo altura={(w) => Math.round(w * RAZAO) + 8} rotulo={`Mapa do Brasil com ${cidades.length} cidades; o tamanho da bolha é o número de ouvintes e a cor é a faixa de cachê`}>
        {(w) => {
          const pad = 6;
          const sc = (w - pad * 2) / ((LON1 - LON0) * K);
          const P = ([lon, lat]: [number, number]): [number, number] => [pad + (lon - LON0) * K * sc, pad + (LAT0 - lat) * sc];
          const rMax = Math.max(12, w * 0.058);
          const lista = cidades.filter((c) => c.coord).sort((a, b) => b.ouvintes - a.ouvintes);
          const pos = lista.map((c) => { const [x, y] = P(c.coord!); return { c, x, y, r: 3 + Math.sqrt(c.ouvintes / max) * rMax }; });
          const colocados: { x: number; y: number; w: number; h: number }[] = [];
          const bate = (b: { x: number; y: number; w: number; h: number }) =>
            b.x < 0 || b.x + b.w > w || colocados.some((q) => !(b.x > q.x + q.w || b.x + b.w < q.x || b.y > q.y + q.h || b.y + b.h < q.y));
          const rotulos = pos.filter((p) => {
            const forcado = destacar.includes(p.c.cidade) || p.c.cidade === selecionada;
            const wRot = p.c.cidade.length * 6.6 + 6;
            const cand = [
              { x: p.x + p.r + 3, y: p.y - 9, w: wRot, h: 14 },
              { x: p.x - p.r - 3 - wRot, y: p.y - 9, w: wRot, h: 14 },
              { x: p.x - wRot / 2, y: p.y - p.r - 17, w: wRot, h: 14 },
              { x: p.x - wRot / 2, y: p.y + p.r + 3, w: wRot, h: 14 },
            ];
            let box = cand.find((b) => !bate(b));
            if (!box && forcado) box = cand[0];
            if (!box || (!forcado && colocados.length >= (w < 420 ? 6 : 10))) return false;
            colocados.push(box);
            (p as any).box = box;
            return true;
          });
          return (
            <g>
              <path d={'M' + BR.map((p) => P(p).join(',')).join('L') + 'Z'} fill="var(--palco)" stroke="var(--ferragem)" strokeWidth={1.5} />
              {[...pos].reverse().map(({ c, x, y, r }) => {
                const f = FAIXAS[c.faixa];
                const destaque = destacar.includes(c.cidade);
                const sel = c.cidade === selecionada || hover?.cidade === c.cidade;
                return (
                  <circle
                    key={c.cidade} cx={x} cy={y} r={r}
                    fill={f.neutro ? 'var(--dado-neutro)' : 'var(--dado-1)'} fillOpacity={f.neutro ? 1 : f.opacidade}
                    stroke={sel || destaque ? 'var(--refletor)' : 'var(--luz)'} strokeOpacity={sel || destaque ? 1 : 0.35} strokeWidth={sel || destaque ? 2.5 : 1}
                    style={{ cursor: onSelecionar ? 'pointer' : 'default' }}
                    onPointerEnter={() => setHover(c)} onPointerLeave={() => setHover(null)}
                    onClick={() => (onSelecionar ? onSelecionar(c) : setHover(c))}
                  />
                );
              })}
              {rotulos.map((p: any) => (
                <text key={p.c.cidade} x={p.box.x} y={p.box.y + 11} className="mapa-rotulo">{p.c.cidade}</text>
              ))}
            </g>
          );
        }}
      </Responsivo>
      <Legenda
        itens={(Object.keys(FAIXAS) as Cidade['faixa'][]).map((k) => ({
          cor: FAIXAS[k].neutro ? 'var(--dado-neutro)' : 'var(--dado-1)',
          opacidade: FAIXAS[k].neutro ? 1 : FAIXAS[k].opacidade,
          texto: FAIXAS[k].rotulo,
          forma: 'circulo',
        }))}
      />
      <p className="apoio nota">Área da bolha = ouvintes mensais no Spotify. Maior: {compact(max)}.</p>
    </div>
  );
}

export const resumoCidade = (c: Cidade) => `${c.cidade}: ${signed(c.yt_3m ?? 0, 0)} no YouTube em 3 meses`;
