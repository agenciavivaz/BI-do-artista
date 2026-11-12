import { useState } from 'react';
import { useArtist } from '../../data/ArtistContext';
import { brl, dec, dezena } from '../../lib/format';
import { CidadeBusca } from './CidadeBusca';
import { useDebounceEvento } from './SimIngressos';

// regras do PRD §5.5
function regra(demanda: number, base: number) {
  if (demanda >= 1.5) return { id: 'premio', de: base * 1.15, ate: base * 1.25, titulo: 'Prêmio sobre a tabela', texto: (c: string, x: string) => `Em ${c} a demanda é ${x} a mediana das praças. Peça de {de} a {ate}, de 15% a 25% acima da tabela.` };
  if (demanda >= 1) return { id: 'tabela', de: base, ate: base, titulo: 'Tabela cheia', texto: (c: string, x: string) => `Em ${c} a demanda é ${x} a mediana das praças. Mantenha a tabela: {de}.` };
  if (demanda >= 0.6) return { id: 'festival', de: base * 0.9, ate: base, titulo: 'Tabela com desconto', texto: (c: string, x: string) => `Em ${c} a demanda é ${x} a mediana das praças. Aceite de {de} a {ate} (até 10% abaixo da tabela), de preferência em festival.` };
  return { id: 'abertura', de: 0, ate: 0, titulo: 'Abertura', texto: (c: string, x: string) => `Em ${c} a demanda é ${x} a mediana das praças. Entre como abertura ou festival, com preço de entrada, até a base crescer.` };
}

export function SimCache({ cidadeInicial }: { cidadeInicial?: string | null }) {
  const { data } = useArtist();
  const cidades = data.cidades;
  const [cidade, setCidade] = useState(cidades.find((c) => c.cidade === cidadeInicial) ?? [...cidades].sort((a, b) => b.demanda_rel - a.demanda_rel)[0]);
  const [bruto, setBruto] = useState('20000');
  const base = Number(bruto.replace(/\D/g, '')) || 0;
  const marcar = useDebounceEvento();
  const r = regra(cidade.demanda_rel, base);
  const frase = r.texto(cidade.cidade, `${dec(cidade.demanda_rel, 2)}x`).replace('{de}', brl(dezena(r.de))).replace('{ate}', brl(dezena(r.ate)));
  return (
    <div className="sim">
      <CidadeBusca cidades={cidades} valor={cidade} onChange={(c) => { setCidade(c); marcar('simulador_usado', { sim: 'cache', cidade: c.cidade }); }} />
      <div className="campo">
        <label htmlFor="cache-base" className="campo-rotulo">Cachê base (a tabela que você cobra hoje), em R$</label>
        <input
          id="cache-base" className="campo-input" inputMode="numeric" autoComplete="off" value={base ? new Intl.NumberFormat('pt-BR').format(base) : ''} placeholder="Ex.: 20.000"
          onChange={(e) => { setBruto(e.target.value); marcar('simulador_usado', { sim: 'cache', cidade: cidade.cidade }); }}
        />
      </div>
      <div className="sim-saida painel" aria-live="polite">
        <p className="sim-selo">{r.titulo}</p>
        {r.id !== 'abertura' && base > 0 && (
          <p className="sim-numero num">{r.de === r.ate ? brl(dezena(r.de)) : <>{brl(dezena(r.de))} <span>a</span> {brl(dezena(r.ate))}</>}</p>
        )}
        <p className="sim-frase">{base > 0 || r.id === 'abertura' ? frase : 'Digite o cachê base para ver a faixa sugerida.'}</p>
        <ol className="casas" aria-label="Faixas de demanda">
          {[['abertura', 'abaixo de 0,6x'], ['festival', '0,6x a 1x'], ['tabela', '1x a 1,5x'], ['premio', 'acima de 1,5x']].map(([id, t]) => <li key={id} className={id === r.id ? 'sel' : ''} aria-current={id === r.id ? 'true' : undefined}>{t}</li>)}
        </ol>
      </div>
      <p className="apoio nota">Demanda = ouvintes por 100 mil habitantes da cidade ÷ mediana das {cidades.length} praças ({dec(data.cidades_mediana_100k, 0)}).</p>
    </div>
  );
}
