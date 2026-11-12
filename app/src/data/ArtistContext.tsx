import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Config, Data, Pergunta, Respostas } from '../types';

export interface ArtistaCtx {
  slug: string;
  base: string; // "/fresno"
  data: Data;
  respostas: Respostas;
  config: Config;
  porId: (id: string) => Pergunta | undefined;
}

const Ctx = createContext<ArtistaCtx | null>(null);

export function useArtist(): ArtistaCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useArtist fora do ArtistProvider');
  return v;
}

async function carregar<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json() as Promise<T>;
}

/** Lê data/respostas/config do artista em paralelo (nenhum número é digitado no app). */
export function ArtistProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [estado, setEstado] = useState<{ data: Data; respostas: Respostas; config: Config } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setEstado(null);
    setErro(null);
    Promise.all([
      carregar<Data>(`/data/${slug}/data.json`),
      carregar<Respostas>(`/data/${slug}/respostas.json`),
      carregar<Config>(`/data/${slug}/config.json`),
    ])
      .then(([data, respostas, config]) => vivo && setEstado({ data, respostas, config }))
      .catch((e) => vivo && setErro(String(e.message ?? e)));
    return () => { vivo = false; };
  }, [slug]);

  useEffect(() => {
    if (estado) document.documentElement.style.setProperty('--capa', estado.config.tema.destaque);
  }, [estado]);

  const valor = useMemo<ArtistaCtx | null>(() => {
    if (!estado) return null;
    const mapa = new Map(estado.respostas.perguntas.map((p) => [p.id, p]));
    return { slug, base: `/${slug}`, ...estado, porId: (id) => mapa.get(id) };
  }, [estado, slug]);

  if (erro) {
    return (
      <div className="tela-msg" role="alert">
        <h1>Não achei esse artista</h1>
        <p className="apoio">Não consegui carregar os dados de “{slug}”. Confira o endereço e tente de novo.</p>
        <a className="btn" href="/fresno">Abrir a demo da Fresno</a>
      </div>
    );
  }
  if (!valor) return <div className="tela-msg" role="status"><p className="apoio">Carregando os dados…</p></div>;
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
