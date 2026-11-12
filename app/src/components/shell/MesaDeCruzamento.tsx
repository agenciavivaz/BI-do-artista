import { useMemo, type CSSProperties } from 'react';
import { useArtist } from '../../data/ArtistContext';
import { useMesa } from '../../data/MesaContext';
import { nivelOcioso, volumesDasFontes } from '../../lib/dados';

type Estado = 'ocioso' | 'ativo' | 'usado';

/**
 * Mesa de cruzamento — agora dentro do raciocínio, que é o único momento em que
 * ela quer dizer alguma coisa: cada canal é uma fonte e acende quando o sistema
 * a usa. Fora daí, a lista de fontes aparece em texto no pé da resposta.
 */
export function MesaDeCruzamento() {
  const { respostas, data } = useArtist();
  const { ativos, usados } = useMesa();
  const ids = Object.keys(respostas.fontes);
  const volumes = useMemo(() => volumesDasFontes(data), [data]);

  const estadoDe = (id: string): Estado => (ativos.includes(id) ? 'ativo' : usados.includes(id) ? 'usado' : 'ocioso');
  const nivelDe = (id: string) => { const e = estadoDe(id); return e === 'ativo' ? 0.96 : e === 'usado' ? 0.5 : nivelOcioso(volumes, id); };

  const acesas = ativos.map((a) => respostas.fontes[a]?.nome).filter(Boolean);

  return (
    <div className="mesa">
      <ul className="mesa-canais" aria-hidden="true">
        {ids.map((id) => (
          <li key={id} className={`canal ${estadoDe(id)}`} title={respostas.fontes[id].nome}>
            <span className="canal-medidor">
              <span className="canal-nivel" style={{ '--n': `${nivelDe(id) * 100}%` } as CSSProperties} />
            </span>
          </li>
        ))}
      </ul>
      <p className="mesa-leitura apoio">
        {acesas.length ? `Lendo: ${acesas.join(' + ')}` : `${ids.length} fontes na mesa`}
      </p>
    </div>
  );
}
