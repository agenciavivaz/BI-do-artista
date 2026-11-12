import type { Pergunta } from '../types';

/**
 * Casamento aproximado de texto livre (PRD v2 §8).
 *  - frase de `variacoes` presente (todas as palavras) = +3
 *  - palavra que só aparece nas variações de UMA pergunta = +3 (+bônus por repetição)
 *  - palavra em comum com a pergunta ou palavra compartilhada = +1
 * Nota >= 3 abre a pergunta; empate abre as duas; abaixo disso, fallback.
 */

const VAZIAS = new Set(
  ('o a os as um uma uns umas de do da dos das em no na nos nas por para pra pro com sem e ou eu me meu minha meus minhas ' +
    'seu sua que se ao aos é ser sao foi ta tem ha como devo posso pode podem vale a pena isso isto esse essa').split(' '),
);
// "vale" e "pena" ficam fora das vazias de propósito? não: ver abaixo. Mantemos só funcionais.
VAZIAS.delete('vale');
VAZIAS.delete('pena');
VAZIAS.delete('como');

export function normalizar(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function radical(p: string): string {
  let r = p;
  if (r.length > 3 && r.endsWith('s')) r = r.slice(0, -1);
  if (r.length > 5) r = r.slice(0, 5);
  return r;
}

export function palavras(t: string, ignorar: string[] = []): string[] {
  const ign = new Set(ignorar.map(normalizar));
  return normalizar(t)
    .split(' ')
    .filter((p) => p && !VAZIAS.has(p) && !ign.has(p))
    .map(radical);
}

interface Indice {
  porPergunta: Map<string, { frases: string[][]; vocab: Map<string, { var: boolean; occ: number }> }>;
  unicas: Map<string, number>; // radical -> nº de perguntas em que aparece
}

const cache = new WeakMap<Pergunta[], Indice>();

function indexar(perguntas: Pergunta[], ignorar: string[]): Indice {
  const hit = cache.get(perguntas);
  if (hit) return hit;
  const porPergunta: Indice['porPergunta'] = new Map();
  const unicas = new Map<string, number>();
  for (const q of perguntas) {
    const vocab = new Map<string, { var: boolean; occ: number }>();
    const add = (p: string, daVar: boolean) => {
      const cur = vocab.get(p);
      if (cur) { cur.occ += 1; cur.var = cur.var || daVar; } else vocab.set(p, { var: daVar, occ: 1 });
    };
    palavras(q.pergunta, ignorar).forEach((p) => add(p, false));
    const frases = q.variacoes.map((v) => palavras(v, ignorar)).filter((f) => f.length);
    frases.forEach((f) => f.forEach((p) => add(p, true)));
    // exclusividade: em quantas perguntas (texto OU variações) o radical aparece
    vocab.forEach((_, p) => unicas.set(p, (unicas.get(p) ?? 0) + 1));
    porPergunta.set(q.id, { frases, vocab });
  }
  const idx = { porPergunta, unicas };
  cache.set(perguntas, idx);
  return idx;
}

export interface Pontuada { pergunta: Pergunta; nota: number }

export function pontuar(texto: string, perguntas: Pergunta[], opcoes: { ignorar?: string[]; prefixo?: boolean } = {}): Pontuada[] {
  const ignorar = opcoes.ignorar ?? [];
  const palavrasTexto = palavras(texto, ignorar);
  const bruto = normalizar(texto).split(' ').filter(Boolean);
  const set = new Set(palavrasTexto);
  const idx = indexar(perguntas, ignorar);
  const tem = (p: string) => set.has(p) || (!!opcoes.prefixo && bruto.some((b) => b.length >= 3 && normalizarRad(p).startsWith(b)));

  return perguntas
    .map((q) => {
      const info = idx.porPergunta.get(q.id)!;
      let nota = 0;
      const cobertas = new Set<string>();
      for (const f of info.frases) {
        if (f.every(tem)) { nota += 3; f.forEach((p) => cobertas.add(p)); }
      }
      for (const [p, v] of info.vocab) {
        if (cobertas.has(p) || !tem(p)) continue;
        const unica = v.var && idx.unicas.get(p) === 1;
        nota += (unica ? 3 : 1) + Math.min(v.occ - 1, 3) * 0.25;
      }
      return { pergunta: q, nota };
    })
    .sort((a, b) => b.nota - a.nota);
}
const normalizarRad = (p: string) => p;

export type Resultado =
  | { tipo: 'ok'; pergunta: Pergunta }
  | { tipo: 'empate'; perguntas: Pergunta[] }
  | { tipo: 'fallback'; proximas: Pergunta[] };

export function casar(texto: string, perguntas: Pergunta[], ignorar: string[] = []): Resultado {
  const r = pontuar(texto, perguntas, { ignorar });
  const [a, b] = r;
  if (a && a.nota >= 3) {
    if (b && b.nota >= 3 && a.nota - b.nota < 0.3) return { tipo: 'empate', perguntas: [a.pergunta, b.pergunta] };
    return { tipo: 'ok', pergunta: a.pergunta };
  }
  const proximas = r.filter((x) => x.nota >= 1.5).slice(0, 3).map((x) => x.pergunta);
  for (const q of perguntas) {
    if (proximas.length >= 3) break;
    if (q.destaque && !proximas.includes(q)) proximas.push(q);
  }
  return { tipo: 'fallback', proximas: proximas.slice(0, 3) };
}

/** Sugestões enquanto digita (aceita prefixo: "cach" acha cachê). */
export function sugerir(texto: string, perguntas: Pergunta[], ignorar: string[] = [], max = 5): Pergunta[] {
  if (normalizar(texto).length < 2) return [];
  const bruto = normalizar(texto);
  const exatas = pontuar(texto, perguntas, { ignorar, prefixo: true }).filter((x) => x.nota > 0);
  const contem = perguntas.filter((q) => normalizar(q.pergunta).includes(bruto));
  const out: Pergunta[] = [];
  [...contem, ...exatas.map((x) => x.pergunta)].forEach((q) => { if (!out.includes(q)) out.push(q); });
  return out.slice(0, max);
}
