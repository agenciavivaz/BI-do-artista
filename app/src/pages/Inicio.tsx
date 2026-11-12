import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarraDePergunta } from '../components/shell/BarraDePergunta';
import { IcSeta } from '../components/shell/Icones';
import { useArtist } from '../data/ArtistContext';
import { useUi } from '../data/UiContext';
import { compact, dataLonga, dec, int } from '../lib/format';
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
      {/* ---------- capa do dossiê ---------- */}
      <section className="capa faixa" aria-label={config.nome}>
        <div className="capa-texto">
          <p className="etiqueta">Dossiê de carreira</p>
          <h1 className="capa-nome">{config.nome}</h1>
          <p className="capa-sub">
            {config.subtitulo}. {config.cidade_origem}, desde {config.desde}.{' '}
            <strong>{dec(k.ouvintes_g12, 1)}% mais ouvintes</strong> que há 12 meses.
            Dados até {dataLonga(data.meta.dados_ate)}.
          </p>
          <div className="capa-busca">
            <BarraDePergunta />
            <p className="apoio capa-dica">Escreva com suas palavras ou escolha uma das perguntas abaixo.</p>
          </div>
        </div>
        {config.fotos?.capa && (
          <figure className="capa-foto">
            <img src={config.fotos.capa} alt={config.fotos.capa_alt ?? config.nome} width={738} height={414} />
          </figure>
        )}
      </section>

      {/* ---------- números de topo ---------- */}
      <dl className="kpis faixa">
        <div><dt>Ouvintes mensais</dt><dd className="num">{compact(k.ouvintes)}</dd></div>
        <div><dt>Seguidores no Spotify</dt><dd className="num">{compact(k.seguidores_spotify)}</dd></div>
        <div><dt>Seguidores por 100 ouvintes</dt><dd className="num">{int(k.lealdade)}</dd></div>
        <div><dt>Fãs somados nas redes</dt><dd className="num">{compact(k.fas_total)}</dd></div>
      </dl>

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
            <button type="button" className="btn btn-primario" onClick={() => abrirConversao('inicio')}>Quer isso vivo?</button>
            <a className="btn" href={`${base}/relatorio`}>Ver o relatório em uma página</a>
          </div>
        </div>
      </section>

    </div>
  );
}
