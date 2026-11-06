// Nạp đầu tiên: khai báo thứ tự @layer (theme < base < components < utilities) phải đứng trước mọi CSS khác.
import './styles/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppProviders } from './app/providers';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
