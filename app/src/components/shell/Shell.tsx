import { useEffect } from 'react';
import { Link, Outlet, useLocation, useParams } from 'react-router-dom';
import { ArtistProvider, useArtist } from '../../data/ArtistContext';
import { MesaProvider } from '../../data/MesaContext';
import { UiProvider, useUi } from '../../data/UiContext';
import { dataLonga } from '../../lib/format';
import { BarraDePergunta } from './BarraDePergunta';
import { BarraInferior, Menu } from './Navegacao';
import { PainelConversao } from './PainelConversao';

function Estrutura() {
  const { data, config, base } = useArtist();
  const { abrirConversao } = useUi();
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); document.getElementById('conteudo')?.focus({ preventScroll: true }); }, [pathname]);
  const inicio = pathname === base || pathname === `${base}/`;

  return (
    <div className="shell">
      <a className="skip" href="#conteudo">Pular para o conteúdo</a>

      <header className="topo">
        <div className="topo-linha faixa">
          <Link to={base} className="marca">
            {config.fotos?.capa && <img className="marca-foto" src={config.fotos.capa} alt="" width={36} height={36} loading="eager" />}
            <span className="marca-nome">{config.nome}</span>
            <span className="marca-sistema">Camarim</span>
          </Link>
          <Menu />
          <button type="button" className="btn btn-primario topo-cta" onClick={() => abrirConversao('topo')}>Sobre o piloto</button>
        </div>
        {!inicio && (
          <div className="topo-busca faixa">
            <BarraDePergunta />
            <p className="topo-data apoio">dados até <span className="num">{dataLonga(data.meta.dados_ate)}</span></p>
          </div>
        )}
      </header>

      <main id="conteudo" tabIndex={-1} className="principal">
        <Outlet />
      </main>

      <BarraInferior />
      <PainelConversao />
    </div>
  );
}

export function Shell() {
  const { slug = 'fresno' } = useParams();
  return (
    <ArtistProvider slug={slug}>
      <UiProvider>
        <MesaProvider>
          <Estrutura />
        </MesaProvider>
      </UiProvider>
    </ArtistProvider>
  );
}
