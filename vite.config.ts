import { defineConfig, loadEnv, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

const DEPLOY_API_TARGET = 'https://finora-api.malaysiawest.cloudapp.azure.com';

/**
 * `npm run dev:deploy`: web chạy ở máy, mọi `/api/v1` đi thẳng tới Gateway trên Azure (giống rewrite của
 * vercel.json). Cookie phiên bản deploy gắn Domain là domain Vercel và cờ Secure, trình duyệt ở
 * http://localhost sẽ bỏ qua, nên proxy gỡ Domain và Secure để đăng nhập giữ được phiên.
 */
function deployProxy(target: string): Record<string, ProxyOptions> {
  return {
    // WebSocket sổ lệnh: Caddy trên VM chuyển thẳng investment. Origin localhost nằm trong INVESTMENT_WS_ALLOWED_ORIGINS
    // của compose Azure.
    '/ws': {
      target,
      changeOrigin: true,
      secure: true,
      ws: true,
    },
    '/api/v1': {
      target,
      changeOrigin: true,
      secure: true,
      cookieDomainRewrite: { '*': '' },
      configure: (proxy) => {
        proxy.on('proxyRes', (res) => {
          const cookies = res.headers['set-cookie'];
          if (cookies) res.headers['set-cookie'] = cookies.map((c) => c.replace(/;\s*Secure/gi, ''));
        });
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5173,
      proxy: mode === 'deploy' ? deployProxy(env.FINORA_API_TARGET || DEPLOY_API_TARGET) : {
        '/api/v1/auth': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
        '/api/v1/admin/users': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
        // Vai trò nhân viên (phân quyền web quản trị) thuộc User Service; đi qua Gateway như /admin/users, phải đứng
        // trước `/api/v1/admin` (mặc định về Loan). Gateway có route user-admin-service cho đường dẫn này.
        '/api/v1/admin/activity-logs': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
        '/api/v1/admin/staff-roles': {
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
        // Bằng chứng blockchain (R6, W3D) cũng đi qua Gateway (route blockchain-service); Blockchain đọc cookie phiên
        // và chỉ mở explorer cho ADMIN (B54).
        '/api/v1/blockchain': {
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
        // WebSocket sổ lệnh (/ws/order-books/<id>?ticket=...) đi thẳng Investment như trên VM (Caddy), vé lấy qua
        // POST /api/v1/investments/order-books/<id>/stream-ticket ở trên.
        '/ws': {
          target: 'http://localhost:8084',
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});
