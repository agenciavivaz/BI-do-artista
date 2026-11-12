import { useMemo, useState, type CSSProperties } from 'react';
import { useArtist } from '../../data/ArtistContext';
import { useMesa } from '../../data/MesaContext';
import { nivelOcioso, volumesDasFontes } from '../../lib/dados';
import { dataCurta } from '../../lib/format';

type Estado = 'ocioso' | 'ativo' | 'usado';

export function MesaDeCruzamento() {
  const { respostas, data } = useArtist();
  const { ativos, usados, canais } = useMesa();
  const [foco, setFoco] = useState<string | null>(null);
  const ids = Object.keys(respostas.fontes);
  const volumes = useMemo(() => volumesDasFontes(data), [data]);

  const estadoDe = (id: string): Estado => (ativos.includes(id) ? 'ativo' : usados.includes(id) ? 'usado' : 'ocioso');
  const nivelDe = (id: string) => { const e = estadoDe(id); return e === 'ativo' ? 0.96 : e === 'usado' ? 0.55 : nivelOcioso(volumes, id); };

  const leitura = foco
    ? respostas.fontes[foco]?.nome
    : ativos.length
      ? 'Cruzando: ' + ativos.map((a) => respostas.fontes[a]?.nome).join(' + ')
      : usados.length
        ? `${usados.length} ${usados.length === 1 ? 'fonte cruzada' : 'fontes cruzadas'} nesta resposta`
        : 'Toque num canal para ver a fonte';

  return (
    <aside className="mesa" aria-label="Mesa de cruzamento">
      <h2 className="mesa-titulo">Mesa de cruzamento</h2>
      <ul className="mesa-canais" aria-label="Fontes de dados">
        {ids.map((id) => {
          const f = respostas.fontes[id];
          const e = estadoDe(id);
          const rotulo = `${f.nome}: ${e === 'ativo' ? 'em uso agora' : e === 'usado' ? 'usada nesta resposta' : 'em espera'}`;
          return (
            <li
              key={id}
              ref={(el) => { canais.current[id] = el; }}
              className={`canal ${e}`}
              tabIndex={0}
              aria-label={rotulo}
              onFocus={() => setFoco(id)}
              onBlur={() => setFoco((c) => (c === id ? null : c))}
              onMouseEnter={() => setFoco(id)}
              onMouseLeave={() => setFoco((c) => (c === id ? null : c))}
              onClick={() => setFoco((c) => (c === id ? null : id))}
            >
              <span className="canal-led" aria-hidden="true" />
              <span className="canal-medidor" aria-hidden="true">
                <span className="canal-nivel" style={{ '--n': `${nivelDe(id) * 100}%` } as CSSProperties} />
              </span>
              <span className="canal-rotulo" aria-hidden="true">{f.curto}</span>
            </li>
          );
        })}
      </ul>
      <p className="mesa-leitura" role="status">{leitura}</p>
      <p className="mesa-rodape apoio">
        Fontes: <span className="num">{data.meta.arquivos}</span> relatórios até <span className="num">{dataCurta(data.meta.dados_ate)}</span>
      </p>
    </aside>
  );
}
