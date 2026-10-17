import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api/v1/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/v1/admin/users': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/v1/users': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/v1/loan': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      // Hàng đợi sự cố tiền của Payment Service; phải đứng trước `/api/v1/admin` (mặc định về Loan).
      '/api/v1/admin/repayment-reconciliation': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      '/api/v1/admin/disbursement-reconciliation': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      // Hàng đợi lệnh rút tiền chờ đối soát (R4) cũng thuộc Payment.
      '/api/v1/admin/withdrawals': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      '/api/v1/admin': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      // AI đi qua Gateway (route ai-service) để giữ cùng đường với môi trường tích hợp; Gateway gọi AI
      // bằng HTTP/1.1 (B43) và AI kiểm cookie phiên (W3A).
      '/api/v1/ai': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/v1/market': {
        target: 'http://localhost:8084',
        changeOrigin: true,
      },
      '/api/v1/investments': {
        target: 'http://localhost:8084',
        changeOrigin: true,
      },
    },
  },
});
