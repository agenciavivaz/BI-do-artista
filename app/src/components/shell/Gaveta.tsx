import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useReducedMotion } from '../../lib/useMedia';
import { IcFechar } from './Icones';

interface Props { aberta: boolean; onFechar: () => void; titulo: string; children: ReactNode; id: string }

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/** Gaveta lateral acessível: foco preso, Esc fecha, devolve o foco a quem abriu. */
export function Gaveta({ aberta, onFechar, titulo, children, id }: Props) {
  const painel = useRef<HTMLDivElement>(null);
  const reduzir = useReducedMotion();

  useEffect(() => {
    if (!aberta) return;
    const anterior = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => painel.current?.querySelector<HTMLElement>('[data-foco-inicial]')?.focus(), 30);
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onFechar(); return; }
      if (e.key !== 'Tab' || !painel.current) return;
      const itens = Array.from(painel.current.querySelectorAll<HTMLElement>(FOCAVEIS));
      if (!itens.length) return;
      const primeiro = itens[0], ultimo = itens[itens.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    };
    document.addEventListener('keydown', tecla, true);
    return () => { window.clearTimeout(t); document.removeEventListener('keydown', tecla, true); anterior?.focus?.(); };
  }, [aberta, onFechar]);

  const d = reduzir ? 0 : 0.22;
  return (
    <AnimatePresence>
      {aberta && (
        <>
          <motion.div className="gaveta-fundo" onClick={onFechar} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: d }} />
          <motion.div
            ref={painel}
            className="gaveta"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-titulo`}
            initial={reduzir ? { opacity: 0 } : { x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduzir ? { opacity: 0 } : { x: 40, opacity: 0 }}
            transition={{ duration: d, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <header className="gaveta-topo">
              <h2 id={`${id}-titulo`}>{titulo}</h2>
              <button type="button" className="btn btn-leve gaveta-fechar" onClick={onFechar} aria-label="Fechar" data-foco-inicial>
                <IcFechar />
              </button>
            </header>
            <div className="gaveta-corpo">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
