import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { SimCache } from '../components/sims/SimCache';
import { SimIngressos } from '../components/sims/SimIngressos';
import { SimJanela } from '../components/sims/SimJanela';
import { useArtist } from '../data/ArtistContext';

const SIMS = {
  ingressos: { nome: 'Ingressos por cidade', texto: 'Quantas pessoas vão ao show numa cidade, e que tamanho de casa vale a pena.' },
  cache: { nome: 'Prêmio de cachê', texto: 'Quanto pedir a mais (ou a menos) conforme a demanda da cidade.' },
  janela: { nome: 'Janela de lançamento', texto: 'O que esperar dos ouvintes conforme o mês em que você solta o trabalho.' },
} as const;

export default function Simular() {
  const { base } = useArtist();
  const { sim } = useParams();
  const [params] = useSearchParams();
  const cidade = params.get('cidade');
  if (!sim || !(sim in SIMS)) return <Navigate replace to={`${base}/simular/ingressos`} />;
  const atual = sim as keyof typeof SIMS;
  return (
    <div className="simular">
      <h1 className="titulo-pagina">Simular</h1>
      <nav className="abas" aria-label="Simuladores">
        {(Object.keys(SIMS) as (keyof typeof SIMS)[]).map((k) => (
          <Link key={k} to={`${base}/simular/${k}`} className={'aba' + (k === atual ? ' ativa' : '')} aria-current={k === atual ? 'page' : undefined}>{SIMS[k].nome}</Link>
        ))}
      </nav>
      <p className="apoio intro">{SIMS[atual].texto}</p>
      <div className="painel sim-cartao">
        {atual === 'ingressos' && <SimIngressos cidadeInicial={cidade} />}
        {atual === 'cache' && <SimCache cidadeInicial={cidade} />}
        {atual === 'janela' && <SimJanela />}
      </div>
    </div>
  );
}
