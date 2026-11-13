import type { PageAccess } from '@/features/auth';

export type SidebarIconName =
  | 'home' | 'chart' | 'file' | 'loan' | 'check' | 'clock' | 'workflow'
  | 'grid' | 'identity' | 'users' | 'shield' | 'alert' | 'scan' | 'chain' | 'download' | 'faceScan' | 'key' | 'terminal';

/**
 * Quyền cần để mở từng trang quản trị (khớp `OpsFunction` của backend). Menu ẩn mục không xem được, route hiện thẻ
 * "Không có quyền truy cập". Quản lý khoản vay mở cho cả nhân viên thu hồi, cơ cấu, đối soát vì việc sau giải ngân của
 * từng khoản vay nằm ở tab "Sau giải ngân" của hồ sơ; nút xét duyệt hồ sơ vẫn chỉ theo quyền Thao tác "Hồ sơ vay".
 */
export const PAGE_ACCESS = {
  dashboard: { anyView: ['dashboard'] },
  loans: { anyView: ['loan-application', 'collection', 'reschedule', 'reconciliation'] },
  funding: { anyView: ['funding'] },
  secondary: { anyView: ['secondary-market'] },
  products: { anyView: ['loan-product'] },
  customers: { anyView: ['customer'] },
  // Duyệt xác minh mở từ menu dòng của trang Khách hàng, không có mục menu riêng.
  ekycReview: { anyView: ['ekyc'] },
  users: { adminOnly: true },
  staffRoles: { adminOnly: true },
  blockchain: { anyView: ['blockchain'] },
  aiPolicy: { anyView: ['ai-policy'] },
  // Body gửi lên dù đã che vẫn có dữ liệu cá nhân nên chỉ ADMIN; finora-user cũng kiểm lại.
  activityLogs: { adminOnly: true },
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
 * Menu chỉ liệt kê chức năng đã nối API. Chức năng chưa có (giám sát giải ngân…)
 * được thêm vào khi backend sẵn sàng, không hiện mục "Sắp triển khai".
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
      { to: '/products', label: 'Sản phẩm vay', icon: 'grid', access: PAGE_ACCESS.products, matches: (pathname) => pathname === '/products' },
      // Explorer proof của Blockchain Service (W3D, D54): đối chiếu bằng chứng giao dịch đã neo trên sổ cái.
      { to: '/blockchain/proofs', label: 'Kiểm toán', icon: 'chain', access: PAGE_ACCESS.blockchain, matches: (pathname) => pathname === '/blockchain/proofs' },
    ],
  },
  {
    label: 'Đầu tư',
    items: [
      { to: '/investments/funding', label: 'Gọi vốn', icon: 'chart', access: PAGE_ACCESS.funding, matches: (pathname) => pathname.startsWith('/investments/funding') },
      { to: '/investments/secondary', label: 'Chợ chuyển nhượng', icon: 'file', access: PAGE_ACCESS.secondary, matches: (pathname) => pathname.startsWith('/investments/secondary') },
    ],
  },
  {
    label: 'Người dùng',
    items: [
      { to: '/customers/kyc', label: 'Khách hàng', icon: 'identity', access: PAGE_ACCESS.customers, matches: (pathname) => pathname.startsWith('/customers/kyc') },
      // Phân quyền gồm hai phần chuyển bằng tab đầu trang: Người dùng (/users) và Vai trò nhân viên (/users/roles).
      { to: '/users', label: 'Phân quyền', icon: 'users', access: PAGE_ACCESS.users, matches: (pathname) => pathname === '/users' || pathname === '/users/roles' },
    ],
  },
  {
    label: 'Hệ thống',
    items: [
      { to: '/loans/evaluation', label: 'Chính sách đánh giá AI', icon: 'shield', access: PAGE_ACCESS.aiPolicy, matches: (pathname) => pathname === '/loans/evaluation' },
      { to: '/system/activity-logs', label: 'Nhật ký hoạt động', icon: 'terminal', access: PAGE_ACCESS.activityLogs, matches: (pathname) => pathname === '/system/activity-logs' },
    ],
  },
];

/** Menu theo quyền: bỏ mục không xem được, bỏ cả nhóm khi không còn mục nào. */
export function visibleNavSections(canAccess: (access: PageAccess) => boolean): AdminNavigationSection[] {
  return ADMIN_NAV_SECTIONS
    .map((section) => ({ ...section, items: section.items.filter((item) => canAccess(item.access)) }))
    .filter((section) => section.items.length > 0);
}

/** Mục menu đầu tiên tài khoản mở được, theo thứ tự menu; null khi vai trò nhân viên chưa có quyền Xem nào. */
export function firstAccessibleItem(canAccess: (access: PageAccess) => boolean): AdminNavigationItem | null {
  return visibleNavSections(canAccess)[0]?.items[0] ?? null;
}

/** Đường dẫn của mục menu đầu tiên mở được (trang mặc định sau đăng nhập). */
export function firstAccessiblePath(canAccess: (access: PageAccess) => boolean): string | null {
  return firstAccessibleItem(canAccess)?.to ?? null;
}

export interface AdminBreadcrumb {
  section: string;
  /** Mục menu chứa trang; có khi đang ở trang chi tiết để bấm quay về danh sách. */
  parent: { label: string; to: string } | null;
  /** Cấp giữa của trang chi tiết lồng hai cấp (chi tiết giao dịch nằm trong một sổ lệnh). */
  middle?: { label: string; to: string };
  current: string;
}

const DETAIL_TITLES: Array<[RegExp, string]> = [
  [/^\/loans\/[^/]+\/review$/, 'Chi tiết hồ sơ vay'],
  [/^\/customers\/kyc\/review\/[^/]+$/, 'Xác minh danh tính'],
  [/^\/investments\/funding\/[^/]+$/, 'Chi tiết khoản gọi vốn'],
  [/^\/investments\/secondary\/[^/]+$/, 'Sổ lệnh'],
  [/^\/investments\/secondary\/[^/]+\/trades\/[^/]+$/, 'Chi tiết giao dịch'],
];

/** Trang chi tiết lồng hai cấp: cấp giữa suy từ đường dẫn (mã sổ lệnh của giao dịch). */
function middleCrumb(pathname: string): AdminBreadcrumb['middle'] {
  const trade = /^\/investments\/secondary\/([^/]+)\/trades\/[^/]+$/.exec(pathname);
  return trade ? { label: 'Sổ lệnh', to: `/investments/secondary/${trade[1]}` } : undefined;
}

/** Breadcrumb ở header: nhóm menu / trang (trang chi tiết thêm một cấp về danh sách). */
export function getAdminBreadcrumb(pathname: string): AdminBreadcrumb {
  for (const section of ADMIN_NAV_SECTIONS) {
    const item = section.items.find((entry) => entry.matches(pathname));
    if (!item) continue;
    const detail = DETAIL_TITLES.find(([pattern]) => pattern.test(pathname));
    return detail
      ? { section: section.label, parent: { label: item.label, to: item.to }, middle: middleCrumb(pathname), current: detail[1] }
      : { section: section.label, parent: null, current: item.label };
  }
  return { section: '', parent: null, current: 'Quản trị' };
}
