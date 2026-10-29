import type { PageAccess } from '@/features/auth';

export type SidebarIconName =
  | 'home' | 'chart' | 'file' | 'loan' | 'check' | 'clock' | 'workflow'
  | 'grid' | 'identity' | 'users' | 'shield' | 'alert' | 'scan' | 'chain' | 'download' | 'faceScan' | 'key';

/**
 * Quyền cần để mở từng trang quản trị (khớp `OpsFunction` của backend). Menu ẩn mục không xem được, route hiện thẻ
 * "Không có quyền truy cập". Vận hành khoản vay gom bốn hàng đợi nên chỉ cần quyền Xem một trong số đó; bên trong trang
 * chỉ hiện nhóm việc xem được.
 */
export const PAGE_ACCESS = {
  dashboard: { anyView: ['dashboard'] },
  loans: { anyView: ['loan-application'] },
  operations: { anyView: ['collection', 'reschedule', 'withdrawal', 'reconciliation'] },
  funding: { anyView: ['funding'] },
  secondary: { anyView: ['secondary-market'] },
  products: { anyView: ['loan-product'] },
  customers: { anyView: ['customer'] },
  ekycReview: { anyView: ['ekyc'] },
  users: { adminOnly: true },
  staffRoles: { adminOnly: true },
  blockchain: { anyView: ['blockchain'] },
  aiPolicy: { anyView: ['ai-policy'] },
  aiScoring: { anyView: ['ai-scoring'] },
} satisfies Record<string, PageAccess>;

export interface AdminNavigationItem {
  to: string;
  label: string;
  icon: SidebarIconName;
  access: PageAccess;
  /** Các đường dẫn thuộc mục này, kể cả trang chi tiết, để tô mục đang chọn. */
  matches: (pathname: string) => boolean;
}

export interface AdminNavigationSection {
  /** Nhãn nhóm; rỗng thì nhóm không có tiêu đề. */
  label: string;
  items: AdminNavigationItem[];
}

const isLoanReview = (pathname: string) => /^\/loans\/[^/]+\/review$/.test(pathname);

/**
 * Menu chỉ liệt kê chức năng đã nối API. Chức năng chưa có (Auto-Invest quản trị,
 * giám sát giải ngân…) được thêm vào khi backend sẵn sàng, không hiện mục "Sắp triển khai".
 */
