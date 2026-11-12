import { useEffect, useMemo } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useArtist } from '../data/ArtistContext';
import { casar } from '../lib/match';
import { lerJSON } from '../lib/store';
import type { Pergunta } from '../types';

function Chip({ p, vistas }: { p: Pergunta; vistas: string[] }) {
  const { base } = useArtist();
  return (
    <Link className="chip" to={`${base}/p/${p.id}`} state={{ origem: 'chip' }}>
      {p.pergunta}
      {vistas.includes(p.id) && <span className="visto" aria-label="já vista">✓</span>}
    </Link>
  );
}

export default function Perguntas() {
  const { respostas, config, base, slug } = useArtist();
  const [params] = useSearchParams();
  const { hash } = useLocation();
  const q = params.get('q')?.trim() ?? '';
  const vistas = lerJSON<string[]>(`camarim:${slug}:vistas`, []);
  const r = useMemo(() => (q ? casar(q, respostas.perguntas, [config.nome]) : null), [q, respostas.perguntas, config.nome]);

  useEffect(() => { if (hash) document.getElementById(hash.slice(1))?.scrollIntoView(); }, [hash]);

  if (r?.tipo === 'ok') return <Navigate replace to={`${base}/p/${r.pergunta.id}`} state={{ origem: 'texto', entendi: q }} />;

  return (
    <div className="perguntas">
      <h1 className="titulo-pagina">Perguntar</h1>
      <p className="apoio intro">
        {respostas.perguntas.length} perguntas prontas, com a conta aberta em cada resposta. Escreva na barra acima com
        suas palavras — o sistema encontra a pergunta mais próxima.
      </p>
      <nav className="chips indice-temas" aria-label="Ir para um tema">
        {respostas.temas.map((t) => (
          <a key={t.id} className="chip" href={`#${t.id}`}>{t.nome}</a>
        ))}
      </nav>

      {r?.tipo === 'empate' && (
        <section className="painel aviso-busca" aria-labelledby="h-empate">
          <h2 id="h-empate">Qual dessas você quis dizer?</h2>
          <p className="apoio">Você escreveu “{q}”.</p>
          <div className="chips">{r.perguntas.map((p) => <Chip key={p.id} p={p} vistas={vistas} />)}</div>
        </section>
      )}

      {r?.tipo === 'fallback' && (
        <section className="painel aviso-busca" aria-labelledby="h-fallback">
          <h2 id="h-fallback">{respostas.fallback.titulo}</h2>
          <p className="apoio">Você escreveu “{q}”.</p>
          <p>{respostas.fallback.texto}</p>
          <p><strong>Na versão com IA, o sistema responde qualquer pergunta com os dados ao vivo.</strong></p>
          <h3 className="apoio sub">Perguntas próximas</h3>
          <div className="chips">{r.proximas.map((p) => <Chip key={p.id} p={p} vistas={vistas} />)}</div>
        </section>
      )}

      {respostas.temas.map((t) => (
        <section key={t.id} id={t.id} className="secao tema-bloco" aria-labelledby={`h-${t.id}`}>
          <h2 id={`h-${t.id}`}>{t.nome}</h2>
          <p className="apoio">{t.descricao}</p>
          <div className="chips">
            {respostas.perguntas.filter((p) => p.tema === t.id).map((p) => <Chip key={p.id} p={p} vistas={vistas} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
