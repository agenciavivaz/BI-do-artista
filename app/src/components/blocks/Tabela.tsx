import { useMemo, useState, type ReactNode } from 'react';
import { compact, dec, int, signed } from '../../lib/format';
import { CONFIANCA } from '../../lib/publico';
import { FAIXAS } from '../../types';

function Spark({ v }: { v: number[] }) {
  const lo = Math.min(...v), hi = Math.max(...v);
  const pts = v.map((x, i) => `${(i / (v.length - 1)) * 80},${22 - ((x - lo) / (hi - lo || 1)) * 20}`).join(' ');
  return <svg width={84} height={24} viewBox="-2 0 86 24" aria-hidden="true"><polyline points={pts} fill="none" stroke="var(--dado-1)" strokeWidth={1.8} strokeLinejoin="round" /></svg>;
}

interface Col { rotulo: string; fmt: (v: any, r: any) => ReactNode; txt?: (v: any, r: any) => string; num?: boolean; ordenavel?: boolean }
const txt = (f: (v: any, r: any) => string): Pick<Col, 'fmt' | 'txt'> => ({ fmt: f, txt: f });

export const COLUNAS: Record<string, Col> = {
  cidade: { rotulo: 'Cidade', ...txt((v) => v) },
  ouvintes: { rotulo: 'Ouvintes', num: true, ...txt((v) => int(v)) },
  por100k: { rotulo: 'Ouvintes por 100 mil hab.', num: true, ...txt((v) => int(v)) },
  demanda_rel: { rotulo: 'Demanda vs mediana', num: true, ...txt((v) => `${dec(v, 1)}x`) },
  faixa: { rotulo: 'Faixa de cachê', ...txt((v) => FAIXAS[v as keyof typeof FAIXAS]?.rotulo ?? String(v)) },
  ingressos_min: { rotulo: 'Público provável (mín.)', num: true, ...txt((v) => int(v)) },
  ingressos_max: { rotulo: 'Público provável (máx.)', num: true, ...txt((v) => int(v)) },
  publico: { rotulo: 'Público provável', num: true, ...txt((v) => int(v)) },
  conv_pct: { rotulo: 'Conversão da base', num: true, ...txt((v) => `${dec(v, 1)}%`) },
  base_fa: { rotulo: 'Base de fãs na praça', num: true, ...txt((v) => int(v)) },
  confianca: { rotulo: 'Confiança', ...txt((v) => CONFIANCA[v as string]?.rotulo ?? String(v)) },
  yt_3m: { rotulo: 'YouTube em 3 meses', num: true, ...txt((v) => (v == null ? '—' : signed(v, 0))) },
  afinidade: { rotulo: 'Afinidade', num: true, ...txt((v) => (v == null ? '—' : dec(v, 1))) },
  faixa_musica: { rotulo: 'Música', ...txt((v) => v) },
  forca: { rotulo: 'Força (0 a 100)', num: true, ...txt((v) => int(v)) },
  streams_90d: { rotulo: 'Streams em 90 dias', num: true, ...txt((v) => compact(v)) },
  youtube: { rotulo: 'Views no YouTube', num: true, ...txt((v) => compact(v)) },
  playlists: { rotulo: 'Playlists', num: true, ...txt((v) => int(v)) },
  plataforma: { rotulo: 'Rede', ...txt((v) => v) },
  total: { rotulo: 'Seguidores', num: true, ...txt((v) => compact(v)) },
  g12: { rotulo: 'Últimos 12 meses', num: true, ...txt((v) => signed(v, 1)) },
  g24: { rotulo: 'Últimos 24 meses', num: true, ...txt((v) => signed(v, 1)) },
  spark: { rotulo: 'Evolução (24 meses)', fmt: (v) => <Spark v={v} />, txt: (v) => `${compact(v[0])} → ${compact(v[v.length - 1])}`, ordenavel: false },
  evento: { rotulo: 'Evento', ...txt((v) => v) },
  data: { rotulo: 'Data', ...txt((v) => v.split('-').reverse().join('/')) },
  capacidade: { rotulo: 'Capacidade', num: true, ...txt((v) => (v ? int(v) : '—')) },
  ajustado: { rotulo: 'Efeito no mês seguinte', num: true, ...txt((v) => signed(v, 1)) },
  tipo: { rotulo: 'Tipo', ...txt((v) => v) },
  album: { rotulo: 'Disco', ...txt((v) => v) },
  ano: { rotulo: 'Ano', num: true, ...txt((v) => String(v)) },
  popularidade: { rotulo: 'Popularidade', num: true, ...txt((v) => int(v)) },
  alcance_playlists: { rotulo: 'Alcance em playlists', num: true, ...txt((v) => compact(v)) },
};
// em `faixas` a coluna "faixa" é o nome da música; em `cidades` é a faixa de cachê
const rotuloColuna = (k: string, dados?: string): Col => (k === 'faixa' && dados === 'faixas' ? COLUNAS.faixa_musica : COLUNAS[k] ?? { rotulo: k, ...txt((v) => String(v ?? '—')) });

