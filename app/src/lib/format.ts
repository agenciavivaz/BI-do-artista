const MINUS = '−';
const nf = (d: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const cache: Record<number, Intl.NumberFormat> = {};
const fmt = (d: number) => (cache[d] ??= nf(d));

export const int = (n: number) => fmt(0).format(Math.round(n));
export const dec = (n: number, d = 1) => fmt(d).format(n);

/** +12%, −7%. Sinal sempre visível (nunca só cor). */
export function signed(n: number, d = 0, suffix = '%'): string {
  const r = Number(n.toFixed(d));
  const s = r > 0 ? '+' : r < 0 ? MINUS : '';
  return s + fmt(d).format(Math.abs(r)) + suffix;
}

export function compact(n: number): string {
  const a = Math.abs(n);
  const sinal = n < 0 ? MINUS : '';
  if (a >= 1e6) return sinal + dec(a / 1e6, a < 1e7 ? 1 : 0).replace(',0', '') + ' mi';
  if (a >= 1e4) return sinal + int(a / 1e3) + ' mil';
  if (a >= 1e3) return sinal + dec(a / 1e3, 1).replace(',0', '') + ' mil';
  return sinal + int(a);
}

export const brl = (n: number) => 'R$ ' + int(n);

/** Arredonda para a dezena (mesma regra do pipeline: 3.161 -> 3.160). */
export const dezena = (n: number) => Math.round(n / 10) * 10;

export function dataLonga(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}
export function dataCurta(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(d);
}
export function dataMesAno(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(d).replace('.', '');
}

export const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export function mediana(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
