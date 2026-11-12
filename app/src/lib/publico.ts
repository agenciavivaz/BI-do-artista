/**
 * Público provável por praça.
 *
 * Os números vêm prontos de data.json (campos `base_fa`, `conv_pct`, `publico*`,
 * `ancora`, `confianca`), calculados por `scripts/publico.py`. Aqui só ficam:
 * as faixas de casa, o recálculo ao vivo quando a pessoa mexe no slider de
 * conversão (uma multiplicação sobre a base da praça) e as frases de apoio.
 *
 * Modelo, em uma linha: a fatia da base de fãs que compra ingresso cai conforme
 * a praça cresce e sobe conforme a afinidade local. As duas constantes são
 * calibradas nos shows reais da banda (ver o cabeçalho de scripts/publico.py).
 */
import type { Cidade, Data } from '../types';
import { dec, dezena, int } from './format';

export const CASAS = [
  { ate: 400, rotulo: 'até 400 lugares', curto: 'até 400' },
  { ate: 800, rotulo: '400 a 800 lugares', curto: '400–800' },
  { ate: 2000, rotulo: '800 a 2 mil lugares', curto: '800–2 mil' },
  { ate: 5000, rotulo: '2 mil a 5 mil lugares', curto: '2–5 mil' },
  { ate: Infinity, rotulo: '5 mil lugares ou mais', curto: '5 mil+' },
];
export const casaPara = (n: number) => CASAS.findIndex((c) => n < c.ate);

export interface Ancora {
  local: string;
  data: string;
  capacidade: number | null;
  ocupacao: number | null;
  publico: number | null;
  fonte: string;
}

export interface PublicoPraca {
  fator_atualizacao: number;
  fator_fa: number;
  conv_ref_pct: number;
  base_ref: number;
  expoente_escala: number;
  expoente_demanda: number;
  conv_min_pct: number;
  banda: Record<string, number>;
  conv_max_pct: number;
  cidade_casa: string | null;
  ancoras_calibradas: number;
  residuo_pct: number | null;
  ouvintes_snapshot: number;
  ouvintes_atuais: number;
  ancoras: ({ cidade: string } & Ancora)[];
  datas_por_ano: Record<string, number>;
}

export const CONFIANCA: Record<string, { rotulo: string; motivo: string }> = {
  alta: { rotulo: 'ancorado em bilheteria', motivo: 'A banda já fez essa praça e sabemos quanto vendeu.' },
  media: { rotulo: 'praça conhecida', motivo: 'Há show próprio na praça ou base grande o bastante para a conta ser estável.' },
  baixa: { rotulo: 'estimativa larga', motivo: 'Praça pequena e sem show próprio no histórico: a faixa é larga de propósito.' },
};

export const pub = (d: Data): PublicoPraca => d.publico_praca as PublicoPraca;

/** Público para uma conversão escolhida à mão (slider), sobre a base de fãs da praça. */
export const publicoCom = (c: Cidade, convPct: number) => dezena((c.base_fa * convPct) / 100);

export const pct = (v: number) => `${dec(v, v % 1 ? 1 : 0)}%`;

const dataBr = (iso: string) => iso.split('-').reverse().join('/');

/** "Em 20/11/2026 vocês levaram 3.450 pessoas ao Auditório Araújo Vianna (3.628 lugares, 95% da casa)." */
export function fraseAncora(a: Ancora): string {
  const onde = `${a.local}${a.capacidade ? ` (${int(a.capacidade)} lugares)` : ''}`;
  if (a.publico) {
    const ocup = a.ocupacao ? `, ${pct(a.ocupacao * 100)} da casa` : '';
    return `Em ${dataBr(a.data)} a banda levou cerca de ${int(a.publico)} pessoas ao ${onde}${ocup}.`;
  }
  return `A banda já tocou no ${onde} em ${dataBr(a.data)}, mas a bilheteria não está no export.`;
}
