import type { PillTone } from '@/components/StatusPill';
import { EKYC_DISPLAY, ROLE_LABELS, type EkycStatusType, type RoleType } from '@/features/user';
import { EMPTY } from '@/utils';

/** Nhãn và màu trạng thái eKYC dùng chung với trang Người dùng; trạng thái lạ hiện nguyên mã, màu trung tính. */
export function ekycDisplay(status: string): { label: string; tone: PillTone } {
  return EKYC_DISPLAY[status as EkycStatusType] ?? { label: status, tone: 'neutral' };
}

export const roleLabel = (role: string) => ROLE_LABELS[role as RoleType] ?? role;

/** Giới tính backend trả dạng mã; giá trị lạ hoặc trống hiển thị "-". */
export function genderLabel(gender: string | null): string {
  if (gender === 'MALE') return 'Nam';
  if (gender === 'FEMALE') return 'Nữ';
  return EMPTY;
}

/**
 * Ngày sinh là `LocalDate` ("1995-03-12"), không có giờ: tách chuỗi trực tiếp thay vì qua `Date`
 * để không lệch ngày theo múi giờ. Chuỗi khác dạng thì hiện nguyên văn.
 */
export function formatBirthDate(value: string | null): string {
  if (!value) return EMPTY;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

const DAY = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const TIME = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });

/** Thời điểm (`Instant`) chỉ lấy ngày theo giờ máy người xem, ví dụ 24/09/2026. */
export function formatDay(value: string | null | undefined): string {
  if (!value) return EMPTY;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? EMPTY : DAY.format(date);
}

/** Thời điểm đủ ngày giờ, ví dụ 24/09/2026 08:30. */
export function formatDayTime(value: string | null | undefined): string {
  if (!value) return EMPTY;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? EMPTY : `${DAY.format(date)} ${TIME.format(date)}`;
}

/**
 * Trạng thái khóa đọc từ hệ thống đăng nhập; `null` nghĩa là backend không tra cứu được,
 * hiển thị đúng như vậy thay vì đoán "đang hoạt động".
 */
export function accountState(locked: boolean | null): { label: string; tone: PillTone } {
  if (locked === true) return { label: 'Đã khóa', tone: 'danger' };
  if (locked === false) return { label: 'Đang hoạt động', tone: 'success' };
  return { label: 'Chưa tra cứu được', tone: 'neutral' };
}