export function colunasDe(chaves: string[], dados?: string) {
  return chaves.map((k) => ({ chave: k, col: rotuloColuna(k, dados) }));
}

export function TabelaDados({ linhas, colunas, dados, titulo, limite }: { linhas: any[]; colunas: string[]; dados?: string; titulo: string; limite?: number }) {
  const cols = useMemo(() => colunasDe(colunas, dados), [colunas, dados]);
  const [ord, setOrd] = useState<{ k: string; dir: 1 | -1 } | null>(null);
  const [todas, setTodas] = useState(false);
  const ordenadas = useMemo(() => {
    if (!ord) return linhas;
    return [...linhas].sort((a, b) => {
      const x = a[ord.k], y = b[ord.k];
      if (x == null) return 1;
      if (y == null) return -1;
      return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR')) * ord.dir;
    });
  }, [linhas, ord]);
  const visiveis = limite && !todas ? ordenadas.slice(0, limite) : ordenadas;
  return (
    <>
      <div className="tabela-wrap" tabIndex={0} role="region" aria-label={titulo}>
        <table className="tabela">
          <thead>
            <tr>
              {cols.map(({ chave, col }) => {
                const ativo = ord?.k === chave;
                return (
                  <th key={chave} scope="col" className={col.num ? 'n' : ''} aria-sort={ativo ? (ord!.dir === 1 ? 'ascending' : 'descending') : undefined}>
                    {col.ordenavel === false ? col.rotulo : (
                      <button type="button" onClick={() => setOrd(ativo ? (ord!.dir === 1 ? { k: chave, dir: -1 } : null) : { k: chave, dir: col.num ? -1 : 1 })}>
                        {col.rotulo}<span aria-hidden="true">{ativo ? (ord!.dir === 1 ? ' ↑' : ' ↓') : ''}</span>
                      </button>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visiveis.map((l, i) => (
              <tr key={i}>
                {cols.map(({ chave, col }, j) => (
                  <td key={chave} className={col.num ? 'n num' : ''}>{j === 0 ? <strong>{col.fmt(l[chave], l)}</strong> : col.fmt(l[chave], l)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {limite && linhas.length > limite && (
        <button type="button" className="btn btn-leve" onClick={() => setTodas((v) => !v)}>{todas ? 'Mostrar menos' : `Mostrar todas (${linhas.length})`}</button>
      )}
    </>
  );
}

/** Versão "ver como tabela" de qualquer gráfico. */
export function TabelaSimples({ cabecalho, linhas, titulo }: { cabecalho: string[]; linhas: (string | number)[][]; titulo: string }) {
  return (
    <div className="tabela-wrap" tabIndex={0} role="region" aria-label={`${titulo} (tabela)`}>
      <table className="tabela">
        <thead><tr>{cabecalho.map((c, i) => <th key={c} scope="col" className={i ? 'n' : ''}>{c}</th>)}</tr></thead>
        <tbody>{linhas.map((l, i) => <tr key={i}>{l.map((c, j) => <td key={j} className={j ? 'n num' : ''}>{j === 0 ? <strong>{c}</strong> : c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