export const ADMIN_NAV_SECTIONS: AdminNavigationSection[] = [
  {
    label: '',
    items: [
      { to: '/dashboard', label: 'Tổng quan', icon: 'home', access: PAGE_ACCESS.dashboard, matches: (pathname) => pathname === '/dashboard' },
    ],
  },
  {
    label: 'Tín dụng',
    items: [
      {
        to: '/loans',
        label: 'Quản lý khoản vay',
        icon: 'loan',
        access: PAGE_ACCESS.loans,
        matches: (pathname) => pathname === '/loans' || isLoanReview(pathname),
      },
      {
        to: '/loans/operations',
        label: 'Vận hành khoản vay',
        icon: 'workflow',
        access: PAGE_ACCESS.operations,
        matches: (pathname) => ['/loans/operations', '/loans/overdue', '/reconciliation'].includes(pathname),
      },
    ],
  },
  {
    label: 'Đầu tư',
    items: [
      { to: '/investments/funding', label: 'Gọi vốn & Notes', icon: 'chart', access: PAGE_ACCESS.funding, matches: (pathname) => pathname.startsWith('/investments/funding') },
      { to: '/investments/secondary', label: 'Chợ thứ cấp Notes', icon: 'file', access: PAGE_ACCESS.secondary, matches: (pathname) => pathname === '/investments/secondary' },
    ],
  },
  {
    label: 'Sản phẩm',
    items: [
      { to: '/products', label: 'Sản phẩm vay', icon: 'grid', access: PAGE_ACCESS.products, matches: (pathname) => pathname === '/products' },
    ],
  },
  {
    label: 'Người dùng',
    items: [
      { to: '/customers/kyc', label: 'Khách hàng eKYC', icon: 'identity', access: PAGE_ACCESS.customers, matches: (pathname) => pathname.startsWith('/customers/kyc') },
      {
        to: '/customers/ekyc-review',
        label: 'Duyệt eKYC',
        icon: 'faceScan',
        access: PAGE_ACCESS.ekycReview,
        matches: (pathname) => pathname === '/customers/ekyc-review' || pathname.startsWith('/customers/ekyc-review/'),
      },
      { to: '/users', label: 'Người dùng & phân quyền', icon: 'users', access: PAGE_ACCESS.users, matches: (pathname) => pathname === '/users' },
      { to: '/users/roles', label: 'Vai trò nhân viên', icon: 'key', access: PAGE_ACCESS.staffRoles, matches: (pathname) => pathname === '/users/roles' },
    ],
  },
  {
    // Explorer proof của Blockchain Service (W3D, D54): đã nối API thật qua Gateway; nhân viên cần quyền Xem blockchain.
    label: 'Kiểm toán',
    items: [
      { to: '/blockchain/proofs', label: 'Xác minh giao dịch', icon: 'chain', access: PAGE_ACCESS.blockchain, matches: (pathname) => pathname === '/blockchain/proofs' },
    ],
  },
  {
    label: 'Cấu hình',
    items: [
      { to: '/loans/evaluation', label: 'Chính sách đánh giá AI', icon: 'shield', access: PAGE_ACCESS.aiPolicy, matches: (pathname) => pathname === '/loans/evaluation' },
      { to: '/loans/scoring', label: 'Chấm điểm & giải thích AI', icon: 'scan', access: PAGE_ACCESS.aiScoring, matches: (pathname) => pathname === '/loans/scoring' },
    ],
  },
];

/** Menu theo quyền: bỏ mục không xem được, bỏ cả nhóm khi không còn mục nào. */
export function visibleNavSections(canAccess: (access: PageAccess) => boolean): AdminNavigationSection[] {
  return ADMIN_NAV_SECTIONS
    .map((section) => ({ ...section, items: section.items.filter((item) => canAccess(item.access)) }))
    .filter((section) => section.items.length > 0);
}

/** Trang đầu tiên tài khoản mở được, theo thứ tự menu; null khi vai trò nhân viên chưa có quyền Xem nào. */
export function firstAccessiblePath(canAccess: (access: PageAccess) => boolean): string | null {
  return visibleNavSections(canAccess)[0]?.items[0]?.to ?? null;
}

export interface AdminBreadcrumb {
  section: string;
  /** Mục menu chứa trang; có khi đang ở trang chi tiết để bấm quay về danh sách. */
  parent: { label: string; to: string } | null;
  current: string;
}

const DETAIL_TITLES: Array<[RegExp, string]> = [
  [/^\/loans\/[^/]+\/review$/, 'Chi tiết hồ sơ vay'],
  [/^\/customers\/kyc\/[^/]+$/, 'Chi tiết khách hàng'],
  [/^\/customers\/ekyc-review\/[^/]+$/, 'Chi tiết lượt eKYC'],
  [/^\/investments\/funding\/[^/]+$/, 'Chi tiết khoản gọi vốn'],
];

/** Breadcrumb ở header: nhóm menu / trang (trang chi tiết thêm một cấp về danh sách). */
export function getAdminBreadcrumb(pathname: string): AdminBreadcrumb {
  for (const section of ADMIN_NAV_SECTIONS) {
    const item = section.items.find((entry) => entry.matches(pathname));
    if (!item) continue;
    const detail = DETAIL_TITLES.find(([pattern]) => pattern.test(pathname));
    return detail
      ? { section: section.label, parent: { label: item.label, to: item.to }, current: detail[1] }
      : { section: section.label, parent: null, current: item.label };
  }
  return { section: '', parent: null, current: 'Quản trị' };
}
