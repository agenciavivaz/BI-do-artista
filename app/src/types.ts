export type FonteId = string;

export interface Fonte { nome: string; curto: string }

export interface Passo { texto: string; fontes: FonteId[]; ms: number }

export interface Bloco {
  tipo: string;
  dados?: string;
  titulo?: string;
  campo?: string;
  colunas?: string[];
  filtro?: Record<string, string[]>;
  destacar?: string[];
  plataformas?: string[];
  simulador?: 'ingressos' | 'cache' | 'janela';
}

export interface Pergunta {
  id: string;
  tema: string;
  destaque?: boolean;
  simulador?: 'ingressos' | 'janela' | 'cache';
  pergunta: string;
  variacoes: string[];
  pensando: Passo[];
  veredito: string;
  explicacao: string;
  numeros: { valor: string; rotulo: string }[];
  blocos: Bloco[];
  acoes: string[];
  confianca: { nivel: 'alta' | 'média' | 'baixa'; motivo: string };
  seguintes: string[];
}

export interface Alerta {
  tipo: 'oportunidade' | 'investigar' | 'atencao' | 'previsao';
  titulo: string;
  pergunta: string | null;
  texto?: string;
}

export interface Respostas {
  artista: string;
  gerado_em: string;
  fontes: Record<FonteId, Fonte>;
  temas: { id: string; nome: string; descricao: string }[];
  alertas: Alerta[];
  perguntas: Pergunta[];
  fallback: { titulo: string; texto: string };
}

export interface Cidade {
  cidade: string;
  ouvintes: number;
  populacao: number;
  por100k: number;
  demanda_rel: number;
  faixa: 'premium' | 'cheia' | 'construcao' | 'abrir';
  acao: string;
  afinidade: number | null;
  yt_3m: number | null;
  ingressos_min: number;
  ingressos_max: number;
  coord: [number, number] | null;
  atualizado: string;
  /** público provável (scripts/publico.py, calibrado nas âncoras do config) */
  ouvintes_hoje: number;
  base_fa: number;
  conv_pct: number;
  publico_min: number;
  publico: number;
  publico_max: number;
  casa: number;
  confianca: 'alta' | 'media' | 'baixa';
  datas_ano: number;
  publico_ano: number | null;
  ancora: {
    local: string; data: string; capacidade: number | null;
    ocupacao: number | null; publico: number | null; fonte: string;
  } | null;
}

export interface Indice { chave: string; nome: string; valor: number; frase: string; explica: string }

/** data.json é grande e vem do pipeline; só tipamos o que o app lê por campo fixo. */
export interface Data {
  meta: { artista: string; slug: string; gerado_em: string; dados_ate: string; desde: string; fonte: string; arquivos: number };
  kpis: { ouvintes: number; ouvintes_g12: number; seguidores_spotify: number; lealdade: number; fas_total: number; conversao_spotify: number };
  indices: Indice[];
  sazonalidade: { mes: string; idx: number }[];
  sazonalidade_anos: string;
  melhores_meses: string[];
  piores_meses: string[];
  historico: { mes: string; valor: number }[];
  previsao: { mes: string; valor: number; min: number; max: number }[];
  lancamentos: { data: string; nome: string; bruto: number; ajustado: number; antes: number; depois: number }[];
  cidades: Cidade[];
  cidades_mediana_100k: number;
  [chave: string]: any;
}

export interface Config {
  nome: string;
  subtitulo: string;
  cidade_origem: string;
  desde: number;
  carta: string;
  contato: { nome: string; email: string; whatsapp: string; instagram: string; texto_cta: string };
  tema: { destaque: string; [k: string]: string };
}

export const FAIXAS: Record<Cidade['faixa'], { rotulo: string; curto: string; opacidade: number; neutro?: boolean }> = {
  premium: { rotulo: 'Prêmio de 15% a 25%', curto: 'Prêmio', opacidade: 1 },
  cheia: { rotulo: 'Tabela cheia', curto: 'Tabela', opacidade: 0.66 },
  construcao: { rotulo: 'Praça em construção', curto: 'Construção', opacidade: 0.38 },
  abrir: { rotulo: 'Abrir mercado', curto: 'Abrir', opacidade: 1, neutro: true },
};
