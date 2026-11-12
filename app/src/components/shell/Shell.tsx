import { useEffect } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { ArtistProvider, useArtist } from '../../data/ArtistContext';
import { MesaProvider } from '../../data/MesaContext';
import { UiProvider } from '../../data/UiContext';
import { dataLonga } from '../../lib/format';
import { BarraDePergunta } from './BarraDePergunta';
import { CaboDeLuz } from './CaboDeLuz';
import { MesaDeCruzamento } from './MesaDeCruzamento';
import { PainelConversao } from './PainelConversao';
import { Rail } from './Rail';

function Estrutura() {
  const { data, config } = useArtist();
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); document.getElementById('conteudo')?.focus({ preventScroll: true }); }, [pathname]);
  return (
    <div className="shell">
      <a className="skip" href="#conteudo">Pular para o conteúdo</a>
      <Rail />
      <header className="topo">
        <BarraDePergunta />
        <p className="topo-data apoio">{config.nome} · dados até <span className="num">{dataLonga(data.meta.dados_ate)}</span></p>
      </header>
      <MesaDeCruzamento />
      <main id="conteudo" tabIndex={-1} className="principal">
        <Outlet />
      </main>
      <CaboDeLuz />
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
