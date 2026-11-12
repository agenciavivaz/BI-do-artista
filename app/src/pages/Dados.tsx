import { useSearchParams } from 'react-router-dom';
import { Bloco } from '../components/blocks/Bloco';
import { useArtist } from '../data/ArtistContext';
import { compact, int, signed } from '../lib/format';
import type { Bloco as BlocoT } from '../types';

type Aba = { id: string; nome: string; blocos: (nome: string) => BlocoT[] };

const ABAS: Aba[] = [
  { id: 'pracas', nome: 'Praças', blocos: () => [
    { tipo: 'mapa', dados: 'cidades' },
    { tipo: 'tabela', dados: 'cidades', colunas: ['cidade', 'ouvintes', 'demanda_rel', 'faixa', 'base_fa', 'publico_min', 'publico', 'publico_max', 'confianca', 'ticket_medio', 'bilheteria', 'veredito_casa'], titulo: 'Todas as praças' },
    { tipo: 'barras', dados: 'cidades', campo: 'yt_3m' },
  ] },
  { id: 'bilheteria', nome: 'Bilheteria', blocos: () => [
    { tipo: 'tabela', dados: 'publico_praca.shows_usados',
      colunas: ['data', 'cidade', 'local', 'capacidade', 'ocupacao', 'publico', 'peso', 'no_ajuste', 'fonte'],
      titulo: 'Shows próprios que alimentam a previsão de público' },
    { tipo: 'tabela', dados: 'publico_praca.modelo.validacao.linhas',
      colunas: ['cidade', 'local', 'data', 'real', 'previsto', 'erro_pct'],
      titulo: 'Validação: tirando um show de cada vez do ajuste' },
    { tipo: 'tabela', dados: 'publico_praca.modelo.comparacao',
      colunas: ['formula', 'coeficientes', 'r2', 'erro_mediano_pct', 'erro_medio_pct', 'cobertura_pct'],
      titulo: 'Fórmulas testadas (vence a que erra menos na validação)' },
  ] },
  { id: 'shows', nome: 'Shows', blocos: () => [
    { tipo: 'pontos_eventos', dados: 'shows.eventos' },
    { tipo: 'casos_show', dados: 'shows.casos_cidade' },
    { tipo: 'tabela', dados: 'shows.eventos', colunas: ['evento', 'data', 'tipo', 'capacidade', 'ajustado'], titulo: 'Agenda de shows' },
  ] },
  { id: 'lancamentos', nome: 'Lançamentos', blocos: () => [
    { tipo: 'sazonalidade', dados: 'sazonalidade' },
    { tipo: 'previsao', dados: 'historico+previsao' },
    { tipo: 'barras_divergentes', dados: 'lancamentos' },
    { tipo: 'barras_divergentes', dados: 'serie_inv.lista', titulo: 'Efeito de cada capítulo (2021)' },
  ] },
  { id: 'catalogo', nome: 'Catálogo', blocos: () => [
    { tipo: 'tabela', dados: 'faixas', colunas: ['faixa', 'forca', 'streams_90d', 'youtube', 'playlists'] },
    { tipo: 'barras', dados: 'albuns', campo: 'popularidade' },
    { tipo: 'barras', dados: 'sons.tiktok', campo: 'views' },
    { tipo: 'barras', dados: 'sons.instagram', campo: 'views' },
    { tipo: 'linha_do_tempo', dados: 'contexto.aniversarios' },
  ] },
  { id: 'playlists', nome: 'Playlists', blocos: () => [
    { tipo: 'linha', dados: 'playlists.evolucao', campo: 'usuarios' },
    { tipo: 'lista', dados: 'playlists.recomendadas' },
  ] },
  { id: 'publico', nome: 'Público', blocos: () => [
    { tipo: 'piramides', dados: 'publico', plataformas: ['streaming', 'tiktok', 'instagram', 'social', 'youtube'] },
    { tipo: 'tabela', dados: 'plataformas', colunas: ['plataforma', 'total', 'g12', 'spark'] },
    { tipo: 'barras', dados: 'comentarios.temas', campo: 'pct' },
    { tipo: 'citacoes', dados: 'comentarios.destaques' },
  ] },
  { id: 'parcerias', nome: 'Parcerias', blocos: (nome) => [
    { tipo: 'barras', dados: 'marcas', campo: 'afinidade' },
    { tipo: 'barras', dados: 'pares', campo: 'lealdade', destacar: [nome] },
    { tipo: 'lista', dados: 'co_palco' },
  ] },
];

export default function Dados() {
  const { base, data, config } = useArtist();
  const [params, setParams] = useSearchParams();
  const atual = ABAS.find((a) => a.id === params.get('aba')) ?? ABAS[0];
  const r = data.playlists?.resumo;
  return (
    <div className="dados largo">
      <div className="dados-topo">
        <h1 className="titulo-pagina">Dados</h1>
        <a className="btn" href={`${base}/relatorio`}>Baixar relatório</a>
      </div>
      <p className="apoio intro">Tudo o que o sistema usa nas respostas, módulo por módulo. Cada gráfico tem versão em tabela.</p>
      <div className="abas" role="tablist" aria-label="Módulos de dados">
        {ABAS.map((a) => (
          <button key={a.id} id={`aba-${a.id}`} role="tab" type="button" aria-selected={a.id === atual.id} aria-controls="painel-aba" tabIndex={a.id === atual.id ? 0 : -1}
            className={'aba' + (a.id === atual.id ? ' ativa' : '')}
            onClick={() => setParams({ aba: a.id }, { replace: true })}
            onKeyDown={(e) => {
              const i = ABAS.findIndex((x) => x.id === atual.id);
              const novo = e.key === 'ArrowRight' ? ABAS[(i + 1) % ABAS.length] : e.key === 'ArrowLeft' ? ABAS[(i + ABAS.length - 1) % ABAS.length] : null;
              if (novo) { e.preventDefault(); setParams({ aba: novo.id }, { replace: true }); document.getElementById(`aba-${novo.id}`)?.focus(); }
            }}>
            {a.nome}
          </button>
        ))}
      </div>
      <div id="painel-aba" role="tabpanel" aria-labelledby={`aba-${atual.id}`} className="blocos">
        {atual.id === 'playlists' && r && (
          <dl className="kpis painel kpis-aba">
            <div><dt>Playlists editoriais</dt><dd className="num">{int(r.editoriais)}</dd></div>
            <div><dt>Playlists de usuários</dt><dd className="num">{compact(r.usuarios)}</dd></div>
            <div><dt>Usuários em 12 meses</dt><dd className="num">{signed(r.usuarios_g12, 1)}</dd></div>
            <div><dt>Editoriais paradas desde</dt><dd className="num">{r.editoriais_parado_desde}</dd></div>
          </dl>
        )}
        {atual.blocos(config.nome).map((b, i) => <Bloco key={atual.id + i} bloco={b} />)}
      </div>
    </div>
  );
}
