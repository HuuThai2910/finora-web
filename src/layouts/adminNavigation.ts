export type SidebarIconName =
  | 'home' | 'chart' | 'file' | 'loan' | 'check' | 'clock' | 'workflow'
  | 'grid' | 'identity' | 'users' | 'shield' | 'alert' | 'scan' | 'chain' | 'download';

export interface AdminNavigationItem {
  to: string;
  label: string;
  icon: SidebarIconName;
  isAvailable: boolean;
}

export interface AdminNavigationSection {
  label: string;
  items: AdminNavigationItem[];
}

export const ADMIN_NAV_SECTIONS: AdminNavigationSection[] = [
  {
    label: 'TỔNG QUAN',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: 'home', isAvailable: false },
    ],
  },
  {
    label: 'ĐẦU TƯ & GIAO DỊCH',
    items: [
      { to: '/investments/funding', label: 'Gọi vốn & Notes', icon: 'chart', isAvailable: true },
      { to: '/investments/market', label: 'Bảng khớp lệnh', icon: 'chart', isAvailable: false },
      { to: '/investments/orders', label: 'Lệnh đầu tư', icon: 'file', isAvailable: false },
    ],
  },
  {
    label: 'QUẢN LÝ TÍN DỤNG',
    items: [
      { to: '/loans', label: 'Quản lý khoản vay', icon: 'loan', isAvailable: true },
      { to: '/loans?status=PENDING_REVIEW', label: 'Phê duyệt khoản vay', icon: 'check', isAvailable: true },
      { to: '/loans/overdue', label: 'Nợ quá hạn & Thu hồi', icon: 'clock', isAvailable: false },
      { to: '/disbursement', label: 'Giám sát giải ngân', icon: 'workflow', isAvailable: false },
    ],
  },
  {
    label: 'QUẢN LÝ SẢN PHẨM',
    items: [
      { to: '/products', label: 'Sản phẩm vay', icon: 'grid', isAvailable: true },
    ],
  },
  {
    label: 'NGƯỜI DÙNG',
    items: [
      { to: '/customers/kyc', label: 'Khách hàng — eKYC', icon: 'identity', isAvailable: true },
      { to: '/users', label: 'Người dùng & Phân quyền', icon: 'users', isAvailable: true },
    ],
  },
  {
    label: 'CẤU HÌNH & HỆ THỐNG',
    items: [
      { to: '/loans/evaluation', label: 'Chính sách đánh giá AI', icon: 'shield', isAvailable: true },
      { to: '/loans/scoring', label: 'Chấm điểm & Giải thích AI', icon: 'scan', isAvailable: true },
      { to: '/loans/npl-config', label: 'Cấu hình xử lý nợ xấu', icon: 'alert', isAvailable: false },
      { to: '/fraud-monitoring', label: 'Fraud & Cảnh báo sớm', icon: 'scan', isAvailable: false },
      { to: '/blockchain', label: 'Blockchain Explorer', icon: 'chain', isAvailable: false },
      { to: '/reconciliation', label: 'Đối soát & Báo cáo', icon: 'download', isAvailable: false },
    ],
  },
];

export function getAdminPageTitle(pathname: string): string {
  if (/^\/loans\/[^/]+\/review$/.test(pathname)) return 'Chi tiết hồ sơ vay';
  if (pathname === '/loans') return 'Quản lý khoản vay';
  if (pathname === '/products') return 'Sản phẩm vay';
  if (pathname === '/loans/evaluation') return 'Chính sách đánh giá AI';
  if (pathname === '/loans/scoring') return 'Chấm điểm & Giải thích AI';
  if (pathname === '/investments/funding') return 'Gọi vốn & Notes';
  if (pathname === '/users') return 'Người dùng & Phân quyền';
  if (/^\/customers\/kyc\/[^/]+$/.test(pathname)) return 'Chi tiết hồ sơ khách hàng';
  if (pathname === '/customers/kyc') return 'Khách hàng — eKYC';
  return 'Tổng quan';
}

