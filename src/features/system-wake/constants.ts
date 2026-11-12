/** Bật bằng VITE_SYSTEM_WAKE=true trên Vercel; ở máy dev backend chạy sẵn nên bỏ qua màn này. */
export const SYSTEM_WAKE_ENABLED = import.meta.env.VITE_SYSTEM_WAKE === 'true';

export const POLL_INTERVAL_MS = 5_000;
/** Cả cụm thường cần khoảng 5 phút; quá 12 phút thì dừng hỏi và cho người dùng thử lại. */
export const START_TIMEOUT_MS = 12 * 60_000;
/** Khoảng cách tối thiểu giữa hai lần gửi lệnh bật khi VM còn đang tắt dở. */
export const RESTART_REQUEST_GAP_MS = 30_000;

/** Lưu mã bật hệ thống để lần sau vào web là tự bật, không phải nhập lại. */
export const WAKE_CODE_STORAGE_KEY = 'finora.systemWakeCode';

/**
 * Tên hiển thị của các container trong file trạng thái của VM, cùng danh sách SERVICES trong
 * deploy/host/finora-status.sh của finora-platform. Container không có ở đây thì hiện đúng tên.
 */
export const SERVICE_LABELS: Record<string, string> = {
  caddy: 'Cổng HTTPS',
  kafka: 'Kafka',
  keycloak: 'Keycloak (đăng nhập)',
  fineract: 'Fineract (core cho vay)',
  ai: 'AI chấm điểm',
  user: 'User',
  notification: 'Notification',
  payment: 'Payment',
  investment: 'Investment',
  loan: 'Loan',
  'blockchain-db': 'Database Blockchain',
  blockchain: 'Blockchain',
  gateway: 'Gateway',
  'fabric-orderer': 'Fabric orderer',
  'fabric-peer0-org1': 'Fabric peer Org1',
  'fabric-peer0-org2': 'Fabric peer Org2',
  'fabric-ccaas-org1': 'Chaincode Org1',
  'fabric-ccaas-org2': 'Chaincode Org2',
};
