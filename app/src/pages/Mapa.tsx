import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapaBR } from '../components/blocks/Mapa';
import { Gaveta } from '../components/shell/Gaveta';
import { useArtist } from '../data/ArtistContext';
import { dec, int, signed } from '../lib/format';
import { CONFIANCA, fraseAncora } from '../lib/publico';
import { FAIXAS, type Cidade } from '../types';

function Dado({ rotulo, valor, sub }: { rotulo: string; valor: string; sub?: string }) {
  return (
    <div className="dado">
      <dt>{rotulo}</dt>
      <dd><span className="num">{valor}</span>{sub && <small className="apoio">{sub}</small>}</dd>
    </div>
  );
}

export default function MapaPage() {
  const { data, base } = useArtist();
  const [sel, setSel] = useState<Cidade | null>(null);
  const [aberta, setAberta] = useState(false);
  const escolher = (c: Cidade) => { setSel(c); setAberta(true); };
  const lista = [...data.cidades].sort((a, b) => b.ouvintes - a.ouvintes);
  return (
    <div className="mapa-pagina largo">
      <h1 className="titulo-pagina">Mapa de praças</h1>
      <p className="apoio intro">Cada bolha é uma cidade. Toque numa bolha ou escolha na lista para ver quanto cobrar e quantos ingressos vender.</p>
      <div className="mapa-grade">
        <div className="painel mapa-cartao"><MapaBR cidades={data.cidades} onSelecionar={escolher} selecionada={sel?.cidade} larguraMax={680} /></div>
        <section aria-labelledby="h-lista-cidades" className="painel lista-cidades">
          <h2 id="h-lista-cidades">Cidades</h2>
          <ul>
            {lista.map((c) => (
              <li key={c.cidade}>
                <button type="button" className={c.cidade === sel?.cidade ? 'sel' : ''} onClick={() => escolher(c)}>
                  <span>{c.cidade}</span>
                  <span className="apoio num">{FAIXAS[c.faixa].curto}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Gaveta aberta={aberta && !!sel} onFechar={() => setAberta(false)} titulo={sel?.cidade ?? ''} id="cidade">
        {sel && (
          <>
            <p className="gaveta-acao">{sel.acao}</p>
            <dl className="dados-cidade">
              <Dado rotulo="Ouvintes mensais" valor={int(sel.ouvintes)} sub={`dado de ${sel.atualizado.split('-').reverse().join('/')}`} />
              <Dado rotulo="Ouvintes por 100 mil habitantes" valor={int(sel.por100k)} sub={`mediana das praças: ${int(data.cidades_mediana_100k)}`} />
              <Dado rotulo="Demanda vs mediana" valor={`${dec(sel.demanda_rel, 1)}x`} />
              <Dado rotulo="Faixa de cachê" valor={FAIXAS[sel.faixa].rotulo} />
              <Dado
                rotulo="Público provável num show próprio"
                valor={`${int(sel.publico_min)} a ${int(sel.publico_max)}`}
                sub={`${dec(sel.conv_pct, 1)}% da base de fãs daqui · ${CONFIANCA[sel.confianca].rotulo}`}
              />
              {sel.publico_ano && (
                <Dado rotulo="No ano" valor={int(sel.publico_ano)} sub={`${sel.datas_ano} datas próprias por ano`} />
              )}
              {sel.ancora && <Dado rotulo="Último show próprio aqui" valor={sel.ancora.local} sub={fraseAncora(sel.ancora)} />}
              <Dado rotulo="Views no YouTube, 3 meses" valor={sel.yt_3m == null ? 'sem dado' : signed(sel.yt_3m, 0)} />
            </dl>
            <div className="chips">
              <Link className="btn btn-primario" to={`${base}/simular/ingressos?cidade=${encodeURIComponent(sel.cidade)}`}>Simular ingressos aqui</Link>
              <Link className="btn" to={`${base}/simular/cache?cidade=${encodeURIComponent(sel.cidade)}`}>Simular cachê aqui</Link>
            </div>
          </>
        )}
      </Gaveta>
    </div>
  );
}
