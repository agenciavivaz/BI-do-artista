import { useEffect, useMemo, useRef, useState } from 'react';
import { useArtist } from '../../data/ArtistContext';
import { dec, int } from '../../lib/format';
import { CASAS, CONFIANCA, casaPara, chanceDeEsgotar, coef, dataBr, fraseProva, pct, pub } from '../../lib/publico';
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
const DEGRAUS = [200, 300, 400, 500, 700, 900, 1200, 1500, 2000, 2500, 3000, 3600, 4400, 5500, 7000, 8500, 10000, 13000, 16000, 20000];
const maisPerto = (n: number) => DEGRAUS.reduce((a, b) => (Math.abs(b - n) < Math.abs(a - n) ? b : a), DEGRAUS[0]);

export function SimIngressos({ cidadeInicial }: { cidadeInicial?: string | null }) {
  const { data, config } = useArtist();
  const p = pub(data);
  const cidades = data.cidades;
  const inicial = cidades.find((c) => c.cidade === cidadeInicial) ?? [...cidades].sort((a, b) => b.publico - a.publico)[0];
  const [cidade, setCidade] = useState(inicial);
  const [casa, setCasa] = useState<number | null>(null); // null = a casa que a banda já usou
  const marcar = useDebounceEvento();

  const casaPadrao = useMemo(() => {
    const ultima = cidade.provas.find((pr) => pr.capacidade);
    return maisPerto(ultima?.capacidade ?? cidade.publico);
  }, [cidade]);
  useEffect(() => {
    if (!cidadeInicial) return;
    const c = cidades.find((x) => x.cidade === cidadeInicial);
    if (c) { setCidade(c); setCasa(null); }
  }, [cidadeInicial, cidades]);

  const lugares = casa ?? casaPadrao;
  const chance = chanceDeEsgotar(cidade, lugares);
  const faixaCasa = casaPara(cidade.publico);
  const conf = CONFIANCA[cidade.confianca];
  const m = p.modelo;
  const sobra = cidade.publico - lugares;

  const mudou = (c = cidade, l = lugares) => marcar('simulador_usado', { sim: 'ingressos', cidade: c.cidade, casa: l });

  return (
    <div className="sim">
      <CidadeBusca cidades={cidades} valor={cidade} onChange={(c) => { setCidade(c); setCasa(null); mudou(c); }} />

      <div className="sim-saida painel" aria-live="polite">
        <p className="sim-numero num">{int(cidade.publico)}</p>
        <p className="sim-frase">
          Em {cidade.cidade}, o público mais provável de um show próprio é de <strong className="num">{int(cidade.publico)}</strong> pessoas.
          Em 8 de cada 10 cenários fica entre <strong className="num">{int(cidade.publico_min)}</strong> e{' '}
          <strong className="num">{int(cidade.publico_max)}</strong>. Casa sugerida: {CASAS[faixaCasa].rotulo}.
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
        {cidade.ticket_medio && (
          <p className="apoio">
            Bilheteria bruta provável: <strong className="num">R$ {int(cidade.bilheteria ?? 0)}</strong> — {int(cidade.publico)} pessoas
            a um ticket médio de R$ {int(cidade.ticket_medio)}
            {cidade.preco_proprio
              ? ` (preço praticado pela banda nesta praça: inteira de R$ ${int(cidade.preco_inteira ?? 0)})`
              : ` (sem preço publicado aqui; usamos a mediana das praças, inteira de R$ ${int(cidade.preco_inteira ?? 0)})`}.
            A conta supõe que metade do público paga meia.
          </p>
        )}
        <ol className="casas" aria-label="Tamanho de casa">
          {CASAS.map((c, i) => <li key={c.curto} className={i === faixaCasa ? 'sel' : ''} aria-current={i === faixaCasa ? 'true' : undefined}>{c.curto}</li>)}
        </ol>
      </div>

      <div className="campo">
        <label htmlFor="casa" className="campo-rotulo">
          Casa de <strong className="num">{int(lugares)}</strong> lugares
          {casa == null && <span className="apoio"> · {cidade.provas.find((pr) => pr.capacidade) ? 'a casa que a banda já usou aqui' : 'uma casa do tamanho da previsão'}</span>}
        </label>
        <input id="casa" className="slider" type="range" min={0} max={DEGRAUS.length - 1} step={1}
          value={Math.max(DEGRAUS.indexOf(lugares), 0)}
          onChange={(e) => { const v = DEGRAUS[Number(e.target.value)]; setCasa(v); mudou(cidade, v); }} />
        <div className="chance">
          <div className="chance-trilho"><i style={{ width: `${chance}%` }} /></div>
          <p className="chance-valor">
            <strong className="num">{chance}%</strong> de chance de esgotar {int(lugares)} lugares
          </p>
        </div>
        <p className="apoio">
          {sobra > lugares * 0.05
            ? <>Sobra demanda: cerca de <strong className="num">{int(sobra)}</strong> pessoas ficariam sem ingresso — é o argumento de casa maior ou de uma segunda data.</>
            : sobra < -lugares * 0.3
              ? <>A casa é grande para a praça hoje: a previsão enche <strong className="num">{pct((cidade.publico / lugares) * 100)}</strong> dela.</>
              : <>Casa e demanda batem: é o cenário de manter a casa e subir o preço.</>}
        </p>
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
                {m.validacao.n} shows medidos, o erro foi de <strong className="num">{m.validacao.erro_mediano_pct}%</strong> na
                mediana e <strong className="num">{m.validacao.erro_medio_pct}%</strong> na média, com um pior caso de{' '}
                {m.validacao.erro_maximo_pct}%. A faixa original pegava o número real em {m.validacao.cobertura_pct}% das vezes,
                menos que os 80% prometidos, então ela foi alargada {dec(m.fator_faixa, 2)}x — a faixa que você vê já está corrigida.
              </p>
              <table className="t-val">
                <thead><tr><th>Show</th><th>Real</th><th>Previsto</th><th>Erro</th></tr></thead>
                <tbody>
                  {m.validacao.linhas.map((l) => (
                    <tr key={l.data + l.local}>
                      <td>{l.cidade}, {dataBr(l.data)}<small className="apoio">{l.local}</small></td>
                      <td className="num">{int(l.real)}</td>
                      <td className="num">{int(l.previsto)}</td>
                      <td className="num">{l.erro_pct > 0 ? '+' : ''}{l.erro_pct}%</td>
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
