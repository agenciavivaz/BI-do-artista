import { useEffect, useRef, useState } from 'react';
import { useArtist } from '../../data/ArtistContext';
import { dec, int } from '../../lib/format';
import { CASAS, CONFIANCA, casaPara, fraseAncora, pct, pub, publicoCom } from '../../lib/publico';
import { evento } from '../../lib/track';
import { CidadeBusca } from './CidadeBusca';

export function useDebounceEvento() {
  const t = useRef<number>();
  return (nome: string, props: Record<string, string | number>) => {
    window.clearTimeout(t.current);
    t.current = window.setTimeout(() => evento(nome, props), 700);
  };
}

export function SimIngressos({ cidadeInicial }: { cidadeInicial?: string | null }) {
  const { data, config } = useArtist();
  const p = pub(data);
  const cidades = data.cidades;
  const inicial = cidades.find((c) => c.cidade === cidadeInicial) ?? [...cidades].sort((a, b) => b.publico - a.publico)[0];
  const [cidade, setCidade] = useState(inicial);
  const [conv, setConv] = useState<number | null>(null); // null = taxa calibrada da praça
  const marcar = useDebounceEvento();
  useEffect(() => {
    if (!cidadeInicial) return;
    const c = cidades.find((x) => x.cidade === cidadeInicial);
    if (c) { setCidade(c); setConv(null); }
  }, [cidadeInicial, cidades]);

  const taxa = conv ?? cidade.conv_pct;
  const naTaxa = conv == null;
  const banda = p.banda[cidade.confianca];
  const centro = naTaxa ? cidade.publico : publicoCom(cidade, taxa);
  const lo = naTaxa ? cidade.publico_min : Math.round((centro * (1 - banda)) / 10) * 10;
  const hi = naTaxa ? cidade.publico_max : Math.round((centro * (1 + banda)) / 10) * 10;
  const casa = casaPara(centro);
  const conf = CONFIANCA[cidade.confianca];
  const noAno = cidade.datas_ano > 1 ? (naTaxa ? cidade.publico_ano : Math.round((centro * cidade.datas_ano) / 100) * 100) : null;

  const mudou = (c = cidade, t = taxa) => marcar('simulador_usado', { sim: 'ingressos', cidade: c.cidade, conv: t });

  return (
    <div className="sim">
      <CidadeBusca cidades={cidades} valor={cidade} onChange={(c) => { setCidade(c); setConv(null); mudou(c, c.conv_pct); }} />

      <div className="sim-saida painel" aria-live="polite">
        <p className="sim-numero num">{int(lo)} <span>a</span> {int(hi)}</p>
        <p className="sim-frase">
          Em {cidade.cidade}, com {pct(taxa)} da base de fãs comprando: {int(lo)} a {int(hi)} pessoas.
          Casa sugerida: {CASAS[casa].rotulo}.
        </p>
        <p className="apoio linha-conf">
          <span className={`pastilha pastilha-${cidade.confianca}`}>{conf.rotulo}</span> {conf.motivo}
        </p>
        {cidade.ancora && <p className="apoio ancora">{fraseAncora(cidade.ancora)}</p>}
        {noAno && (
          <p className="apoio">
            A praça recebe {cidade.datas_ano} datas próprias por ano: cerca de <strong className="num">{int(noAno)}</strong> pessoas no ano.
          </p>
        )}
        <ol className="casas" aria-label="Tamanho de casa">
          {CASAS.map((c, i) => <li key={c.curto} className={i === casa ? 'sel' : ''} aria-current={i === casa ? 'true' : undefined}>{c.curto}</li>)}
        </ol>
      </div>

      <div className="campo">
        <label htmlFor="conv" className="campo-rotulo">
          Conversão da base de fãs: <strong className="num">{pct(taxa)}</strong>
          {naTaxa && <span className="apoio"> · taxa calibrada desta praça</span>}
        </label>
        <input id="conv" className="slider" type="range" min={p.conv_min_pct} max={p.conv_max_pct} step={0.5} value={taxa}
          onChange={(e) => { const v = Number(e.target.value); setConv(v); mudou(cidade, v); }} />
        {!naTaxa && (
          <button type="button" className="btn btn-leve btn-reset" onClick={() => { setConv(null); mudou(cidade, cidade.conv_pct); }}>
            Voltar para {pct(cidade.conv_pct)}, a taxa calibrada
          </button>
        )}
      </div>

      <details className="conta">
        <summary>Como essa conta é feita</summary>
        <ol className="conta-passos">
          <li>
            <span>Ouvintes mensais na praça</span>
            <strong className="num">{int(cidade.ouvintes)}</strong>
            <small className="apoio">snapshot de {cidade.atualizado.split('-').reverse().join('/')}</small>
          </li>
          <li>
            <span>Corrigido para hoje</span>
            <strong className="num">{int(cidade.ouvintes_hoje)}</strong>
            <small className="apoio">
              ×{dec(p.fator_atualizacao, 2)} — o snapshot somava {int(p.ouvintes_snapshot)} ouvintes e a banda está com {int(p.ouvintes_atuais)}
            </small>
          </li>
          <li>
            <span>Base de fãs da praça</span>
            <strong className="num">{int(cidade.base_fa)}</strong>
            <small className="apoio">
              ×{dec(p.fator_fa, 2)} — para cada 100 ouvintes do mês, {int(data.kpis.lealdade)} seguem a banda. Quem compra ingresso de banda
              de {new Date(data.meta.gerado_em).getFullYear() - config.desde} anos inclui o fã que já não ouve toda semana.
            </small>
          </li>
          <li>
            <span>Fatia que compra ingresso aqui</span>
            <strong className="num">{pct(cidade.conv_pct)}</strong>
            <small className="apoio">
              {pct(p.conv_ref_pct)} numa praça de {int(p.base_ref)} fãs, caindo conforme a praça cresce e subindo com a afinidade local
              ({dec(cidade.demanda_rel, 1)}x a mediana). Calibrado em {p.ancoras_calibradas} shows com bilheteria conhecida.
            </small>
          </li>
          <li>
            <span>Público provável</span>
            <strong className="num">{int(cidade.publico)}</strong>
            <small className="apoio">faixa de ±{pct(banda * 100)}, pela confiança da praça</small>
          </li>
        </ol>
      </details>
    </div>
  );
}
