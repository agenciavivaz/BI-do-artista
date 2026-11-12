import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { evento } from '../lib/track';

interface UiCtx { conversaoAberta: boolean; abrirConversao: (origem?: string) => void; fecharConversao: () => void }
const Ctx = createContext<UiCtx | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [conversaoAberta, setAberta] = useState(false);
  const abrirConversao = useCallback((origem = 'rail') => { setAberta(true); evento('cta_aberto', { origem }); }, []);
  const fecharConversao = useCallback(() => setAberta(false), []);
  const v = useMemo(() => ({ conversaoAberta, abrirConversao, fecharConversao }), [conversaoAberta, abrirConversao, fecharConversao]);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}
export function useUi(): UiCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useUi fora do UiProvider');
  return v;
}
