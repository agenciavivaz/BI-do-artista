import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { Shell } from './components/shell/Shell';
import Inicio from './pages/Inicio';
import Pergunta from './pages/Pergunta';

const Perguntas = lazy(() => import('./pages/Perguntas'));
const Simular = lazy(() => import('./pages/Simular'));
const Streaming = lazy(() => import('./pages/Streaming'));
const Mapa = lazy(() => import('./pages/Mapa'));
const Dados = lazy(() => import('./pages/Dados'));

/** Em produção /slug/relatorio é arquivo estático; no dev (SPA) redirecionamos para ele. */
function Relatorio() {
  const { slug } = useParams();
  useEffect(() => { window.location.replace(`/${slug}/relatorio/index.html`); }, [slug]);
  return <p className="apoio">Abrindo o relatório…</p>;
}

function NaoAchei() {
  return (
    <div className="vazio">
      <h1 className="pergunta-titulo">Essa página não existe</h1>
      <a className="btn btn-primario" href="/fresno">Voltar ao início</a>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<div className="tela-msg" role="status"><p className="apoio">Carregando…</p></div>}>
      <Routes>
        <Route path="/" element={<Navigate replace to="/fresno" />} />
        <Route path="/:slug" element={<Shell />}>
          <Route index element={<Inicio />} />
          <Route path="p/:id" element={<Pergunta />} />
          <Route path="perguntas" element={<Perguntas />} />
          <Route path="simular" element={<Navigate replace to="ingressos" />} />
          <Route path="simular/:sim" element={<Simular />} />
          <Route path="streaming" element={<Streaming />} />
          <Route path="mapa" element={<Mapa />} />
          <Route path="dados" element={<Dados />} />
          <Route path="relatorio" element={<Relatorio />} />
          <Route path="*" element={<NaoAchei />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
