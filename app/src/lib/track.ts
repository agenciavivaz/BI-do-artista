import { track as vercelTrack } from '@vercel/analytics';

type Props = Record<string, string | number | boolean | null>;

/** Eventos do PRD §10. Falha em silêncio fora da Vercel. */
export function evento(nome: string, props?: Props): void {
  try {
    vercelTrack(nome, props);
  } catch {
    /* analytics indisponível */
  }
}
