import { useEffect, useRef } from 'react';
import { useMesa } from '../../data/MesaContext';
import { useReducedMotion } from '../../lib/useMedia';

/** Cabo de luz: liga a etapa atual do raciocínio aos canais acesos da mesa. */
export function CaboDeLuz() {
  const { ativos, ancora, canais } = useMesa();
  const svg = useRef<SVGSVGElement>(null);
  const reduzir = useReducedMotion();

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    if (reduzir || !ativos.length) { el.replaceChildren(); return; }
    let raf = 0;
    const NS = 'http://www.w3.org/2000/svg';
    const desenhar = () => {
      const a = ancora.current;
      el.replaceChildren();
      if (a && a.isConnected) {
        const ra = a.getBoundingClientRect();
        for (const id of ativos) {
          const c = canais.current[id];
          if (!c) continue;
          const rc = c.getBoundingClientRect();
          if (!rc.width || !ra.width) continue;
          const lado = rc.left > ra.right - 8; // mesa à direita do conteúdo
          let d: string, fx: number, fy: number;
          if (lado) {
            const x0 = ra.right, y0 = ra.top + ra.height / 2;
            fx = rc.left + rc.width / 2; fy = rc.top + 6;
            d = `M${x0},${y0} C${x0 + (fx - x0) * 0.6},${y0} ${fx},${fy - 50} ${fx},${fy}`;
          } else {
            const x0 = ra.left + ra.width / 2, y0 = ra.top;
            fx = rc.left + rc.width / 2; fy = rc.bottom;
            const meio = (y0 + fy) / 2;
            d = `M${x0},${y0} C${x0},${meio} ${fx},${meio} ${fx},${fy}`;
          }
          const p = document.createElementNS(NS, 'path');
          p.setAttribute('d', d);
          p.setAttribute('class', 'cabo-linha');
          const ponto = document.createElementNS(NS, 'circle');
          ponto.setAttribute('cx', String(fx)); ponto.setAttribute('cy', String(fy)); ponto.setAttribute('r', '3.5');
          ponto.setAttribute('class', 'cabo-ponto');
          el.append(p, ponto);
        }
      }
      raf = requestAnimationFrame(desenhar);
    };
    raf = requestAnimationFrame(desenhar);
    return () => { cancelAnimationFrame(raf); el.replaceChildren(); };
  }, [ativos, ancora, canais, reduzir]);

  return <svg ref={svg} className="cabo" aria-hidden="true" />;
}
