import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArtist } from '../../data/ArtistContext';
import { casar, sugerir } from '../../lib/match';
import { useMedia } from '../../lib/useMedia';
import { evento } from '../../lib/track';
import type { Pergunta } from '../../types';
import { IcBusca } from './Icones';

export function BarraDePergunta() {
  const { respostas, config, base } = useArtist();
  const nav = useNavigate();
  const [texto, setTexto] = useState('');
  const [aberta, setAberta] = useState(false);
  const [ativo, setAtivo] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const uid = useId();
  const estreito = useMedia('(max-width: 899px)');
  const ignorar = useMemo(() => [config.nome], [config.nome]);

  const lista: Pergunta[] = useMemo(() => {
    if (!texto.trim()) return respostas.perguntas.filter((p) => p.destaque).slice(0, 5);
    return sugerir(texto, respostas.perguntas, ignorar);
  }, [texto, respostas.perguntas, ignorar]);

  useEffect(() => setAtivo(-1), [texto]);

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      const digitando = alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.tagName === 'SELECT' || alvo.isContentEditable;
      if ((e.key === '/' && !digitando && !e.metaKey && !e.ctrlKey) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        input.current?.focus();
        input.current?.select();
      }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, []);

  const abrir = (p: Pergunta, entendi?: string) => {
    setTexto(''); setAberta(false); input.current?.blur();
    nav(`${base}/p/${p.id}`, { state: { origem: 'texto', entendi } });
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (ativo >= 0 && lista[ativo]) return abrir(lista[ativo]);
    const t = texto.trim();
    if (!t) return;
    const r = casar(t, respostas.perguntas, ignorar);
    if (r.tipo === 'ok') return abrir(r.pergunta, t);
    if (r.tipo === 'fallback') evento('pergunta_sem_resposta', { texto: t.slice(0, 140) });
    setTexto(''); setAberta(false); input.current?.blur();
    nav(`${base}/perguntas?q=${encodeURIComponent(t)}`);
  };

  const tecla = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAberta(true); setAtivo((a) => (a + 1) % Math.max(lista.length, 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo((a) => (a <= 0 ? lista.length - 1 : a - 1)); }
    else if (e.key === 'Escape') { setAberta(false); setAtivo(-1); input.current?.blur(); }
  };

  const listaId = `${uid}-lista`;
  const mostrar = aberta && lista.length > 0;
  return (
    <form className="barra" role="search" onSubmit={enviar}>
      <label className="sr-only" htmlFor={`${uid}-in`}>Pergunte sobre a carreira de {config.nome}</label>
      <span className="barra-icone"><IcBusca /></span>
      <input
        ref={input}
        id={`${uid}-in`}
        className="barra-input"
        type="text"
        autoComplete="off"
        enterKeyHint="search"
        placeholder={estreito ? 'Pergunte sobre a carreira…' : `Pergunte sobre a carreira da ${config.nome}…`}
        value={texto}
        onChange={(e) => { setTexto(e.target.value); setAberta(true); }}
        onFocus={() => setAberta(true)}
        onBlur={() => window.setTimeout(() => setAberta(false), 120)}
        onKeyDown={tecla}
        role="combobox"
        aria-expanded={mostrar}
        aria-controls={listaId}
        aria-autocomplete="list"
        aria-activedescendant={ativo >= 0 ? `${uid}-op-${ativo}` : undefined}
      />
      <kbd className="barra-atalho" aria-hidden="true">/</kbd>
      <ul id={listaId} role="listbox" className="barra-lista" hidden={!mostrar} aria-label={texto.trim() ? 'Perguntas parecidas' : 'Comece por aqui'}>
        {!texto.trim() && <li className="barra-cab" role="presentation">Comece por aqui</li>}
        {lista.map((p, i) => (
          <li
            key={p.id}
            id={`${uid}-op-${i}`}
            role="option"
            aria-selected={i === ativo}
            className={'barra-op' + (i === ativo ? ' ativo' : '')}
            onMouseDown={(e) => { e.preventDefault(); abrir(p); }}
          >
            {p.pergunta}
          </li>
        ))}
      </ul>
    </form>
  );
}
