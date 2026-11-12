import { useMemo, useState } from 'react';
import { useArtist } from '../../data/ArtistContext';
import { MESES, MESES_LONGOS, mediana, signed } from '../../lib/format';
import { BarrasMensais } from '../blocks/Series';
import { useDebounceEvento } from './SimIngressos';

export function SimJanela() {
  const { data } = useArtist();
  const idx = data.sazonalidade.map((s) => s.idx);
  const medLanc = useMemo(() => mediana(data.lancamentos.map((l) => l.ajustado)), [data.lancamentos]);

  // Nível: onde os ouvintes ficam 1 mês depois, em relação à média do ano
  //   = índice sazonal do mês seguinte + efeito típico de um lançamento (mediana dos lançamentos).
  const niveis = useMemo(() => idx.map((_, m) => idx[(m + 1) % 12] + medLanc), [idx, medLanc]);
  // Salto (fórmula do PRD §5.5): índice do mês seguinte − índice do mês de lançamento + mediana dos lançamentos.
  const saltos = useMemo(() => idx.map((_, m) => idx[(m + 1) % 12] - idx[m] + medLanc), [idx, medLanc]);

  const melhor = niveis.indexOf(Math.max(...niveis));
  const proximo = (new Date(data.meta.dados_ate + 'T12:00:00').getMonth() + 1) % 12;
  const [mes, setMes] = useState(proximo);
  const marcar = useDebounceEvento();
  const dif = niveis[melhor] - niveis[mes];
  const frase =
    mes === melhor
      ? `Lançar em ${MESES_LONGOS[mes]} é o melhor caminho: um mês depois os ouvintes ficam ${signed(niveis[mes], 1)} em relação à média do ano.`
      : `Lançar em ${MESES_LONGOS[mes]}: um mês depois os ouvintes ficam ${signed(niveis[mes], 1)} em relação à média do ano. O melhor mês é ${MESES_LONGOS[melhor]} (${signed(niveis[melhor], 1)}), ${signed(dif, 1, ' pontos')} a mais.`;

  return (
    <div className="sim">
      <fieldset className="campo">
        <legend className="campo-rotulo">Mês de lançamento</legend>
        <div className="meses">
          {MESES.map((m, i) => (
            <button key={m} type="button" className={'mes' + (i === mes ? ' sel' : '')} aria-pressed={i === mes}
              onClick={() => { setMes(i); marcar('simulador_usado', { sim: 'janela', mes: m }); }}>
              {m}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="sim-saida painel" aria-live="polite">
        <p className="sim-numero num">{signed(niveis[mes], 1)}</p>
        <p className="sim-frase">{frase}</p>
        <p className="apoio sim-extra">Salto sobre o mês do lançamento: <strong className="num">{signed(saltos[mes], 1)}</strong>. Parte dele é a recuperação natural do calendário, não do lançamento.</p>
      </div>
      <BarrasMensais
        valores={MESES.map((m, i) => ({ mes: m, v: niveis[i] }))}
        fortes={[MESES[melhor]]} selecionado={mes}
        rotulo={`Ouvintes um mês depois de lançar em cada mês, em relação à média do ano. O melhor mês é ${MESES_LONGOS[melhor]}.`}
      />
      <p className="apoio nota">
        Nível = efeito sazonal do mês seguinte + mediana dos {data.lancamentos.length} lançamentos ({signed(medLanc, 1)}). Salto = esse nível − efeito sazonal do mês de lançamento.
        Sazonalidade de {data.sazonalidade_anos}.
      </p>
    </div>
  );
}
