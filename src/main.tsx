// Nạp đầu tiên: khai báo thứ tự @layer (theme < base < components < utilities) phải đứng trước mọi CSS khác.
import './styles/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppProviders } from './app/providers';
import { SystemWakeGate } from './features/system-wake';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      {/* VM backend tự tắt khi rảnh: cổng này gọi /api/wake để bật lại và chờ hệ thống sẵn sàng. */}
      <SystemWakeGate>
        <App />
      </SystemWakeGate>
    </AppProviders>
  </StrictMode>,
);
