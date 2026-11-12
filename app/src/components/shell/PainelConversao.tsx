import { useArtist } from '../../data/ArtistContext';
import { useUi } from '../../data/UiContext';
import { Gaveta } from './Gaveta';

const MUDA = [
  ['Dados atualizados toda semana', 'Hoje é o retrato de um dia. A versão viva puxa a Chartmetric sozinha.'],
  ['Alertas no mesmo dia', 'Uma cidade disparou? Um som viralizou? Chega no e-mail e no WhatsApp.'],
  ['Perguntas livres com IA', 'Qualquer pergunta, respondida com os dados ao vivo, com o raciocínio à mostra.'],
  ['Área da equipe', 'Empresário, booker e artista no mesmo lugar, com as ações marcadas.'],
];

export function PainelConversao() {
  const { conversaoAberta, fecharConversao } = useUi();
  const { config } = useArtist();
  const c = config.contato;
  const zap = c.whatsapp.replace(/\D/g, '');
  const temContato = c.email || zap || c.instagram;
  return (
    <Gaveta aberta={conversaoAberta} onFechar={fecharConversao} titulo="Quer isso vivo?" id="conv">
      <p className="conv-texto">{c.texto_cta}</p>
      <h3 className="conv-sub">O que muda na versão completa</h3>
      <ul className="conv-lista">
        {MUDA.map(([t, d]) => (
          <li key={t}><strong>{t}</strong><span className="apoio">{d}</span></li>
        ))}
      </ul>
      {temContato && (
        <div className="conv-contato">
          <h3 className="conv-sub">Fale com a gente{c.nome ? `, ${c.nome}` : ''}</h3>
          <div className="chips">
            {c.email && <a className="btn btn-primario" href={`mailto:${c.email}`}>E-mail</a>}
            {zap && <a className="btn" href={`https://wa.me/${zap}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
            {c.instagram && <a className="btn" href={`https://instagram.com/${c.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer">Instagram</a>}
          </div>
        </div>
      )}
    </Gaveta>
  );
}
