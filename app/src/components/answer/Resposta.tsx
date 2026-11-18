import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useArtist } from '../../data/ArtistContext';
import { useUi } from '../../data/UiContext';
import { dataLonga } from '../../lib/format';
import { gravarJSON, lerJSON } from '../../lib/store';
import { evento } from '../../lib/track';
import type { Pergunta } from '../../types';
import { Bloco } from '../blocks/Bloco';
import { IcCheck, IcCopiar, IcInfo, IcLink } from '../shell/Icones';

export function SeloConfianca({ nivel, motivo }: Pergunta['confianca']) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const pontos = nivel === 'alta' ? 3 : nivel === 'média' ? 2 : 1;
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setAberto(false); } };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc, true);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc, true); };
  }, [aberto]);
  return (
    <div className="selo" ref={raiz}>
      <button type="button" className="selo-botao" aria-expanded={aberto} aria-controls="selo-motivo" onClick={() => setAberto((v) => !v)}>
        <span className="selo-pontos" aria-hidden="true">
          {[1, 2, 3].map((n) => <i key={n} className={n <= pontos ? 'on' : ''} />)}
        </span>
        confiança: {nivel}
        <IcInfo />
      </button>
      {aberto && <p id="selo-motivo" className="selo-popover" role="note">{motivo}</p>}
    </div>
  );
}

export function NumeroChave({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <li className="numero">
      <span className="numero-valor num">{valor}</span>
      <span className="numero-rotulo">{rotulo}</span>
    </li>
  );
}

export function Checklist({ q }: { q: Pergunta }) {
  const { slug, base } = useArtist();
  const chave = `camarim:${slug}:acoes:${q.id}`;
  const [marcadas, setMarcadas] = useState<boolean[]>(() => lerJSON<boolean[]>(chave, []));
  const alternar = (i: number) => {
    const novo = q.acoes.map((_, k) => (k === i ? !marcadas[k] : !!marcadas[k]));
    setMarcadas(novo);
    gravarJSON(chave, novo);
    if (novo[i]) evento('acao_marcada', { id: q.id });
  };
  return (
    <ul className="checklist">
      {q.acoes.map((a, i) => {
        const abreSim = q.simulador && /calculadora|simulador|simule/i.test(a);
        return (
          <li key={i} className={marcadas[i] ? 'feita' : ''}>
            <label>
              <input type="checkbox" checked={!!marcadas[i]} onChange={() => alternar(i)} />
              <span className="caixa" aria-hidden="true"><IcCheck /></span>
              <span className="acao-texto">{a}</span>
            </label>
            {abreSim && <Link className="btn acao-sim" to={`${base}/simular/${q.simulador}`} onClick={() => evento('simulador_usado', { sim: q.simulador!, origem: 'acao' })}>Abrir calculadora</Link>}
          </li>
        );
      })}
    </ul>
  );
}

export function textoParaCopiar(q: Pergunta, url: string, ate: string): string {
  const nums = q.numeros.map((n) => `• ${n.valor} ${n.rotulo}`).join('\n');
  const acoes = q.acoes.map((a) => `- ${a}`).join('\n');
  return `${q.pergunta}\n\n${q.veredito}\n\n${nums}\n\n${q.explicacao}\n\nO que fazer:\n${acoes}\n\nConfiança ${q.confianca.nivel}. Dados até ${ate}.\n${url}`;
}

async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = texto; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

export function Acoes({ q }: { q: Pergunta }) {
  const { data } = useArtist();
  const [aviso, setAviso] = useState('');
  const avisar = (m: string) => { setAviso(m); window.setTimeout(() => setAviso(''), 2200); };
  const url = `${window.location.origin}${window.location.pathname}`;
  return (
    <div className="resp-botoes">
      <button type="button" className="btn" onClick={async () => { const ok = await copiar(textoParaCopiar(q, url, dataLonga(data.meta.dados_ate))); if (ok) evento('resposta_copiada', { id: q.id }); avisar(ok ? 'Resposta copiada' : 'Não consegui copiar'); }}>
        <IcCopiar /> Copiar resposta
      </button>
      <button type="button" className="btn" onClick={async () => {
        if (navigator.share) { try { await navigator.share({ title: q.pergunta, url }); return; } catch { /* cancelou */ } }
        avisar((await copiar(url)) ? 'Link copiado' : 'Não consegui copiar');
      }}>
        <IcLink /> Compartilhar
      </button>
      <span className="aviso" role="status">{aviso}</span>
    </div>
  );
}

export function CtaVivo() {
  const { abrirConversao } = useUi();
  return (
    <aside className="cta-vivo noite">
      <div>
        <strong>Gostou? Isso funciona com qualquer pergunta.</strong>
        <p className="apoio">A versão viva atualiza toda semana e responde com a IA, com os dados ao vivo.</p>
      </div>
      <button type="button" className="btn btn-primario" onClick={() => abrirConversao('resposta')}>Sobre o piloto</button>
    </aside>
  );
}

export function RespostaBlocos({ q }: { q: Pergunta }) {
  return (
    <div className="blocos">
      {q.blocos.map((b, i) => <Bloco key={i} bloco={b} />)}
    </div>
  );
}
