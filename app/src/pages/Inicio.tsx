import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useArtist } from '../data/ArtistContext';
import { useUi } from '../data/UiContext';
import { compact, dec, int } from '../lib/format';
import { IcSeta } from '../components/shell/Icones';
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

  return (
    <div className="inicio">
      <section className="capa" aria-label={config.nome}>
        <span className="capa-disco" aria-hidden="true" />
        <div>
          <h1 className="capa-nome">{config.nome}</h1>
          <p className="apoio">{config.subtitulo} · {config.cidade_origem}, desde {config.desde}</p>
        </div>
      </section>

      <dl className="kpis">
        <div><dt>Ouvintes mensais</dt><dd className="num">{compact(k.ouvintes)}</dd></div>
        <div><dt>Seguidores no Spotify</dt><dd className="num">{compact(k.seguidores_spotify)}</dd></div>
        <div><dt>Seguidores por 100 ouvintes</dt><dd className="num">{int(k.lealdade)}</dd></div>
        <div><dt>Fãs somados nas redes</dt><dd className="num">{compact(k.fas_total)}</dd></div>
      </dl>

      <section aria-labelledby="h-comece" className="secao">
        <h2 id="h-comece">Comece por aqui</h2>
        <div className="chips">
          {destaques.map((p) => (
            <Link key={p.id} className="chip" to={`${base}/p/${p.id}`} state={{ origem: 'chip' }}>
              {p.pergunta}
              {vistas.includes(p.id) && <span className="visto" aria-label="já vista">✓</span>}
            </Link>
          ))}
        </div>
      </section>

      <div className="duas">
        <section aria-labelledby="h-mudou" className="secao">
          <h2 id="h-mudou">O que mudou</h2>
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
                          <button type="button" className="btn" onClick={() => abrirConversao('alerta')}>Quer isso vivo?</button>
                        </div>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="h-indices" className="secao">
          <h2 id="h-indices">Índices</h2>
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
      </div>

      <section aria-labelledby="h-temas" className="secao">
        <h2 id="h-temas">Por tema</h2>
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
      <p className="apoio nota">{dec(data.kpis.ouvintes_g12, 1).replace(',', ',')}% mais ouvintes que há 12 meses. Fonte: {data.meta.fonte}.</p>
    </div>
  );
}
