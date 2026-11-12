import { useEffect, useState } from 'react';

export function useMedia(query: string): boolean {
  const [ok, setOk] = useState(() => (typeof window === 'undefined' ? false : window.matchMedia(query).matches));
  useEffect(() => {
    const m = window.matchMedia(query);
    const f = () => setOk(m.matches);
    f();
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, [query]);
  return ok;
}
export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)');
