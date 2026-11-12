import { useId, useMemo, useState } from 'react';
import { normalizar } from '../../lib/match';
import type { Cidade } from '../../types';

/** Busca de cidade: campo + lista de botões (toque e teclado funcionam igual). */
export function CidadeBusca({ cidades, valor, onChange }: { cidades: Cidade[]; valor: Cidade; onChange: (c: Cidade) => void }) {
  const [texto, setTexto] = useState('');
  const id = useId();
  const achadas = useMemo(() => {
    const t = normalizar(texto);
    const base = [...cidades].sort((a, b) => b.ouvintes - a.ouvintes);
    return (t ? base.filter((c) => normalizar(c.cidade).includes(t)) : base).slice(0, 8);
  }, [texto, cidades]);
  return (
    <div className="campo">
      <label htmlFor={`${id}-q`} className="campo-rotulo">Cidade</label>
      <input
        id={`${id}-q`} className="campo-input" type="search" autoComplete="off" placeholder={`Buscar entre ${cidades.length} cidades`}
        value={texto} onChange={(e) => setTexto(e.target.value)}
      />
      <ul className="chips cidade-opcoes" aria-label="Cidades">
        {achadas.map((c) => (
          <li key={c.cidade}>
            <button type="button" className={'chip' + (c.cidade === valor.cidade ? ' sel' : '')} aria-pressed={c.cidade === valor.cidade} onClick={() => onChange(c)}>
              {c.cidade}
            </button>
          </li>
        ))}
        {!achadas.length && <li className="apoio">Nenhuma cidade com esse nome.</li>}
      </ul>
    </div>
  );
}
