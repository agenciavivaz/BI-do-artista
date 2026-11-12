import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Mede a largura do contêiner para desenhar o SVG em pixels reais (texto sempre legível). */
export function useLargura<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(Math.floor(el.getBoundingClientRect().width));
    const ro = new ResizeObserver((e) => setW(Math.floor(e[0].contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export function Responsivo({ altura, rotulo, children, tabIndex, onKeyDown, onPointerMove, onPointerLeave, onFocus, onBlur }: {
  altura: number | ((w: number) => number);
  rotulo: string;
  children: (w: number) => ReactNode;
  tabIndex?: number;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onPointerMove?: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const [ref, w] = useLargura<HTMLDivElement>();
  const h = typeof altura === 'function' ? altura(w) : altura;
  return (
    <div ref={ref} className="svg-wrap">
      {w > 0 && (
        <svg
          width={w} height={h} role="img" aria-label={rotulo}
          tabIndex={tabIndex} onKeyDown={onKeyDown} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} onFocus={onFocus} onBlur={onBlur}
          className="grafico"
        >
          {children(w)}
        </svg>
      )}
    </div>
  );
}

/** Marcas "redondas" para o eixo. */
export function ticks(min: number, max: number, n = 4): number[] {
  if (min === max) return [min];
  const bruto = (max - min) / n;
  const mag = Math.pow(10, Math.floor(Math.log10(bruto)));
  const f = bruto / mag;
  const passo = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
  const ini = Math.ceil(min / passo) * passo;
  const out: number[] = [];
  for (let v = ini; v <= max + passo * 1e-6; v += passo) out.push(Number(v.toFixed(10)));
  return out;
}

export const linear = (d0: number, d1: number, r0: number, r1: number) => (v: number) => d1 === d0 ? (r0 + r1) / 2 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

/** Leitura por teclado/ponteiro: setas percorrem os pontos; sem isso gráfico seria só visual. */
export function useScrub(n: number) {
  const [idx, setIdx] = useState<number | null>(null);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!n) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => (i == null ? 0 : Math.min(n - 1, i + 1))); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => (i == null ? n - 1 : Math.max(0, i - 1))); }
    else if (e.key === 'Home') { e.preventDefault(); setIdx(0); }
    else if (e.key === 'End') { e.preventDefault(); setIdx(n - 1); }
    else if (e.key === 'Escape') setIdx(null);
  };
  return { idx, setIdx, onKeyDown };
}

export function Leitura({ texto, dica }: { texto?: string | null; dica: string }) {
  return <p className={'leitura' + (texto ? ' ativa' : '')} aria-live="polite">{texto ?? dica}</p>;
}

export function Legenda({ itens }: { itens: { cor: string; texto: string; forma?: 'quadrado' | 'circulo' | 'linha'; opacidade?: number }[] }) {
  return (
    <ul className="legenda">
      {itens.map((i) => (
        <li key={i.texto}>
          <i className={'sw ' + (i.forma ?? 'quadrado')} style={{ background: i.cor, opacity: i.opacidade ?? 1 }} />
          {i.texto}
        </li>
      ))}
    </ul>
  );
}
