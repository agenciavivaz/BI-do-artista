import type { Data } from '../types';

/** Acessa "shows.casos_cidade" dentro de data.json. */
export function caminho(data: Data, path: string | undefined): any {
  if (!path) return undefined;
  return path.split('.').reduce<any>((acc, k) => (acc == null ? acc : acc[k]), data);
}

/** Volume de dados de cada fonte (para o nível "ocioso" dos canais da mesa). */
export function volumesDasFontes(d: Data): Record<string, number> {
  const len = (x: any) => (Array.isArray(x) ? x.length : 0);
  return {
    ouvintes: len(d.historico),
    seguidores: len(d.plataformas),
    cidades: len(d.cidades),
    ibge: len(d.cidades),
    cidade_diaria: (d.shows?.casos_cidade ?? []).reduce((s: number, c: any) => s + len(c.serie), 0),
    youtube_cidades: len(d.youtube_cidades_12m),
    shows: len(d.shows?.eventos),
    lancamentos: len(d.lancamentos),
    faixas: len(d.faixas),
    albuns: len(d.albuns),
    sons: len(d.sons?.tiktok) + len(d.sons?.instagram),
    playlists: len(d.playlists?.evolucao) + len(d.playlists?.recomendadas),
    demografia: Object.values(d.publico ?? {}).reduce((s: number, p: any) => s + len(p?.faixas), 0),
    comentarios: d.comentarios?.n ?? 0,
    marcas: len(d.marcas),
    pares: len(d.pares),
    co_palco: len(d.co_palco),
    imprensa: len(d.contexto?.noticias),
  };
}

export function nivelOcioso(vol: Record<string, number>, id: string): number {
  const max = Math.max(1, ...Object.values(vol));
  const v = vol[id] ?? 0;
  return 0.12 + 0.3 * (Math.log1p(v) / Math.log1p(max));
}
