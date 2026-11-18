import { Link } from 'react-router-dom';
import { useArtist } from '../data/ArtistContext';
import { dataLonga } from '../lib/format';

export default function Streaming() {
  const { base, data, respostas } = useArtist();
  const perguntas = respostas.perguntas.filter(({ tema }) =>
    ['catalogo', 'lancamentos', 'playlists'].includes(tema),
  );

  return (
    <div className="faixa">
      <h1 className="titulo-pagina">Streaming</h1>
      <p className="intro apoio">Use os sinais de audiência para decidir quais faixas trabalhar e quando lançar.</p>

      <section className="painel streaming-repasses" aria-labelledby="h-repasses">
        <h2 id="h-repasses">Receita de streaming</h2>
        <p>Sem extratos de repasse nesta demo.</p>
        <p className="apoio">Os dados de audiência vão até {dataLonga(data.meta.dados_ate)}.</p>
      </section>

      <section className="secao" aria-labelledby="h-oportunidades">
        <h2 id="h-oportunidades">Oportunidades do catálogo</h2>
        <ul className="decisoes">
          {perguntas.map((pergunta) => (
            <li key={pergunta.id}>
              <Link className="decisao" to={`${base}/p/${pergunta.id}`} state={{ origem: 'chip' }}>
                <strong className="decisao-pergunta">{pergunta.pergunta}</strong>
                <span className="decisao-veredito">{pergunta.veredito}</span>
                <span className="decisao-ir">Ver evidências e próximos passos</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
