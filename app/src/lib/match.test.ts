import { readFileSync } from 'node:fs';
import { casar } from './match.ts';

const r = JSON.parse(readFileSync(new URL('../../public/data/fresno/respostas.json', import.meta.url), 'utf-8'));
const casos: [string, string][] = [
  ['quanto cobrar em campinas', 'onde-cobrar-mais'],
  ['quando soltar o single', 'quando-lancar'],
  ['show gratuito vale a pena', 'show-da-retorno'],
  ['quem ouve fresno', 'publico-de-verdade'],
  ['qual a receita da banda', 'FALLBACK'],
  ['Onde eu posso cobrar mais cachê?', 'onde-cobrar-mais'],
  ['qual o melhor mês para lançar', 'quando-lancar'],
  ['devo lançar o álbum em partes ou inteiro', 'album-ou-partes'],
  ['que marca patrocina', 'marca-certa'],
  ['vale a pena tocar em festival', 'festival-ou-proprio'],
  ['quantos ingressos vendo em porto alegre', 'quantos-ingressos'],
  ['onde postar mais, instagram ou tiktok', 'onde-investir-conteudo'],
  ['qual a cotação do dólar hoje', 'FALLBACK'],
  ['previsão dos próximos meses', 'proximos-meses'],
  ['feat com quem', 'com-quem-dividir-palco'],
];
let falhas = 0;
for (const [txt, esperado] of casos) {
  const res = casar(txt, r.perguntas, ['fresno']);
  const got = res.tipo === 'ok' ? res.pergunta.id : res.tipo === 'empate' ? 'EMPATE:' + res.perguntas.map((p) => p.id).join('+') : 'FALLBACK';
  const ok = got === esperado;
  if (!ok) falhas++;
  console.log(ok ? 'ok  ' : 'FAIL', JSON.stringify(txt), '->', got, ok ? '' : `(esperado ${esperado})`);
}
console.log(falhas ? `\n${falhas} falha(s)` : '\ntodos passaram');
process.exit(falhas ? 1 : 0);
