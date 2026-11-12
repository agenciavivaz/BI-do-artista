import { NavLink, useLocation } from 'react-router-dom';
import { useArtist } from '../../data/ArtistContext';
import { useUi } from '../../data/UiContext';
import { IcDados, IcInicio, IcMapa, IcPerguntar, IcSimular, IcVivo } from './Icones';

export function Rail() {
  const { base, config } = useArtist();
  const { abrirConversao } = useUi();
  const { pathname } = useLocation();
  const itens = [
    { to: base, rotulo: 'Início', icone: <IcInicio />, end: true },
    { to: `${base}/perguntas`, rotulo: 'Perguntar', icone: <IcPerguntar /> },
    { to: `${base}/simular/ingressos`, rotulo: 'Simular', icone: <IcSimular />, prefixo: `${base}/simular` },
    { to: `${base}/mapa`, rotulo: 'Mapa', icone: <IcMapa /> },
    { to: `${base}/dados`, rotulo: 'Dados', icone: <IcDados /> },
  ];
  return (
    <nav className="rail" aria-label="Principal">
      <NavLink to={base} className="rail-capa" aria-label={`${config.nome}: início`} title={config.nome}>
        <span className="avatar" aria-hidden="true">{config.nome.slice(0, 1)}</span>
      </NavLink>
      <ul className="rail-itens">
        {itens.map((i) => (
          <li key={i.to}>
            <NavLink
              to={i.to}
              end={i.end}
              className={({ isActive }) => 'rail-item' + (isActive || (i.prefixo && pathname.startsWith(i.prefixo)) ? ' ativo' : '')}
            >
              {i.icone}
              <span>{i.rotulo}</span>
            </NavLink>
          </li>
        ))}
      </ul>
      <button type="button" className="rail-vivo" onClick={() => abrirConversao('rail')}>
        <IcVivo />
        <span>Quer isso vivo?</span>
      </button>
    </nav>
  );
}
