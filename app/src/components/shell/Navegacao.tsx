import { NavLink, useLocation } from 'react-router-dom';
import { useArtist } from '../../data/ArtistContext';
import { IcDados, IcInicio, IcMapa, IcSimular } from './Icones';

/** As cinco seções. O rótulo diz o que a pessoa vai fazer, não o nome da tela. */
export function useSecoes() {
  const { base } = useArtist();
  return [
    { to: base, rotulo: 'Início', icone: <IcInicio />, end: true },
    { to: `${base}/simular/ingressos`, rotulo: 'Shows', icone: <IcSimular />, prefixo: `${base}/simular` },
    { to: `${base}/streaming`, rotulo: 'Streaming', icone: <IcDados /> },
    { to: `${base}/mapa`, rotulo: 'Mapa', icone: <IcMapa /> },
    { to: `${base}/dados`, rotulo: 'Dados', icone: <IcDados /> },
  ];
}

/** Menu do cabeçalho (≥900px). */
export function Menu() {
  const { pathname } = useLocation();
  const secoes = useSecoes();
  return (
    <nav className="menu" aria-label="Seções">
      <ul>
        {secoes.map((s) => (
          <li key={s.to}>
            <NavLink
              to={s.to}
              end={s.end}
              className={({ isActive }) => 'menu-item' + (isActive || (s.prefixo && pathname.startsWith(s.prefixo)) ? ' ativo' : '')}
            >
              {s.rotulo}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Barra inferior (<900px): o mesmo menu, com ícone, ao alcance do polegar. */
export function BarraInferior() {
  const { pathname } = useLocation();
  const secoes = useSecoes();
  return (
    <nav className="tabbar" aria-label="Seções">
      <ul>
        {secoes.map((s) => (
          <li key={s.to}>
            <NavLink
              to={s.to}
              end={s.end}
              className={({ isActive }) => 'tab' + (isActive || (s.prefixo && pathname.startsWith(s.prefixo)) ? ' ativo' : '')}
            >
              {s.icone}
              <span>{s.rotulo}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
