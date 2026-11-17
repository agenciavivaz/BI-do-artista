import { useMemo } from 'react';
import { compact, dataCurta, dataLonga, dec, int, signed } from '../../lib/format';
import { Leitura, Legenda, Responsivo, linear, ticks, useScrub } from './chart';

const M = { l: 50, r: 14, t: 14, b: 30 };

export interface PontoLinha { x: string; v: number; min?: number; max?: number; proj?: boolean }

/** Linha com faixa indicativa opcional (histórico + previsão). */
export function GraficoLinha({ pontos, fmt = compact, rotulo, unidade = '', altura = 250 }: { pontos: PontoLinha[]; fmt?: (v: number) => string; rotulo: string; unidade?: string; altura?: number }) {
  const { idx, setIdx, onKeyDown } = useScrub(pontos.length);
  const temProj = pontos.some((p) => p.proj);
  const lo = Math.min(...pontos.map((p) => p.min ?? p.v));
  const hi = Math.max(...pontos.map((p) => p.max ?? p.v));
  const pad = (hi - lo) * 0.08 || 1;
  const leitura = idx == null ? null : (() => {
    const p = pontos[idx];
    const faixa = p.min != null && p.max != null && p.proj ? ` (faixa indicativa ${fmt(p.min)} a ${fmt(p.max)})` : '';
    return `${p.x}: ${fmt(p.v)}${unidade}${faixa}${p.proj ? ' · projeção' : ''}`;
  })();
  return (
    <>
      <Leitura texto={leitura} dica="Passe o mouse ou use as setas para ler cada mês." />
      <Responsivo
        altura={altura} rotulo={rotulo} tabIndex={0} onKeyDown={onKeyDown}
        onBlur={() => setIdx(null)}
        onPointerLeave={() => setIdx(null)}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const w = r.width - M.l - M.r;
          const i = Math.round(((e.clientX - r.left - M.l) / w) * (pontos.length - 1));
          setIdx(Math.max(0, Math.min(pontos.length - 1, i)));
        }}
      >
        {(w) => {
          const x = linear(0, pontos.length - 1, M.l, w - M.r);
          const y = linear(lo - pad, hi + pad, altura - M.b, M.t);
          const yt = ticks(lo - pad, hi + pad, 4);
          const passoX = Math.max(1, Math.ceil(pontos.length / Math.max(2, Math.floor((w - M.l) / 64))));
          const hist = pontos.filter((p) => !p.proj);
          const proj = pontos.filter((p) => p.proj);
          const ultimoHist = hist.length - 1;
          const path = (arr: PontoLinha[], off: number) => arr.map((p, i) => `${i ? 'L' : 'M'}${x(i + off).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
          const faixa = temProj
            ? `M${x(ultimoHist)},${y(pontos[ultimoHist].v)}` +
              proj.map((p, i) => `L${x(ultimoHist + 1 + i)},${y(p.max ?? p.v)}`).join('') +
              [...proj].reverse().map((p, i) => `L${x(ultimoHist + proj.length - i)},${y(p.min ?? p.v)}`).join('') + 'Z'
            : '';
          return (
            <g>
              {yt.map((t) => (
                <g key={t}>
                  <line x1={M.l} x2={w - M.r} y1={y(t)} y2={y(t)} className="gr-grade" />
                  <text x={M.l - 8} y={y(t) + 4} textAnchor="end" className="gr-texto num">{compact(t)}</text>
                </g>
              ))}
              {pontos.map((p, i) => (i % passoX === 0 ? <text key={i} x={x(i)} y={altura - 8} textAnchor="middle" className="gr-texto">{p.x}</text> : null))}
              {faixa && <path d={faixa} fill="var(--dado-1)" opacity={0.2} />}
              <path d={path(hist, 0)} className="gr-linha" stroke="var(--dado-1)" />
              {proj.length > 0 && <path d={`M${x(ultimoHist)},${y(hist[ultimoHist].v)}` + proj.map((p, i) => `L${x(ultimoHist + 1 + i)},${y(p.v)}`).join('')} className="gr-linha" stroke="var(--dado-1)" strokeDasharray="6 5" />}
              {idx != null && (
                <g>
                  <line x1={x(idx)} x2={x(idx)} y1={M.t} y2={altura - M.b} className="gr-guia" />
                  <circle cx={x(idx)} cy={y(pontos[idx].v)} r={5} fill="var(--dado-1)" stroke="var(--coxia)" strokeWidth={2} />
                </g>
              )}
            </g>
          );
        }}
      </Responsivo>
      {temProj && <Legenda itens={[{ cor: 'var(--dado-1)', texto: 'Histórico', forma: 'linha' }, { cor: 'var(--dado-1)', texto: 'Projeção e faixa indicativa', forma: 'linha', opacidade: 0.5 }]} />}
    </>
  );
}

/** 12 barras divergentes por mês (sazonalidade e simulador de janela). */
export function BarrasMensais({ valores, fortes = [], fracos = [], selecionado, fmt = (v) => signed(v, 1), rotulo, altura = 220 }: {
  valores: { mes: string; v: number }[]; fortes?: string[]; fracos?: string[]; selecionado?: number | null; fmt?: (v: number) => string; rotulo: string; altura?: number;
}) {
  const { idx, setIdx, onKeyDown } = useScrub(valores.length);
  const lo = Math.min(0, ...valores.map((d) => d.v));
  const hi = Math.max(0, ...valores.map((d) => d.v));
  const pad = (hi - lo) * 0.18 || 1;
  const leitura = idx == null ? null : `${valores[idx].mes}: ${fmt(valores[idx].v)}`;
  const marcados = new Set([...fortes, ...fracos]);
  return (
    <>
      <Leitura texto={leitura} dica="Passe o mouse ou use as setas para ler cada mês." />
      <Responsivo
        altura={altura} rotulo={rotulo} tabIndex={0} onKeyDown={onKeyDown} onBlur={() => setIdx(null)} onPointerLeave={() => setIdx(null)}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const i = Math.floor(((e.clientX - r.left - M.l) / (r.width - M.l - M.r)) * valores.length);
          setIdx(Math.max(0, Math.min(valores.length - 1, i)));
        }}
      >
        {(w) => {
          const bw = (w - M.l - M.r) / valores.length;
          const y = linear(lo - pad, hi + pad, altura - M.b, M.t);
          const y0 = y(0);
          const yt = ticks(lo - pad, hi + pad, 4);
          const estreito = bw < 34;
          const vmax = Math.max(...valores.map((d) => d.v)), vmin = Math.min(...valores.map((d) => d.v));
          return (
            <g>
              {yt.map((t) => (
                <g key={t}>
                  <line x1={M.l} x2={w - M.r} y1={y(t)} y2={y(t)} className="gr-grade" />
                  <text x={M.l - 8} y={y(t) + 4} textAnchor="end" className="gr-texto num">{dec(t, 0)}%</text>
                </g>
              ))}
              <line x1={M.l} x2={w - M.r} y1={y0} y2={y0} className="gr-zero" />
              {valores.map((d, i) => {
                const bx = M.l + i * bw + bw * 0.14;
                const alt = Math.abs(y(d.v) - y0);
                const forte = marcados.size === 0 || marcados.has(d.mes);
                const cor = d.v >= 0 ? 'var(--dado-pos)' : 'var(--dado-neg)';
                const sel = selecionado === i;
                return (
                  <g key={d.mes}>
                    <rect x={bx} width={bw * 0.72} y={d.v >= 0 ? y0 - alt : y0} height={Math.max(alt, 1)} rx={2} fill={cor} opacity={forte ? 1 : 0.42} stroke={sel || idx === i ? 'var(--refletor)' : 'none'} strokeWidth={2} />
                    {(estreito ? (d.v === vmax || d.v === vmin || sel) : (marcados.has(d.mes) || sel)) && (
                      <text x={bx + bw * 0.36} y={d.v >= 0 ? y0 - alt - 6 : y0 + alt + 14} textAnchor="middle" className="gr-valor num">{fmt(d.v)}</text>
                    )}
                    <text x={bx + bw * 0.36} y={altura - 8} textAnchor="middle" className={'gr-texto' + (sel || idx === i ? ' sel' : '')}>{estreito ? d.mes[0].toUpperCase() : d.mes}</text>
                  </g>
                );
              })}
            </g>
          );
        }}
      </Responsivo>
    </>
  );
}

/** Mini-série de um show: ouvintes da cidade (% vs nov/2025) com a data do show marcada. */
function MiniCaso({ c }: { c: any }) {
  const pts = c.serie.map((p: any) => ({ t: new Date(p.d + 'T12:00:00').getTime(), v: p.v as number }));
  const tShow = new Date(c.data + 'T12:00:00').getTime();
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t;
  const lo = Math.min(0, ...pts.map((p: any) => p.v));
  const hi = Math.max(...pts.map((p: any) => p.v));
  const { idx, setIdx, onKeyDown } = useScrub(pts.length);
  return (
    <figure className="mini">
      <figcaption>
        <strong>{c.titulo}</strong>
        <span className="apoio">show em {dataCurta(c.data)}</span>
      </figcaption>
      <p className="mini-num"><span className="num">{signed(c.lift, 0, ' pontos')}</span> <span className="apoio">entre o dia do show e o pico</span></p>
      <Responsivo
        altura={150} rotulo={`${c.titulo}: ouvintes na cidade, de ${signed(c.antes, 0)} no dia do show a ${signed(c.pico, 0)} no pico, em relação a nov/2025`}
        tabIndex={0} onKeyDown={onKeyDown} onBlur={() => setIdx(null)} onPointerLeave={() => setIdx(null)}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const i = Math.round(((e.clientX - r.left - 36) / (r.width - 36 - 10)) * (pts.length - 1));
          setIdx(Math.max(0, Math.min(pts.length - 1, i)));
        }}
      >
        {(w) => {
          const x = linear(t0, t1, 36, w - 10);
          const y = linear(lo, hi * 1.1, 150 - 22, 10);
          const d = pts.map((p: any, i: number) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
          return (
            <g>
              {ticks(lo, hi, 3).map((t) => (
                <g key={t}><line x1={36} x2={w - 10} y1={y(t)} y2={y(t)} className="gr-grade" /><text x={30} y={y(t) + 4} textAnchor="end" className="gr-texto num">{signed(t, 0, '')}</text></g>
              ))}
              <line x1={36} x2={w - 10} y1={y(0)} y2={y(0)} className="gr-zero" />
              <line x1={x(tShow)} x2={x(tShow)} y1={8} y2={128} stroke="var(--refletor)" strokeWidth={1.5} strokeDasharray="4 4" />
              <text x={x(tShow) + (x(tShow) > w * 0.7 ? -6 : 6)} y={16} textAnchor={x(tShow) > w * 0.7 ? 'end' : 'start'} className="gr-texto sel">show</text>
              <path d={d} className="gr-linha" stroke="var(--dado-1)" />
              {idx != null && <circle cx={x(pts[idx].t)} cy={y(pts[idx].v)} r={5} fill="var(--dado-1)" stroke="var(--coxia)" strokeWidth={2} />}
              <text x={36} y={146} className="gr-texto">{dataCurta(c.serie[0].d)}</text>
              <text x={w - 10} y={146} textAnchor="end" className="gr-texto">{dataCurta(c.serie[c.serie.length - 1].d)}</text>
            </g>
          );
        }}
      </Responsivo>
      <p className="leitura ativa" aria-live="polite">{idx == null ? `${c.descricao}.` : `${dataLonga(c.serie[idx].d)}: ${signed(c.serie[idx].v, 1)} vs nov/2025`}</p>
    </figure>
  );
}

export function CasosShow({ casos }: { casos: any[] }) {
  return (
    <>
      <div className="minis">{casos.map((c) => <MiniCaso key={c.coluna + c.data} c={c} />)}</div>
      <p className="apoio nota">Cada linha mostra os ouvintes da cidade em relação a nov/2025. A linha pontilhada é o dia do show.</p>
    </>
  );
}

/** Dispersão no tempo: cada ponto é um show; vertical = efeito nos ouvintes 1 mês depois. */
export function PontosEventos({ eventos, porTipo }: { eventos: any[]; porTipo: any[] }) {
  const ordenados = useMemo(() => [...eventos].sort((a, b) => a.data.localeCompare(b.data)), [eventos]);
  const { idx, setIdx, onKeyDown } = useScrub(ordenados.length);
  const festival = 'var(--dado-2)', proprio = 'var(--dado-1)';
  const lo = Math.min(0, ...ordenados.map((e) => e.ajustado));
  const hi = Math.max(0, ...ordenados.map((e) => e.ajustado));
  const t = (d: string) => new Date(d + 'T12:00:00').getTime();
  const e = idx == null ? null : ordenados[idx];
  const leitura = e ? `${e.evento} · ${dataCurta(e.data)} · ${e.tipo}${e.capacidade ? ` · ${int(e.capacidade)} lugares` : ''} · efeito ${signed(e.ajustado, 1)}` : null;
  const med = (tipo: string) => porTipo.find((p) => p.tipo.startsWith(tipo));
  return (
    <>
      <Leitura texto={leitura} dica="Passe o mouse ou use as setas para ler cada show." />
      <Responsivo
        altura={280} rotulo={`Efeito de ${ordenados.length} shows nos ouvintes, festivais e shows próprios`} tabIndex={0} onKeyDown={onKeyDown} onBlur={() => setIdx(null)} onPointerLeave={() => setIdx(null)}
        onPointerMove={(ev) => {
          const r = ev.currentTarget.getBoundingClientRect();
          const px = ev.clientX - r.left;
          const x0 = t(ordenados[0].data), x1 = t(ordenados[ordenados.length - 1].data);
          const alvo = x0 + ((px - 44) / (r.width - 44 - 14)) * (x1 - x0);
          let melhor = 0, dist = Infinity;
          ordenados.forEach((o, i) => { const dd = Math.abs(t(o.data) - alvo); if (dd < dist) { dist = dd; melhor = i; } });
          setIdx(melhor);
        }}
      >
        {(w) => {
          const x0 = t(ordenados[0].data), x1 = t(ordenados[ordenados.length - 1].data);
          const x = linear(x0, x1, 44, w - 14);
          const y = linear(lo - 2, hi + 2, 280 - 30, 12);
          const anos = Array.from(new Set(ordenados.map((o) => o.data.slice(0, 4))));
          return (
            <g>
              {ticks(lo - 2, hi + 2, 4).map((tk) => (
                <g key={tk}><line x1={44} x2={w - 14} y1={y(tk)} y2={y(tk)} className="gr-grade" /><text x={36} y={y(tk) + 4} textAnchor="end" className="gr-texto num">{signed(tk, 0, '%')}</text></g>
              ))}
              <line x1={44} x2={w - 14} y1={y(0)} y2={y(0)} className="gr-zero" />
              {anos.map((a) => <text key={a} x={Math.max(44, Math.min(w - 20, x(t(`${a}-07-01`))))} y={272} textAnchor="middle" className="gr-texto">{a}</text>)}
              {ordenados.map((o, i) => {
                const fest = o.tipo.startsWith('Festival');
                const sel = idx === i;
                return fest
                  ? <rect key={i} x={x(t(o.data)) - 5} y={y(o.ajustado) - 5} width={10} height={10} rx={1} transform={`rotate(45 ${x(t(o.data))} ${y(o.ajustado)})`} fill={festival} opacity={sel ? 1 : 0.85} stroke={sel ? 'var(--refletor)' : 'var(--coxia)'} strokeWidth={sel ? 2.5 : 1.5} />
                  : <circle key={i} cx={x(t(o.data))} cy={y(o.ajustado)} r={5.5} fill={proprio} opacity={sel ? 1 : 0.85} stroke={sel ? 'var(--refletor)' : 'var(--coxia)'} strokeWidth={sel ? 2.5 : 1.5} />;
              })}
            </g>
          );
        }}
      </Responsivo>
      <Legenda itens={[{ cor: proprio, texto: `Show próprio${med('Show') ? ` (mediana ${signed(med('Show').mediana, 1)})` : ''}`, forma: 'circulo' }, { cor: festival, texto: `Festival / turnê coletiva${med('Festival') ? ` (mediana ${signed(med('Festival').mediana, 1)})` : ''}`, forma: 'quadrado' }]} />
    </>
  );
}
