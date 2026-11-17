import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useArtist } from '../../data/ArtistContext';
import { caminho } from '../../lib/dados';
import { compact, dataCurta, dec, int, signed } from '../../lib/format';
import { FAIXAS, type Bloco as BlocoT, type Data } from '../../types';
import { SimCache } from '../sims/SimCache';
import { SimIngressos } from '../sims/SimIngressos';
import { SimJanela } from '../sims/SimJanela';
import { BarrasH, FORMATOS, type Linha } from './Barras';
import { MapaBR } from './Mapa';
import { Piramides } from './Piramides';
import { BarrasMensais, CasosShow, GraficoLinha, PontosEventos, type PontoLinha } from './Series';
import { TabelaDados, TabelaSimples } from './Tabela';
import { Citacoes, LinhaDoTempo, ListaLinhas } from './Texto';
import { Legenda } from './chart';

interface Saida {
  titulo: string;
  grafico: ReactNode;
  tabela?: { cabecalho: string[]; linhas: (string | number)[][] };
}

const ROTULO_CHAVES = ['cidade', 'som', 'album', 'marca', 'artista', 'tema', 'playlist', 'nome', 'plataforma', 'faixa'];
const rotuloDe = (r: any) => String(r[ROTULO_CHAVES.find((k) => r[k] != null) ?? ''] ?? '');

const TITULOS: Record<string, string> = {
  'cidades/yt_3m': 'Variação de views no YouTube em 3 meses, por cidade',
  'pares/lealdade': 'Seguidores para cada 100 ouvintes, entre artistas parecidos',
  'sons.instagram/views': 'Sons mais usados no Reels (visualizações)',
  'sons.tiktok/views': 'Sons mais usados no TikTok (visualizações)',
  'marcas/afinidade': 'Afinidade de marcas com o público',
  'albuns/popularidade': 'Popularidade de cada disco no Spotify (0 a 100)',
  'comentarios.temas/pct': 'Do que os fãs falam (% dos comentários)',
  mapa: 'Ouvintes por cidade',
  sazonalidade: 'Efeito de cada mês nos ouvintes',
  previsao: 'Ouvintes mensais: histórico e projeção',
  casos_show: 'Ouvintes da cidade depois do show',
  pontos_eventos: 'Efeito de cada show nos ouvintes',
  piramides: 'Idade e gênero por plataforma',
  linha_do_tempo: 'Aniversários de disco',
  citacoes: 'O que os fãs escrevem',
  'lista/playlists.recomendadas': 'Playlists para pedir espaço',
  'lista/co_palco': 'Quem já dividiu palco com a banda',
  'tabela/faixas': 'Músicas mais fortes hoje',
  'tabela/plataformas': 'Crescimento por rede',
  'tabela/cidades': 'Praças',
  'linha/playlists.evolucao': 'Playlists de usuários que incluem a banda',
  'barras_divergentes/lancamentos': 'Efeito de cada lançamento (sem efeito do mês)',
};

function BarrasComToggle({ linhas, rotulo }: { linhas: Linha[]; rotulo: string }) {
  const [todas, setTodas] = useState(false);
  const limite = 12;
  return (
    <>
      <BarrasH linhas={linhas} maxLinhas={todas ? undefined : limite} rotuloValor={rotulo} />
      {linhas.length > limite && (
        <button type="button" className="btn btn-leve" onClick={() => setTodas((v) => !v)}>{todas ? 'Mostrar menos' : `Mostrar todas (${linhas.length})`}</button>
      )}
    </>
  );
}

