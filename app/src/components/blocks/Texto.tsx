import { dec, int } from '../../lib/format';

export function LinhaDoTempo({ itens }: { itens: { ano: number; marco: string; status: string }[] }) {
  return (
    <ol className="timeline">
      {itens.map((i, k) => {
        const oportunidade = i.status.startsWith('oportunidade');
        return (
          <li key={k} className={oportunidade ? 'op' : ''}>
            <span className="tl-ano num">{i.ano}</span>
            <span className="tl-corpo"><strong>{i.marco}</strong><small>{oportunidade ? 'Oportunidade' : i.status}</small></span>
          </li>
        );
      })}
    </ol>
  );
}

export function Citacoes({ itens }: { itens: { texto: string; curtidas: number }[] }) {
  return (
    <div className="citacoes">
      {itens.slice(0, 2).map((c, i) => (
        <blockquote key={i}>
          <p>“{c.texto.length > 260 ? c.texto.slice(0, 257).trimEnd() + '…' : c.texto}”</p>
          <footer className="apoio">{int(c.curtidas)} curtidas no YouTube</footer>
        </blockquote>
      ))}
    </div>
  );
}

export function ListaLinhas({ linhas }: { linhas: { rotulo: string; sub?: string; valor: string; href?: string }[] }) {
  return (
    <ul className="lista-linhas">
      {linhas.map((l, i) => (
        <li key={i}>
          <span className="ll-corpo">
            {l.href ? <a href={l.href} target="_blank" rel="noopener noreferrer">{l.rotulo}</a> : <strong>{l.rotulo}</strong>}
            {l.sub && <small className="apoio">{l.sub}</small>}
          </span>
          <span className="ll-valor num">{l.valor}</span>
        </li>
      ))}
    </ul>
  );
}
export const _usado = dec;
