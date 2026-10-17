import { LOAN_LIST_STATUS_TABS } from '../constants';
import type { AdminScreen, AssistantContext } from '../types';

/**
 * Cùng regex `MA_NGHIEP_VU` của finora-ai (Task 5). Giá trị khác (khoảng trắng, "/", "?") bị server trả
 * 422 cho cả lượt hỏi, nên bỏ ngay ở đây và chỉ gửi những mã chắc chắn hợp lệ.
 */
const BUSINESS_CODE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const REVIEW_PATH = /^\/loans\/([^/]+)\/review$/;
/** Ba route cùng mở trang Vận hành khoản vay (xem `App.tsx`). */
const OPERATIONS_PATHS = new Set(['/loans/operations', '/loans/overdue', '/reconciliation']);

const SCREEN_LABELS: Record<AdminScreen, string> = {
  Dashboard: 'Tổng quan',
  LoanList: 'Danh sách hồ sơ vay',
  LoanReview: 'Hồ sơ',
  Operations: 'Vận hành khoản vay',
};

function withoutTrailingSlash(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

function decodeSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    // Đường dẫn gõ tay có "%" lẻ: coi như không có mã hồ sơ, không gửi ngữ cảnh sai.
    return null;
  }
}

function validCode(value: string | null): value is string {
  return value !== null && BUSINESS_CODE.test(value);
}

/**
 * Suy ra màn đang mở để gửi kèm câu hỏi (`context` của `POST /chat`). Tên màn và khóa tham số khớp
 * finora-ai (Task 11): `Dashboard`, `LoanList{status?}`, `LoanReview{applicationNumber}`, `Operations`.
 * Server dùng tên màn để chọn gợi ý; `ADMIN_SCREEN_TOOLS` chỉ có ba màn sau (Dashboard là trang chung,
 * câu hỏi ở đó đi đường câu tự do — Task 21). Trang khác trả `null` để server trả lời như câu chung.
 */
export function screenContextFromLocation(pathname: string, search: string): AssistantContext | null {
  const path = withoutTrailingSlash(pathname);

  const review = REVIEW_PATH.exec(path);
  if (review) {
    const applicationNumber = decodeSegment(review[1]);
    return validCode(applicationNumber) ? { screen: 'LoanReview', params: { applicationNumber } } : null;
  }
  if (path === '/dashboard') return { screen: 'Dashboard', params: {} };
  if (path === '/loans') {
    // Tab "Tất cả" không có `?status=`; khi đó server tự lấy hàng chờ thẩm định (mặc định của Task 11).
    const status = new URLSearchParams(search).get('status');
    return { screen: 'LoanList', params: status && LOAN_LIST_STATUS_TABS.includes(status) ? { status } : {} };
  }
  if (OPERATIONS_PATHS.has(path)) return { screen: 'Operations', params: {} };
  return null;
}

function isAdminScreen(screen: string): screen is AdminScreen {
  return Object.prototype.hasOwnProperty.call(SCREEN_LABELS, screen);
}

/** Nhãn ngắn ở đầu ngăn chat ("Đang xem: Hồ sơ LA-…"), để người hỏi biết trợ lý đang dựa vào trang nào. */
export function describeScreenContext(context: AssistantContext | null): string | null {
  const screen = context?.screen;
  if (!screen || !isAdminScreen(screen)) return null;
  if (screen === 'LoanReview') {
    const applicationNumber = context?.params?.applicationNumber;
    return applicationNumber ? `${SCREEN_LABELS.LoanReview} ${applicationNumber}` : SCREEN_LABELS.LoanReview;
  }
  return SCREEN_LABELS[screen];
}
