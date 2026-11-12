import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface MesaCtx {
  ativos: string[];
  usados: string[];
  definir: (ativos: string[], usados: string[]) => void;
}

const Ctx = createContext<MesaCtx | null>(null);

export function MesaProvider({ children }: { children: ReactNode }) {
  const [ativos, setAtivos] = useState<string[]>([]);
  const [usados, setUsados] = useState<string[]>([]);
  const definir = useCallback((a: string[], u: string[]) => { setAtivos(a); setUsados(u); }, []);
  const valor = useMemo(() => ({ ativos, usados, definir }), [ativos, usados, definir]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useMesa(): MesaCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useMesa fora do MesaProvider');
  return v;
}
