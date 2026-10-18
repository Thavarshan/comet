import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import './style.css';
import { App } from './App';
import { AppProvider } from './state';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);
