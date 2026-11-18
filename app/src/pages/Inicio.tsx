import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarraDePergunta } from '../components/shell/BarraDePergunta';
import { IcSeta } from '../components/shell/Icones';
import { useArtist } from '../data/ArtistContext';
import { useUi } from '../data/UiContext';
import { compact, dataLonga, int } from '../lib/format';
import { lerJSON } from '../lib/store';
import type { Alerta } from '../types';

const TIPO: Record<Alerta['tipo'], string> = { oportunidade: 'Oportunidade', atencao: 'Atenção', previsao: 'Previsão', investigar: 'Investigar' };

export default function Inicio() {
  const { data, respostas, config, base, slug } = useArtist();
  const { abrirConversao } = useUi();
  const [aberto, setAberto] = useState<number | null>(null);
  const [indice, setIndice] = useState<string | null>(null);
  const vistas = lerJSON<string[]>(`camarim:${slug}:vistas`, []);
  const destaques = respostas.perguntas.filter((p) => p.destaque);
  const k = data.kpis;
  const tema = (id: string) => respostas.temas.find((t) => t.id === id)?.nome ?? '';

  return (
    <div className="inicio">
      {/* ---------- entrada da gestão ---------- */}
      <section className="capa faixa" aria-label={config.nome}>
        <div className="capa-texto">
          <p className="etiqueta">Gestão de shows e streaming</p>
          <h1 className="capa-nome">{config.nome}</h1>
          <p className="capa-sub">
            Planeje shows e encontre oportunidades para o catálogo.
          </p>
          <p className="apoio capa-dica">
            Demo com dados de audiência até {dataLonga(data.meta.dados_ate)}.
          </p>
        </div>
        {config.fotos?.capa && (
          <figure className="capa-foto">
            <img src={config.fotos.capa} alt={config.fotos.capa_alt ?? config.nome} width={738} height={414} />
          </figure>
        )}
      </section>

      <section className="gestao faixa" aria-label="Por onde começar">
        <article className="painel">
          <h2>Shows</h2>
          <p>Compare o público estimado, a capacidade da casa e a bilheteria do cenário.</p>
          <Link className="btn btn-primario" to={`${base}/simular/ingressos`}>Simular um show</Link>
        </article>
        <article className="painel">
          <h2>Streaming</h2>
          <p>Veja quais faixas ganharam tração e escolha uma ação para o catálogo.</p>
          <Link className="btn" to={`${base}/streaming`}>Ver oportunidades do catálogo</Link>
        </article>
      </section>

      <div className="inicio-busca faixa">
        <BarraDePergunta />
      </div>

      {/* ---------- audiência ---------- */}
      <dl className="kpis faixa">
        <div><dt>Ouvintes mensais</dt><dd className="num">{compact(k.ouvintes)}</dd></div>
        <div><dt>Seguidores no Spotify</dt><dd className="num">{compact(k.seguidores_spotify)}</dd></div>
        <div><dt>Fãs somados nas redes</dt><dd className="num">{compact(k.fas_total)}</dd></div>
      </dl>

      {/* ---------- radar de gestão ---------- */}
      {data.radar?.length > 0 && (
        <section aria-labelledby="h-radar" className="secao faixa">
          <div className="radar-cabecalho">
            <div>
              <p className="etiqueta">Radar de gestão</p>
              <h2 id="h-radar">O que os sinais de agora mudam na decisão</h2>
            </div>
            <p className="apoio">Notícias públicas cruzadas com Spotify, YouTube, redes, shows e catálogo.</p>
          </div>
          <ol className="radar-lista">
            {data.radar.map((item) => (
              <li className="radar-item" key={`${item.data}-${item.modelo}`}>
                <div className="radar-meta">
                  <span className="tag tag-oportunidade">{item.tipo}</span>
                  <time dateTime={item.data}>{dataLonga(item.data)}</time>
                </div>
                <h3>{item.titulo}</h3>
                <p>{item.leitura}</p>
                <ul className="radar-evidencias" aria-label="Evidências nos dados">
                  {item.evidencias.map((evidencia) => <li key={evidencia}>{evidencia}</li>)}
                </ul>
                <p className="radar-acao"><strong>Próxima ação</strong>{item.acao}</p>
                <a className="radar-fonte" href={item.url} target="_blank" rel="noopener noreferrer">
                  Fonte: {item.fonte} <IcSeta />
                </a>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ---------- as decisões ---------- */}
      <section aria-labelledby="h-comece" className="secao faixa">
        <h2 id="h-comece" className="etiqueta">Comece por uma decisão</h2>
        <ul className="decisoes">
          {destaques.map((p) => (
            <li key={p.id}>
              <Link className="decisao" to={`${base}/p/${p.id}`} state={{ origem: 'chip' }}>
                <span className="decisao-tema apoio">{tema(p.tema)}{vistas.includes(p.id) && ' · já vista'}</span>
                <strong className="decisao-pergunta">{p.pergunta}</strong>
                <span className="decisao-veredito">{p.veredito}</span>
                {p.numeros[0] && (
                  <span className="decisao-num">
                    <b className="num">{p.numeros[0].valor}</b> {p.numeros[0].rotulo}
                  </span>
                )}
                <span className="decisao-ir">Ver a resposta <IcSeta /></span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="apoio nota">
          São {respostas.perguntas.length} perguntas no total. <Link to={`${base}/perguntas`}>Ver todas por tema</Link>.
        </p>
      </section>

      {/* ---------- o que mudou ---------- */}
      <section aria-labelledby="h-mudou" className="secao faixa">
        <h2 id="h-mudou" className="etiqueta">O que mudou</h2>
        <ul className="alertas">
          {respostas.alertas.map((a, i) => {
            const corpo = (
              <>
                <span className={`tag tag-${a.tipo}`}>{TIPO[a.tipo]}</span>
                <span className="alerta-titulo">{a.titulo}</span>
                <IcSeta />
              </>
            );
            return (
              <li key={i}>
                {a.pergunta ? (
                  <Link className="alerta" to={`${base}/p/${a.pergunta}`} state={{ origem: 'alerta' }}>{corpo}</Link>
                ) : (
                  <>
                    <button type="button" className="alerta" aria-expanded={aberto === i} onClick={() => setAberto(aberto === i ? null : i)}>{corpo}</button>
                    {aberto === i && (
                      <div className="investigar painel" role="region" aria-label="Investigar">
                        <p>{a.texto}</p>
                        <p className="apoio">Hoje isto é um retrato de um dia. Na versão com API o sistema cruza a cidade com shows, vídeos e playlists e responde sozinho.</p>
                        <button type="button" className="btn" onClick={() => abrirConversao('alerta')}>Sobre o piloto</button>
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---------- índices ---------- */}
      <section aria-labelledby="h-indices" className="secao faixa">
        <h2 id="h-indices" className="etiqueta">Índices da carreira</h2>
        <ul className="indices">
          {data.indices.map((ix) => (
            <li key={ix.chave} className="indice">
              <div className="indice-topo">
                <span>{ix.nome}</span>
                <strong className="num">{int(ix.valor)}</strong>
              </div>
              <div className="medidor" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={ix.valor} aria-label={`${ix.nome}: ${int(ix.valor)} de 100`}>
                <span style={{ width: `${ix.valor}%` }} />
              </div>
              <p className="apoio indice-frase">{ix.frase}</p>
              <button type="button" className="btn btn-leve" aria-expanded={indice === ix.chave} onClick={() => setIndice(indice === ix.chave ? null : ix.chave)}>Como calculamos</button>
              {indice === ix.chave && <p className="indice-explica">{ix.explica}</p>}
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- temas ---------- */}
      <section aria-labelledby="h-temas" className="secao faixa">
        <h2 id="h-temas" className="etiqueta">Por tema</h2>
        <ul className="temas">
          {respostas.temas.map((t) => {
            const n = respostas.perguntas.filter((p) => p.tema === t.id).length;
            return (
              <li key={t.id}>
                <Link className="tema" to={`${base}/perguntas#${t.id}`}>
                  <strong>{t.nome} <span className="apoio num">({n})</span></strong>
                  <span className="apoio">{t.descricao}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="apoio nota faixa" style={{ marginBottom: 36 }}>Fonte: {data.meta.fonte}.</p>

      {/* ---------- convite ---------- */}
      <section className="convite noite" aria-labelledby="h-convite">
        {config.fotos?.bastidores && (
          <img className="convite-foto" src={config.fotos.bastidores} alt={config.fotos.bastidores_alt ?? ''} width={738} height={387} loading="lazy" />
        )}
        <div className="convite-texto">
          <p className="etiqueta">Camarim</p>
          <h2 id="h-convite">Isto é um retrato. O sistema vivo atualiza sozinho.</h2>
          <p>
            Esta demo roda sobre <span className="num">{data.meta.arquivos}</span> relatórios exportados até{' '}
            {dataLonga(data.meta.dados_ate)}. Ligado às APIs, o Camarim refaz as contas todo dia e avisa quando algo muda.
          </p>
          <div className="chips">
            <button type="button" className="btn btn-primario" onClick={() => abrirConversao('inicio')}>Sobre o piloto</button>
            <a className="btn" href={`${base}/relatorio`}>Ver o relatório em uma página</a>
          </div>
        </div>
      </section>

    </div>
  );
}
