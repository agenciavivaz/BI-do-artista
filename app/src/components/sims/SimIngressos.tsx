import { useEffect, useMemo, useRef, useState } from 'react';
import { useArtist } from '../../data/ArtistContext';
import { dec, int } from '../../lib/format';
import { CASAS, CONFIANCA, casaPara, coef, dataBr, fraseProva, pct, pub } from '../../lib/publico';
import { evento } from '../../lib/track';
import { CidadeBusca } from './CidadeBusca';

export function useDebounceEvento() {
  const t = useRef<number>();
  return (nome: string, props: Record<string, string | number>) => {
    window.clearTimeout(t.current);
    t.current = window.setTimeout(() => evento(nome, props), 700);
  };
}

/** degraus de casa para o controle: 200 … 20 mil, sempre redondos */
const reais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const DEGRAUS = [200, 300, 400, 500, 700, 900, 1200, 1500, 2000, 2500, 3000, 3600, 4400, 5500, 7000, 8500, 10000, 13000, 16000, 20000];
const maisPerto = (n: number) => DEGRAUS.reduce((a, b) => (Math.abs(b - n) < Math.abs(a - n) ? b : a), DEGRAUS[0]);

export function SimIngressos({ cidadeInicial }: { cidadeInicial?: string | null }) {
  const { data, config } = useArtist();
  const p = pub(data);
  const cidades = data.cidades;
  const inicial = cidades.find((c) => c.cidade === cidadeInicial) ?? [...cidades].sort((a, b) => b.publico - a.publico)[0];
  const [cidade, setCidade] = useState(inicial);
  const [casa, setCasa] = useState<number | null>(null); // null = a casa que a banda já usou
  const [preco, setPreco] = useState<number | null>(null);
  const [custos, setCustos] = useState<number | null>(null);
  const marcar = useDebounceEvento();

  const casaPadrao = useMemo(() => {
    const ultima = cidade.provas.find((pr) => pr.capacidade);
    return maisPerto(ultima?.capacidade ?? cidade.publico);
  }, [cidade]);
  useEffect(() => {
    if (!cidadeInicial) return;
    const c = cidades.find((x) => x.cidade === cidadeInicial);
    if (c) { setCidade(c); setCasa(null); setPreco(null); setCustos(null); }
  }, [cidadeInicial, cidades]);

  const lugares = casa ?? casaPadrao;
  const ticket = preco ?? cidade.ticket_medio ?? 0;
  const vendidos = Math.min(cidade.publico, lugares);
  const ticketCentavos = Math.round(ticket * 100);
  const custoCentavos = custos === null ? null : Math.round(custos * 100);
  const bilheteria = vendidos * ticketCentavos;
  const equilibrio = ticketCentavos > 0 && custoCentavos !== null
    ? Math.ceil(custoCentavos / ticketCentavos)
    : null;
  const faixaCasa = casaPara(cidade.publico);
  const conf = CONFIANCA[cidade.confianca];
  const m = p.modelo;
  const sobra = cidade.publico - lugares;

  const mudou = (c = cidade, l = lugares) => marcar('simulador_usado', { sim: 'ingressos', cidade: c.cidade, casa: l });

  return (
    <div className="sim">
      <div className="sim-ingressos-grade">
        <div className="sim">
          <CidadeBusca cidades={cidades} valor={cidade} onChange={(c) => { setCidade(c); setCasa(null); setPreco(null); setCustos(null); mudou(c); }} />

          <div className="campo">
            <label htmlFor="casa" className="campo-rotulo">
              Casa de <strong className="num">{int(lugares)}</strong> lugares
              {casa == null && <span className="apoio"> · {cidade.provas.find((pr) => pr.capacidade) ? 'a casa que a banda já usou aqui' : 'uma casa do tamanho da previsão'}</span>}
            </label>
            <input id="casa" className="slider" type="range" min={0} max={DEGRAUS.length - 1} step={1}
              value={Math.max(DEGRAUS.indexOf(lugares), 0)}
              onChange={(e) => { const v = DEGRAUS[Number(e.target.value)]; setCasa(v); mudou(cidade, v); }} />
          </div>

          <div className="sim-valores">
            <div className="campo">
              <label htmlFor="ticket-medio" className="campo-rotulo">Preço médio por ingresso (R$)</label>
              <input id="ticket-medio" className="campo-input" type="number" inputMode="decimal" min="0" step="0.01"
                value={preco ?? cidade.ticket_medio ?? ''}
                onChange={(e) => setPreco(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} />
              {preco === null && ticketCentavos > 0 && (
                <p className="apoio">Referência {cidade.preco_proprio ? 'da praça' : 'das praças com preço publicado'}, com a premissa de metade dos ingressos a meia-entrada.</p>
              )}
            </div>
            <div className="campo">
              <label htmlFor="custo-show" className="campo-rotulo">Custo total estimado do show (R$)</label>
              <input id="custo-show" className="campo-input" type="number" inputMode="decimal" min="0" step="0.01"
                value={custos ?? ''} onChange={(e) => setCustos(e.target.value === '' ? null : Math.max(0, Number(e.target.value)))} />
              <p className="apoio">Inclua os gastos da operação. A conta considera bilheteria integral e custos fixos.</p>
            </div>
          </div>
          <p className="apoio">
            {sobra > lugares * 0.05
              ? <>A demanda estimada supera a capacidade em {int(sobra)} pessoas. Compare uma casa maior ou uma segunda data.</>
              : <>O cenário indica ocupação de {pct((vendidos / lugares) * 100)} da casa.</>}
          </p>
        </div>
        <div className="sim">
          <section className="sim-saida painel" aria-labelledby="h-bilheteria" aria-live="polite">
            <h3 id="h-bilheteria">Bilheteria da casa selecionada</h3>
            <p>{int(vendidos)} ingressos estimados em uma casa de {int(lugares)} lugares.</p>
            {ticketCentavos > 0 ? <p>Bilheteria bruta estimada <strong className="num">{reais.format(bilheteria / 100)}</strong></p>
              : <p className="apoio">Informe um preço médio para calcular a bilheteria.</p>}
            {equilibrio !== null && custoCentavos !== null && (
              <>
                <p>Ingressos para cobrir os custos <strong className="num">{int(equilibrio)}</strong></p>
                {equilibrio > lugares && <p>O ponto de equilíbrio supera a capacidade da casa.</p>}
                <p>Resultado estimado após os custos informados <strong className="num">{reais.format((bilheteria - custoCentavos) / 100)}</strong></p>
              </>
            )}
          </section>

          <div className="sim-saida painel" aria-live="polite">
            <p className="sim-numero num">{int(cidade.publico)}</p>
            <p className="sim-frase">
              Demanda estimada para um show próprio em {cidade.cidade}. Faixa indicativa entre <strong className="num">{int(cidade.publico_min)}</strong> e{' '}
              <strong className="num">{int(cidade.publico_max)}</strong> pessoas. Casa sugerida: {CASAS[faixaCasa].rotulo}.
            </p>
            <p className="apoio linha-conf">
              <span className={`pastilha pastilha-${cidade.confianca}`}>{conf.rotulo}</span> {conf.motivo}
            </p>
            {cidade.extrapolada && m.faixa_demanda && (
              <p className="apoio linha-conf">
                <span className="pastilha pastilha-baixa">fora do intervalo testado</span>
                O modelo foi medido em praças com afinidade de {dec(m.faixa_demanda[0], 1)}x a {dec(m.faixa_demanda[1], 1)}x a mediana.
                Esta aqui está fora disso, então a previsão é extrapolação e a faixa vem mais larga de propósito.
              </p>
            )}
            <p className="apoio">Estimativa exploratória baseada no histórico disponível.</p>
            <ol className="casas" aria-label="Tamanho de casa">
              {CASAS.map((c, i) => <li key={c.curto} className={i === faixaCasa ? 'sel' : ''} aria-current={i === faixaCasa ? 'true' : undefined}>{c.curto}</li>)}
            </ol>
          </div>
        </div>
      </div>

      {cidade.provas.length > 0 && (
        <section className="provas" aria-labelledby="h-provas">
          <h4 id="h-provas">O que a banda já fez em {cidade.cidade}</h4>
          <ul>
            {cidade.provas.map((pr) => (
              <li key={pr.data + pr.local} className={pr.esgotou ? 'esgotou' : undefined}>
                <span>{fraseProva(pr)}</span>
                {pr.motivo && <small className="apoio">Fora do ajuste: {pr.motivo}.</small>}
                {pr.fonte && <small className="apoio">{pr.fonte}</small>}
              </li>
            ))}
          </ul>
          <p className="apoio">Datas próprias nos últimos 12 meses: <strong className="num">{cidade.datas_ano}</strong>.</p>
        </section>
      )}

      <details className="conta">
        <summary>Como essa conta é feita</summary>
        <div className="conta-corpo">
          <p className="apoio">
            Não é uma taxa de conversão escolhida a dedo: é uma regressão sobre {m.n_shows} shows próprios da banda
            (de {m.n_provas} no histórico), nas praças com capacidade de casa conhecida. Cada show entra com peso —
            bilheteria confirmada pesa mais que ocupação presumida, e casa de configuração variável fica fora, porque a
            capacidade dela não diz quanta gente foi.
          </p>
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
              <span>Previsão da regressão</span>
              <strong className="num">{int(cidade.publico)}</strong>
              <small className="apoio">
                público ∝ base<sup>{dec(coef(m, 'ln_base') ?? 0, 2)}</sup>
                {coef(m, 'ln_demanda') != null && <> × afinidade<sup>{dec(coef(m, 'ln_demanda') as number, 2)}</sup></>}.
                O expoente da base é menor que 1: praça grande converte uma fatia menor ({pct(cidade.conv_pct)} aqui).{' '}
                {m.afinidade_fixa && 'Com poucos shows medidos, o expoente da afinidade fica fixo para não superajustar.'}
              </small>
            </li>
            <li>
              <span>Faixa de 8 em 10 cenários</span>
              <strong className="num">{int(cidade.publico_min)}–{int(cidade.publico_max)}</strong>
              <small className="apoio">
                ±{cidade.incerteza_pct}%, somando o erro do ajuste (R² {m.r2 != null ? dec(m.r2, 2) : '—'}, desvio de {pct(m.sigma * 100)} em log)
                e a distância desta praça para as praças que a banda já tocou.
              </small>
            </li>
          </ol>

          {m.validacao && (
            <div className="validacao">
              <h5>O quanto esse modelo erra</h5>
              <p className="apoio">
                Tiramos um show de cada vez do ajuste e pedimos ao modelo que previsse justamente ele. Nos{' '}
                <strong className="num">{m.validacao.n_medidos}</strong> shows com número de público, o erro foi de{' '}
                <strong className="num">{m.validacao.erro_mediano_pct}%</strong> na mediana e{' '}
                <strong className="num">{m.validacao.erro_medio_pct}%</strong> na média, com um pior caso de {m.validacao.erro_maximo_pct}%.
                Os outros {m.validacao.n_pisos} esgotaram, então só dizem um piso: o modelo respeitou{' '}
                <strong className="num">{m.validacao.pisos_respeitados}</strong> deles.
                {m.fator_faixa > 1.01 && <> A faixa original pegava o número real em {m.validacao.cobertura_pct}% das vezes,
                  menos que os 80% prometidos, então foi alargada {dec(m.fator_faixa, 2)}x — a que você vê já está corrigida.</>}
              </p>
              <table className="t-val">
                <thead><tr><th>Show</th><th>Real</th><th>Previsto</th><th>Erro</th></tr></thead>
                <tbody>
                  {m.validacao.linhas.map((l) => (
                    <tr key={l.data + l.local}>
                      <td>{l.cidade}, {dataBr(l.data)}<small className="apoio">{l.local}</small></td>
                      <td className="num">{int(l.real)}</td>
                      <td className="num">{int(l.previsto)}</td>
                      <td className="num">{l.esgotou && l.erro_pct === 0 ? 'piso ok' : `${l.erro_pct > 0 ? '+' : ''}${l.erro_pct}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {m.comparacao.length > 1 && (
                <p className="apoio">
                  Fórmula escolhida: <strong>{m.formula}</strong>. Testamos {m.comparacao.length} formas de montar a conta e
                  ficamos com a que erra menos nessa validação, não com a de R² mais alto
                  ({m.comparacao.map((c) => `${c.formula} ${c.erro_mediano_pct}%`).join(' · ')}). Coeficiente fora do plausível —
                  público crescendo mais que proporcionalmente à base, por exemplo — elimina a fórmula antes da validação.
                </p>
              )}
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
