/**
 * Público provável por praça.
 *
 * Os números vêm prontos de data.json (`scripts/publico.py`): uma regressão
 * ponderada em escala log sobre os shows próprios da banda. Aqui ficam só as
 * faixas de casa, a conta da chance de esgotar uma casa qualquer (que é só a
 * lognormal da predição) e as frases de apoio.
 */
import type { Cidade, Data } from '../types';
import { dec, int } from './format';

export const CASAS = [
  { ate: 400, rotulo: 'até 400 lugares', curto: 'até 400' },
  { ate: 800, rotulo: '400 a 800 lugares', curto: '400–800' },
  { ate: 2000, rotulo: '800 a 2 mil lugares', curto: '800–2 mil' },
  { ate: 5000, rotulo: '2 mil a 5 mil lugares', curto: '2–5 mil' },
  { ate: Infinity, rotulo: '5 mil lugares ou mais', curto: '5 mil+' },
];
export const casaPara = (n: number) => CASAS.findIndex((c) => n < c.ate);

export interface Prova {
  local: string; data: string; capacidade: number | null;
  ocupacao: number | null; publico: number | null; esgotou: boolean; fonte: string;
  tipo?: string; motivo?: string | null;
}

export interface ShowUsado extends Prova { cidade: string; peso: number; no_ajuste: boolean; fator_tempo: number }

export interface PublicoPraca {
  fator_atualizacao: number;
  fator_fa: number;
  ouvintes_snapshot: number;
  ouvintes_atuais: number;
  modelo: {
    tipo: 'regressao' | 'referencia';
    formula: string;
    termos: string[];
    beta: number[];
    erro_padrao: number[] | null;
    sigma: number;
    r2: number | null;
    gl: number;
    n_shows: number;
    n_provas: number;
    afinidade_fixa: boolean;
    cidades: string[];
    validacao: {
      n: number;
      n_medidos: number;
      n_pisos: number;
      pisos_respeitados: number;
      erro_mediano_pct: number;
      erro_medio_pct: number;
      erro_maximo_pct: number;
      cobertura_pct: number;
      linhas: { cidade: string; local: string; data: string; real: number; previsto: number; erro_pct: number; esgotou: boolean }[];
    } | null;
    fator_faixa: number;
    faixa_base: [number, number] | null;
    faixa_demanda: [number, number] | null;
    prior_demanda: number;
    comparacao: {
      formula: string; coeficientes: number; beta: number[]; termos: string[];
      r2: number | null; erro_mediano_pct: number; erro_medio_pct: number; cobertura_pct: number;
    }[];
  };
  limiares: { crescer: number; encolher: number };
  datas_por_ano: Record<string, number>;
  shows_usados: ShowUsado[];
}

export const CONFIANCA: Record<string, { rotulo: string; motivo: string }> = {
  alta: { rotulo: 'há registro de casa cheia', motivo: 'A banda esgotou uma casa aqui, então sabemos o piso da demanda.' },
  media: { rotulo: 'praça já trabalhada', motivo: 'A banda já fez show próprio aqui; a bilheteria exata não é pública.' },
  baixa: { rotulo: 'praça nova', motivo: 'Sem show próprio no histórico: a predição vem só do tamanho e da afinidade da praça.' },
};

export const pub = (d: Data): PublicoPraca => d.publico_praca as PublicoPraca;

/** Chance de encher uma casa de `lugares`, pela lognormal da predição. */
export function chanceDeEsgotar(c: Cidade, lugares: number): number {
  if (!lugares || !c.publico || !c.ep) return 0;
  const z = (Math.log(lugares) - Math.log(c.publico)) / c.ep;
  return Math.round((1 - fi(z)) * 100);
}

/** Φ(z) por série de Abramowitz-Stegun (erf não existe no JS). */
function fi(z: number): number {
  const s = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return 0.5 * (1 + s * y);
}

/** coeficiente de um termo da regressão, se ele estiver na fórmula escolhida */
export const coef = (m: PublicoPraca['modelo'], termo: string) => {
  const i = m.termos.indexOf(termo);
  return i < 0 ? null : m.beta[i];
};

export const pct = (v: number) => `${dec(v, v % 1 ? 1 : 0)}%`;
export const dataBr = (iso: string) => iso.split('-').reverse().join('/');

/** "Araújo Vianna, 20/11/2026 — 3.628 lugares, 95% da casa" */
export function fraseProva(p: Prova): string {
  const partes = [`${p.local}, ${dataBr(p.data)}`];
  if (p.capacidade) partes.push(`${int(p.capacidade)} lugares`);
  if (p.tipo === 'dividido') partes.push('bill dividido');
  if (p.esgotou && (p.ocupacao ?? 1) >= 1) partes.push('esgotado');
  else if (p.esgotou) partes.push(`quase esgotado, ${pct((p.ocupacao ?? 0) * 100)} da casa`);
  else if (p.ocupacao) partes.push(`${pct(p.ocupacao * 100)} da casa`);
  else if (p.capacidade) partes.push('ocupação não publicada');
  return partes.join(' — ');
}

export const fraseAncora = fraseProva;
