import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppProviders } from './app/providers';
import { SystemWakeGate } from './features/system-wake';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <SystemWakeGate>
        <App />
      </SystemWakeGate>
    </AppProviders>
  </StrictMode>,
);