function construir(b: BlocoT, d: Data): Saida | null {
  const dados = caminho(d, b.dados);
  const t = (padrao: string) => b.titulo ?? TITULOS[`${b.tipo}/${b.dados}`] ?? TITULOS[`${b.dados}/${b.campo}`] ?? TITULOS[b.tipo] ?? padrao;

  switch (b.tipo) {
    case 'mapa': {
      const cidades = d.cidades;
      return {
        titulo: t(TITULOS.mapa),
        grafico: <MapaBR cidades={cidades} destacar={b.destacar} />,
        tabela: { cabecalho: ['Cidade', 'Ouvintes', 'Ouvintes por 100 mil', 'Faixa de cachê'], linhas: cidades.map((c) => [c.cidade, int(c.ouvintes), int(c.por100k), FAIXAS[c.faixa].rotulo]) },
      };
    }
    case 'tabela': {
      let linhas: any[] = Array.isArray(dados) ? dados : [];
      for (const [k, vals] of Object.entries(b.filtro ?? {})) linhas = linhas.filter((l) => vals.includes(String(l[k])));
      const titulo = b.titulo ?? TITULOS[`tabela/${b.dados}`] ?? 'Tabela';
      return { titulo, grafico: <TabelaDados linhas={linhas} colunas={b.colunas ?? Object.keys(linhas[0] ?? {})} dados={b.dados} titulo={titulo} limite={10} /> };
    }
    case 'barras': {
      const campo = b.campo ?? 'valor';
      const fmt = FORMATOS[campo] ?? ((v: number) => dec(v, 1));
      const fonte: any[] = (Array.isArray(dados) ? dados : []).filter((r) => r[campo] != null);
      const linhas: Linha[] = [...fonte].sort((a, c) => c[campo] - a[campo]).map((r) => {
        const dest = b.destacar?.length ? b.destacar.includes(rotuloDe(r)) : null;
        return {
          rotulo: rotuloDe(r) + (r.ano ? ` (${r.ano})` : ''),
          valor: r[campo],
          texto: fmt(r[campo]),
          sub: r.videos ? `${compact(r.videos)} vídeos` : undefined,
          cor: dest === false ? 'var(--dado-neutro)' : undefined,
        };
      });
      const titulo = t('Ranking');
      return {
        titulo,
        grafico: <BarrasComToggle linhas={linhas} rotulo={titulo} />,
        tabela: { cabecalho: ['Item', campo], linhas: linhas.map((l) => [l.rotulo, l.texto ?? '']) },
      };
    }
    case 'barras_divergentes': {
      const lista: any[] = Array.isArray(dados) ? dados : [];
      const linhas: Linha[] = lista.map((r) => ({ rotulo: r.nome, sub: r.data ? dataCurta(r.data) : undefined, valor: r.ajustado, texto: signed(r.ajustado, 1) }));
      const titulo = t('Efeito por item');
      return {
        titulo,
        grafico: <BarrasH linhas={linhas} divergente rotuloValor={titulo} />,
        tabela: { cabecalho: ['Item', 'Data', 'Efeito sem o mês'], linhas: lista.map((r) => [r.nome, r.data ? dataCurta(r.data) : '—', signed(r.ajustado, 1)]) },
      };
    }
    case 'sazonalidade': {
      const v = d.sazonalidade.map((s) => ({ mes: s.mes, v: s.idx }));
      return {
        titulo: t(TITULOS.sazonalidade),
        grafico: (
          <>
            <BarrasMensais valores={v} fortes={d.melhores_meses} fracos={d.piores_meses} rotulo={`Efeito sazonal de cada mês. Mais fortes: ${d.melhores_meses.join(', ')}. Mais fracos: ${d.piores_meses.join(', ')}.`} />
            <Legenda itens={[{ cor: 'var(--dado-pos)', texto: `Meses fortes: ${d.melhores_meses.join(', ')}` }, { cor: 'var(--dado-neg)', texto: `Meses fracos: ${d.piores_meses.join(', ')}` }]} />
            <p className="apoio nota">Média de {d.sazonalidade_anos}: quanto os ouvintes sobem ou caem em cada mês só por sazonalidade.</p>
          </>
        ),
        tabela: { cabecalho: ['Mês', 'Efeito sazonal'], linhas: v.map((x) => [x.mes, signed(x.v, 1)]) },
      };
    }
    case 'previsao': {
      const pontos: PontoLinha[] = [...d.historico.map((h) => ({ x: h.mes, v: h.valor })), ...d.previsao.map((p) => ({ x: p.mes, v: p.valor, min: p.min, max: p.max, proj: true }))];
      return {
        titulo: t(TITULOS.previsao),
        grafico: <GraficoLinha pontos={pontos} rotulo={`Ouvintes mensais: ${d.historico.length} meses de histórico e ${d.previsao.length} de projeção`} />,
        tabela: { cabecalho: ['Mês', 'Ouvintes', 'Faixa indicativa'], linhas: pontos.map((p) => [p.x, int(p.v), p.min != null ? `${int(p.min)} a ${int(p.max!)}` : '—']) },
      };
    }
    case 'linha': {
      const campo = b.campo ?? 'valor';
      const lista: any[] = Array.isArray(dados) ? dados : [];
      const pontos = lista.map((r) => ({ x: r.mes ?? r.data ?? '', v: r[campo] as number }));
      const titulo = t('Evolução');
      return {
        titulo,
        grafico: <GraficoLinha pontos={pontos} rotulo={`${titulo}: ${pontos.length} meses`} fmt={(v) => int(v)} />,
        tabela: { cabecalho: ['Mês', 'Valor'], linhas: pontos.map((p) => [p.x, int(p.v)]) },
      };
    }
    case 'casos_show': {
      const casos: any[] = Array.isArray(dados) ? dados : [];
      return {
        titulo: t(TITULOS.casos_show),
        grafico: <CasosShow casos={casos} />,
        tabela: { cabecalho: ['Show', 'Data', 'No dia do show', 'Pico', 'Ganho'], linhas: casos.map((c) => [c.titulo, dataCurta(c.data), signed(c.antes, 1), signed(c.pico, 1), signed(c.lift, 1, ' pts')]) },
      };
    }
    case 'pontos_eventos': {
      const ev: any[] = Array.isArray(dados) ? dados : [];
      return {
        titulo: t(TITULOS.pontos_eventos),
        grafico: <PontosEventos eventos={ev} porTipo={d.shows.por_tipo} />,
        tabela: { cabecalho: ['Evento', 'Data', 'Tipo', 'Efeito'], linhas: [...ev].sort((a, c) => c.data.localeCompare(a.data)).map((e) => [e.evento, dataCurta(e.data), e.tipo, signed(e.ajustado, 1)]) },
      };
    }
    case 'piramides': {
      const plats = b.plataformas ?? Object.keys(d.publico);
      return {
        titulo: t(TITULOS.piramides),
        grafico: <Piramides publico={d.publico} plataformas={plats} />,
        tabela: {
          cabecalho: ['Plataforma', 'Idade', 'Homens', 'Mulheres'],
          linhas: plats.flatMap((p) => (d.publico[p]?.faixas ?? []).map((f: any) => [p, f.faixa, `${dec(f.M, 1)}%`, `${dec(f.F, 1)}%`])),
        },
      };
    }
    case 'lista': {
      const lista: any[] = Array.isArray(dados) ? dados : [];
      const linhas = lista.map((r) =>
        r.playlist
          ? { rotulo: r.playlist, sub: `${r.curador} · com ${r.base}`, valor: `${compact(r.seguidores)} seguidores`, href: r.url }
          : { rotulo: r.artista, sub: r.ultimo ? `último: ${r.ultimo}` : undefined, valor: `${r.eventos} ${r.eventos === 1 ? 'evento' : 'eventos'}` },
      );
      return { titulo: t('Lista'), grafico: <ListaLinhas linhas={linhas} /> };
    }
    case 'linha_do_tempo':
      return { titulo: t(TITULOS.linha_do_tempo), grafico: <LinhaDoTempo itens={Array.isArray(dados) ? dados : []} /> };
    case 'citacoes':
      return { titulo: t(TITULOS.citacoes), grafico: <Citacoes itens={Array.isArray(dados) ? dados : []} /> };
    case 'simulador': {
      const s = b.simulador;
      const nome = s === 'ingressos' ? 'Calculadora de ingressos' : s === 'janela' ? 'Janela de lançamento' : 'Prêmio de cachê';
      return {
        titulo: b.titulo ?? nome,
        grafico: (
          <>
            {s === 'ingressos' && <SimIngressos />}
            {s === 'janela' && <SimJanela />}
            {s === 'cache' && <SimCache />}
          </>
        ),
      };
    }
    default:
      return null;
  }
}

export function Bloco({ bloco }: { bloco: BlocoT }) {
  const { data, base } = useArtist();
  const [tabela, setTabela] = useState(false);
  const saida = construir(bloco, data);
  if (!saida) return null;
  return (
    <figure className="bloco painel">
      <figcaption className="bloco-topo">
        <h3>{saida.titulo}</h3>
        {saida.tabela && (
          <button type="button" className="btn btn-leve" aria-pressed={tabela} onClick={() => setTabela((v) => !v)}>
            {tabela ? 'Ver gráfico' : 'Ver como tabela'}
          </button>
        )}
        {bloco.tipo === 'simulador' && bloco.simulador && (
          <Link className="btn btn-leve" to={`${base}/simular/${bloco.simulador}`}>Abrir em tela cheia</Link>
        )}
      </figcaption>
      {tabela && saida.tabela ? <TabelaSimples titulo={saida.titulo} cabecalho={saida.tabela.cabecalho} linhas={saida.tabela.linhas} /> : saida.grafico}
    </figure>
  );
}
