import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Raciocinio, ResumoRaciocinio } from '../components/answer/Raciocinio';
import { Acoes, Checklist, CtaVivo, NumeroChave, RespostaBlocos, SeloConfianca } from '../components/answer/Resposta';
import { useArtist } from '../data/ArtistContext';
import { useMesa } from '../data/MesaContext';
import { lerJSON, gravarJSON } from '../lib/store';
import { evento } from '../lib/track';
import { useReducedMotion } from '../lib/useMedia';
import type { Pergunta } from '../types';

export default function PerguntaPage() {
  const { id = '' } = useParams();
  const { porId, base } = useArtist();
  const q = porId(id);
  if (!q) {
    return (
      <div className="vazio">
        <h1 className="pergunta-titulo">Não achei essa pergunta</h1>
        <p className="apoio">O endereço pode ter mudado. Veja a lista completa.</p>
        <Link className="btn btn-primario" to={`${base}/perguntas`}>Ver todas as perguntas</Link>
      </div>
    );
  }
  return <PerguntaView key={q.id} q={q} />;
}

function PerguntaView({ q }: { q: Pergunta }) {
  const { slug, base, respostas, data, porId } = useArtist();
  const { definir } = useMesa();
  const loc = useLocation();
  const estado = (loc.state ?? {}) as { origem?: string; entendi?: string };
  const reduzir = useReducedMotion();
  const chaveVistas = `camarim:${slug}:vistas`;

  const jaVista = useMemo(() => lerJSON<string[]>(chaveVistas, []).includes(q.id), [chaveVistas, q.id]);
  const [fase, setFase] = useState<'pensando' | 'pronta'>(jaVista || reduzir ? 'pronta' : 'pensando');
  const [verCalculo, setVerCalculo] = useState(false);
  const veredito = useRef<HTMLParagraphElement>(null);
  const resumo = useRef<HTMLDivElement>(null);

  const todasFontes = useMemo(() => Array.from(new Set(q.pensando.flatMap((p) => p.fontes))), [q]);

  // abertura: evento de analytics
  useEffect(() => {
    evento('pergunta_aberta', { id: q.id, origem: estado.origem ?? 'chip' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const concluir = useCallback((pulou: boolean) => {
    if (pulou) evento('raciocinio_pulado', { id: q.id });
    definir([], todasFontes);
    const v = lerJSON<string[]>(chaveVistas, []);
    if (!v.includes(q.id)) gravarJSON(chaveVistas, [...v, q.id]);
    setFase('pronta');
  }, [definir, todasFontes, chaveVistas, q.id]);
  const aoFim = useCallback(() => concluir(false), [concluir]);
  const aoPular = useCallback(() => concluir(true), [concluir]);

  // quando a resposta chega, o foco vai para o veredito (leitor de tela)
  useEffect(() => {
    if (fase === 'pronta') { definir([], todasFontes); veredito.current?.focus({ preventScroll: true }); }
  }, [fase, definir, todasFontes]);

  useEffect(() => () => definir([], []), [definir]);

  useEffect(() => {
    if (fase !== 'pensando') return;
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') aoPular(); };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [fase, aoPular]);

  const pensarDeNovo = () => { setVerCalculo(false); definir([], []); setFase('pensando'); };
  const irAoCalculo = () => { setVerCalculo(true); resumo.current?.scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth', block: 'center' }); };

  const vistas = lerJSON<string[]>(chaveVistas, []);
  const abertas = vistas.length; // perguntas distintas já feitas (CTA a partir da 3ª)
  const fontesNomes = todasFontes.map((f) => respostas.fontes[f]?.nome ?? f);
  const seguintes = q.seguintes.map((s) => porId(s)).filter(Boolean) as Pergunta[];

  return (
    <article className="resposta">
      {estado.entendi && (
        <p className="entendi" role="note">
          Você escreveu “{estado.entendi}”. Entendi como: <strong>{q.pergunta}</strong>{' '}
          <Link to={`${base}/perguntas`}>Não era isso?</Link>
        </p>
      )}
      <header className="resp-topo">
        <h1 className="pergunta-titulo">{q.pergunta}</h1>
        {fase === 'pronta' && <SeloConfianca {...q.confianca} />}
      </header>

      {fase === 'pensando' ? (
        <Raciocinio passos={q.pensando} onFim={aoFim} onPular={aoPular} />
      ) : (
        <div className="entra">
          <div ref={resumo}>
            <ResumoRaciocinio passos={q.pensando} aberto={verCalculo} onAlternar={() => setVerCalculo((v) => !v)} idPainel="calculo" />
          </div>

          <p className="veredito" ref={veredito} tabIndex={-1}>{q.veredito}</p>

          {q.numeros.length > 0 && (
            <ul className="numeros" aria-label="Números-chave">
              {q.numeros.map((n, i) => <NumeroChave key={i} {...n} />)}
            </ul>
          )}

          <p className="explicacao">{q.explicacao}</p>

          <RespostaBlocos q={q} />

          <section className="acoes-bloco" aria-labelledby="h-fazer">
            <h2 id="h-fazer">O que fazer</h2>
            <Checklist q={q} />
            <Acoes q={q} />
          </section>

          <footer className="resp-rodape">
            <p className="fontes">
              <span className="apoio">Fontes usadas:</span> {fontesNomes.join(' · ')}
              <button type="button" className="btn btn-leve" onClick={irAoCalculo}>Como calculamos</button>
              <button type="button" className="btn btn-leve" onClick={pensarDeNovo}>Pensar de novo</button>
            </p>
          </footer>

          {abertas >= 3 && <CtaVivo />}

          {seguintes.length > 0 && (
            <nav className="continue" aria-labelledby="h-continue">
              <h2 id="h-continue">Continue</h2>
              <div className="chips">
                {seguintes.map((s) => (
                  <Link key={s.id} className="chip" to={`${base}/p/${s.id}`} state={{ origem: 'seguinte' }}>
                    {s.pergunta}
                    {vistas.includes(s.id) && <span className="visto" aria-label="já vista">✓</span>}
                  </Link>
                ))}
              </div>
            </nav>
          )}
        </div>
      )}
      <p className="sr-only">Dados de {data.meta.artista} até {data.meta.dados_ate}.</p>
    </article>
  );
}
