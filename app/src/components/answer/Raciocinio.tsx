import { useEffect, useMemo, useRef, useState } from 'react';
import { useArtist } from '../../data/ArtistContext';
import { useMesa } from '../../data/MesaContext';
import type { Passo } from '../../types';
import { IcCheck } from '../shell/Icones';
import { MesaDeCruzamento } from '../shell/MesaDeCruzamento';

const MIN_TOTAL = 2400;
const MAX_TOTAL = 4500;
const MS_POR_CARACTERE = 25;

export function nomesDasFontes(passo: Passo, fontes: Record<string, { curto: string }>) {
  return passo.fontes.map((f) => fontes[f]?.curto ?? f).join(' + ');
}

interface Props { passos: Passo[]; onFim: () => void; onPular: () => void }

/** Fase A (PRD §5.3 e §9): digita cada etapa e acende, ao lado, a fonte que ela usa. */
export function Raciocinio({ passos, onFim, onPular }: Props) {
  const { respostas } = useArtist();
  const { definir } = useMesa();
  const botao = useRef<HTMLButtonElement>(null);
  const [t, setT] = useState(0);

  // linha do tempo: teto total entre 2,4 e 4,5 s, preservando a proporção de `ms`
  const tempos = useMemo(() => {
    const soma = passos.reduce((s, p) => s + p.ms, 0) || 1;
    const total = Math.min(MAX_TOTAL, Math.max(MIN_TOTAL, soma));
    const k = total / soma;
    let acc = 0;
    const lista = passos.map((p) => { const d = p.ms * k; const ini = acc; acc += d; return { ini, dur: d }; });
    return { lista, total };
  }, [passos]);

  useEffect(() => {
    const t0 = performance.now();
    const id = window.setInterval(() => setT(performance.now() - t0), 33);
    botao.current?.focus({ preventScroll: true });
    return () => window.clearInterval(id);
  }, []);

  let idx = 0;
  tempos.lista.forEach((x, i) => { if (t >= x.ini) idx = i; });
  const acabou = t >= tempos.total;

  useEffect(() => { if (acabou) onFim(); }, [acabou, onFim]);

  // mesa: canais da etapa atual acesos; etapas anteriores ficam "usadas"
  useEffect(() => {
    if (acabou) return;
    const ativos = passos[idx].fontes;
    const usados = passos.slice(0, idx).flatMap((p) => p.fontes).filter((f) => !ativos.includes(f));
    definir(ativos, Array.from(new Set(usados)));
  }, [idx, acabou, passos, definir]);

  const visiveis = passos.slice(0, idx + 1);
  const atual = passos[idx];
  const local = t - tempos.lista[idx].ini;
  const janelaDigitacao = Math.min(atual.texto.length * MS_POR_CARACTERE, tempos.lista[idx].dur * 0.85);
  const chars = Math.min(atual.texto.length, Math.ceil((local / janelaDigitacao) * atual.texto.length));

  return (
    <section className="pensando noite" aria-label="Raciocínio do sistema">
      <header className="pensando-topo">
        <span className="pensando-rotulo"><span className="pulso" aria-hidden="true" />Pensando</span>
        <button ref={botao} type="button" className="btn btn-leve" onClick={onPular}>Pular</button>
      </header>
      <MesaDeCruzamento />
      <ol className="passos">
        {visiveis.map((p, i) => {
          const corrente = i === idx && !acabou;
          return (
            <li key={i} className={'passo' + (corrente ? ' corrente' : ' feito')}>
              <span className="passo-marca" aria-hidden="true">{corrente ? <i className="girando" /> : <IcCheck />}</span>
              <span className="passo-texto" aria-hidden="true">
                {corrente ? atual.texto.slice(0, chars) : p.texto}
                {corrente && <span className="cursor" />}
              </span>
              <span className="passo-fonte" aria-hidden="true">{nomesDasFontes(p, respostas.fontes)}</span>
            </li>
          );
        })}
      </ol>
      {/* leitor de tela ouve cada etapa inteira, sem a digitação caractere a caractere */}
      <p className="sr-only" aria-live="polite">{atual.texto}</p>
    </section>
  );
}

/** Linha recolhida depois da resposta: "Cruzou 2 fontes em 4 etapas · ver". */
export function ResumoRaciocinio({ passos, aberto, onAlternar, idPainel }: { passos: Passo[]; aberto: boolean; onAlternar: () => void; idPainel: string }) {
  const { respostas } = useArtist();
  const fontes = Array.from(new Set(passos.flatMap((p) => p.fontes)));
  return (
    <div className="resumo-racio" id={idPainel}>
      <button type="button" className="resumo-botao" aria-expanded={aberto} onClick={onAlternar}>
        <span className="resumo-ok" aria-hidden="true"><IcCheck /></span>
        Cruzou {fontes.length} {fontes.length === 1 ? 'fonte' : 'fontes'} em {passos.length} {passos.length === 1 ? 'etapa' : 'etapas'}
        <span className="resumo-ver">· {aberto ? 'esconder' : 'ver'}</span>
      </button>
      {aberto && (
        <ol className="passos feitos">
          {passos.map((p, i) => (
            <li key={i} className="passo feito">
              <span className="passo-marca" aria-hidden="true"><IcCheck /></span>
              <span className="passo-texto">{p.texto}</span>
              <span className="passo-fonte">{nomesDasFontes(p, respostas.fontes)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
