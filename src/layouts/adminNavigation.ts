export type SidebarIconName =
  | 'home' | 'chart' | 'file' | 'loan' | 'check' | 'clock' | 'workflow'
  | 'grid' | 'identity' | 'users' | 'shield' | 'alert' | 'scan' | 'chain' | 'download';

export interface AdminNavigationItem {
  to: string;
  label: string;
  icon: SidebarIconName;
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
      { to: '/dashboard', label: 'Tổng quan', icon: 'home', matches: (pathname) => pathname === '/dashboard' },
    ],
  },
  {
    label: 'Tín dụng',
    items: [
      {
        to: '/loans',
        label: 'Quản lý khoản vay',
        icon: 'loan',
        matches: (pathname) => pathname === '/loans' || isLoanReview(pathname),
      },
      {
        to: '/loans/operations',
        label: 'Vận hành khoản vay',
        icon: 'workflow',
        matches: (pathname) => ['/loans/operations', '/loans/overdue', '/reconciliation'].includes(pathname),
      },
    ],
  },
  {
    label: 'Đầu tư',
    items: [
      { to: '/investments/funding', label: 'Gọi vốn & Notes', icon: 'chart', matches: (pathname) => pathname.startsWith('/investments/funding') },
      { to: '/investments/secondary', label: 'Chợ thứ cấp Notes', icon: 'file', matches: (pathname) => pathname === '/investments/secondary' },
    ],
  },
  {
    label: 'Sản phẩm',
    items: [
      { to: '/products', label: 'Sản phẩm vay', icon: 'grid', matches: (pathname) => pathname === '/products' },
    ],
  },
  {
    label: 'Người dùng',
    items: [
      { to: '/customers/kyc', label: 'Khách hàng eKYC', icon: 'identity', matches: (pathname) => pathname.startsWith('/customers/kyc') },
      { to: '/users', label: 'Người dùng & phân quyền', icon: 'users', matches: (pathname) => pathname === '/users' },
    ],
  },
  {
    label: 'Cấu hình',
    items: [
      { to: '/loans/evaluation', label: 'Chính sách đánh giá AI', icon: 'shield', matches: (pathname) => pathname === '/loans/evaluation' },
      { to: '/loans/scoring', label: 'Chấm điểm & giải thích AI', icon: 'scan', matches: (pathname) => pathname === '/loans/scoring' },
    ],
  },
];

export interface AdminBreadcrumb {
  section: string;
  /** Mục menu chứa trang; có khi đang ở trang chi tiết để bấm quay về danh sách. */
  parent: { label: string; to: string } | null;
  current: string;
}

const DETAIL_TITLES: Array<[RegExp, string]> = [
  [/^\/loans\/[^/]+\/review$/, 'Chi tiết hồ sơ vay'],
  [/^\/customers\/kyc\/[^/]+$/, 'Chi tiết khách hàng'],
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
