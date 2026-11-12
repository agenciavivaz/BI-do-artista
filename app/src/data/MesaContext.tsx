import { createContext, useCallback, useContext, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react';

interface MesaCtx {
  ativos: string[];
  usados: string[];
  definir: (ativos: string[], usados: string[]) => void;
  /** elemento da etapa de raciocínio atual: ponto de partida do cabo de luz */
  ancora: MutableRefObject<HTMLElement | null>;
  /** elementos dos canais, para o cabo achar o destino */
  canais: MutableRefObject<Record<string, HTMLElement | null>>;
}

const Ctx = createContext<MesaCtx | null>(null);

export function MesaProvider({ children }: { children: ReactNode }) {
  const [ativos, setAtivos] = useState<string[]>([]);
  const [usados, setUsados] = useState<string[]>([]);
  const ancora = useRef<HTMLElement | null>(null);
  const canais = useRef<Record<string, HTMLElement | null>>({});
  const definir = useCallback((a: string[], u: string[]) => { setAtivos(a); setUsados(u); }, []);
  const valor = useMemo(() => ({ ativos, usados, definir, ancora, canais }), [ativos, usados, definir]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useMesa(): MesaCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useMesa fora do MesaProvider');
  return v;
}
