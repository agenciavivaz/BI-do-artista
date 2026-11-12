import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { inject } from '@vercel/analytics';
import App from './App';
import './styles/tokens.css';
import './styles/base.css';
import './styles/shell.css';
import './styles/answer.css';
import './styles/blocks.css';
import './styles/pages.css';

inject();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
