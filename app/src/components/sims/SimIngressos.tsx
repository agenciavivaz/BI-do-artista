import { useEffect, useRef, useState } from 'react';
import { useArtist } from '../../data/ArtistContext';
import { dec, dezena, int } from '../../lib/format';
import { evento } from '../../lib/track';
import { CidadeBusca } from './CidadeBusca';

// faixas de casa do PRD §5.5
const CASAS = [
  { ate: 400, rotulo: 'até 400 lugares', curto: 'até 400' },
  { ate: 800, rotulo: '400 a 800 lugares', curto: '400–800' },
  { ate: 2000, rotulo: '800 a 2 mil lugares', curto: '800–2 mil' },
  { ate: 5000, rotulo: '2 mil a 5 mil lugares', curto: '2–5 mil' },
  { ate: Infinity, rotulo: '5 mil lugares ou mais', curto: '5 mil+' },
];
export const casaPara = (n: number) => CASAS.findIndex((c) => n < c.ate);

export function useDebounceEvento() {
  const t = useRef<number>();
  return (nome: string, props: Record<string, string | number>) => {
    window.clearTimeout(t.current);
    t.current = window.setTimeout(() => evento(nome, props), 700);
  };
}

export function SimIngressos({ cidadeInicial }: { cidadeInicial?: string | null }) {
  const { data } = useArtist();
  const cidades = data.cidades;
  const inicial = cidades.find((c) => c.cidade === cidadeInicial) ?? [...cidades].sort((a, b) => b.demanda_rel - a.demanda_rel)[0];
  const [cidade, setCidade] = useState(inicial);
  const [min, setMin] = useState(3);
  const [max, setMax] = useState(5);
  const marcar = useDebounceEvento();
  useEffect(() => { if (cidadeInicial) { const c = cidades.find((x) => x.cidade === cidadeInicial); if (c) setCidade(c); } }, [cidadeInicial, cidades]);

  const lo = dezena((cidade.ouvintes * min) / 100);
  const hi = dezena((cidade.ouvintes * max) / 100);
  const casa = casaPara((lo + hi) / 2);
  const pc = (v: number) => `${dec(v, v % 1 ? 1 : 0)}%`;
  const frase = min === max
    ? `Em ${cidade.cidade}, com ${pc(min)} de conversão: cerca de ${int(lo)} pessoas. Casa sugerida: ${CASAS[casa].rotulo}.`
    : `Em ${cidade.cidade}, com ${pc(min)} a ${pc(max)} de conversão: ${int(lo)} a ${int(hi)} pessoas. Casa sugerida: ${CASAS[casa].rotulo}.`;

  const mudou = (c = cidade, a = min, b = max) => marcar('simulador_usado', { sim: 'ingressos', cidade: c.cidade, de: a, ate: b });

  return (
    <div className="sim">
      <CidadeBusca cidades={cidades} valor={cidade} onChange={(c) => { setCidade(c); mudou(c); }} />
      <div className="sliders">
        <div className="campo">
          <label htmlFor="conv-min" className="campo-rotulo">Conversão mínima: <strong className="num">{dec(min, min % 1 ? 1 : 0)}%</strong></label>
          <input id="conv-min" className="slider" type="range" min={1} max={6} step={0.5} value={min}
            onChange={(e) => { const v = Number(e.target.value); setMin(v); if (v > max) setMax(v); mudou(cidade, v, Math.max(v, max)); }} />
        </div>
        <div className="campo">
          <label htmlFor="conv-max" className="campo-rotulo">Conversão máxima: <strong className="num">{dec(max, max % 1 ? 1 : 0)}%</strong></label>
          <input id="conv-max" className="slider" type="range" min={1} max={6} step={0.5} value={max}
            onChange={(e) => { const v = Number(e.target.value); setMax(v); if (v < min) setMin(v); mudou(cidade, Math.min(v, min), v); }} />
        </div>
      </div>
      <p className="apoio nota">Conversão é a parte dos ouvintes mensais da cidade que compra ingresso. Em geral fica entre 3% e 5%.</p>

      <div className="sim-saida painel" aria-live="polite">
        <p className="sim-numero num">{lo === hi ? int(lo) : <>{int(lo)} <span>a</span> {int(hi)}</>}</p>
        <p className="sim-frase">{frase}</p>
        <ol className="casas" aria-label="Tamanho de casa">
          {CASAS.map((c, i) => <li key={c.curto} className={i === casa ? 'sel' : ''} aria-current={i === casa ? 'true' : undefined}>{c.curto}</li>)}
        </ol>
      </div>
      <p className="apoio nota">{cidade.cidade} tem {int(cidade.ouvintes)} ouvintes mensais, dado de {cidade.atualizado.split('-').reverse().join('/')}.</p>
    </div>
  );
}
