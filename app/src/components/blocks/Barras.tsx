import { compact, dec, int, signed } from '../../lib/format';

export interface Linha {
  rotulo: string;
  valor: number;
  texto?: string; // valor formatado
  sub?: string;
  cor?: string;
  opaco?: boolean;
}

/** Barras horizontais em HTML/CSS: texto sempre legível, vale para positivo e negativo. */
export function BarrasH({ linhas, divergente, maxLinhas, rotuloValor }: { linhas: Linha[]; divergente?: boolean; maxLinhas?: number; rotuloValor?: string }) {
  const lista = maxLinhas ? linhas.slice(0, maxLinhas) : linhas;
  const max = Math.max(...lista.map((l) => Math.abs(l.valor)), 1e-9);
  const temNeg = divergente ?? lista.some((l) => l.valor < 0);
  return (
    <ul className={'hbarras' + (temNeg ? ' div' : '')} aria-label={rotuloValor}>
      {lista.map((l, i) => {
        const pct = (Math.abs(l.valor) / max) * (temNeg ? 50 : 100);
        const neg = l.valor < 0;
        const cor = l.cor ?? (temNeg ? (neg ? 'var(--dado-neg)' : 'var(--dado-pos)') : 'var(--dado-1)');
        return (
          <li key={i} className="hbarra">
            <span className="hb-rotulo">{l.rotulo}{l.sub && <small>{l.sub}</small>}</span>
            <span className="hb-trilho" aria-hidden="true">
              {temNeg && <span className="hb-zero" />}
              <span
                className="hb-barra"
                style={{
                  width: `${pct}%`,
                  background: cor,
                  opacity: l.opaco ? 0.55 : 1,
                  left: temNeg ? (neg ? `${50 - pct}%` : '50%') : 0,
                }}
              />
            </span>
            <span className="hb-valor num">{l.texto ?? dec(l.valor, 1)}</span>
          </li>
        );
      })}
    </ul>
  );
}

export const FORMATOS: Record<string, (v: number) => string> = {
  yt_3m: (v) => signed(v, 0),
  pct: (v) => `${int(v)}%`,
  views: (v) => compact(v),
  afinidade: (v) => dec(v, 1),
  popularidade: (v) => int(v),
  lealdade: (v) => `${int(v)} por 100`,
  ajustado: (v) => signed(v, 1),
  ouvintes: (v) => compact(v),
  por100k: (v) => int(v),
};
