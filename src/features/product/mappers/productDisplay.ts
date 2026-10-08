import type { PillTone } from '@/components/StatusPill';
import { EMPTY } from '@/utils';
import type { CoreSyncStatus, LoanProduct, LoanProductStatus, RepaymentMethod } from '../types';

export const STATUS_LABELS: Record<LoanProductStatus, string> = {
  DRAFT: 'Bản nháp',
  ACTIVE: 'Hoạt động',
  INACTIVE: 'Tạm dừng',
  ARCHIVED: 'Lưu trữ',
};

export const SYNC_LABELS: Record<CoreSyncStatus, string> = {
  NOT_SYNCED: 'Chưa đồng bộ',
  PENDING: 'Đang đồng bộ',
  PROCESSING: 'Đang đồng bộ',
  RETRY_PENDING: 'Chờ thử lại',
  SYNCED: 'Đã đồng bộ',
  FAILED: 'Lỗi đồng bộ',
};

export const REPAYMENT_LABELS: Record<RepaymentMethod, { label: string; hint: string }> = {
  ANNUITY: { label: 'Khoản trả đều', hint: 'Mỗi kỳ trả cùng một số tiền' },
  EQUAL_PRINCIPAL: { label: 'Gốc trả đều', hint: 'Gốc chia đều, tiền lãi giảm dần' },
};

/** Đang mở bán là trạng thái tốt, tạm dừng cần chú ý; nháp và lưu trữ để trung tính. */
export function statusTone(status: LoanProductStatus): PillTone {
  if (status === 'ACTIVE') return 'success';
  if (status === 'INACTIVE') return 'warning';
  return 'neutral';
}

/** Lệnh đồng bộ hệ thống đang tự chạy để xám; chỉ kết quả cuối (xong, lỗi) mới mang màu. */
export function syncTone(status: CoreSyncStatus): 'ok' | 'err' | '' {
  if (status === 'SYNCED') return 'ok';
  if (status === 'FAILED') return 'err';
  return '';
}

export const statusLabel = (status: string) => STATUS_LABELS[status as LoanProductStatus] ?? status;
export const syncLabel = (status: string) => SYNC_LABELS[status as CoreSyncStatus] ?? status;
export const repaymentLabel = (method: string) => REPAYMENT_LABELS[method as RepaymentMethod]?.label ?? method;

const MILLION = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
const RATE = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 4 });
const MONEY = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

/** Hạn mức gọn cho bảng theo đơn vị triệu, ví dụ "5 - 100 tr". */
export function formatMillionRange(min: number, max: number): string {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return EMPTY;
  return `${MILLION.format(min / 1e6)} - ${MILLION.format(max / 1e6)} tr`;
}

/** Lãi suất backend trả đã ở dạng phần trăm (12.5 nghĩa là 12,5%/năm). */
export function formatRate(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return EMPTY;
  return `${RATE.format(Number(value))}%`;
}

export function formatMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return EMPTY;
  return `${MONEY.format(value)} đ`;
}

const DAY = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const TIME = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });

/** Ngày dạng 24/09/2026 theo giờ máy người xem. */
export function formatDay(value: string | null | undefined): string {
  if (!value) return EMPTY;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? EMPTY : DAY.format(date);
}

/** Ngày giờ dạng 24/09/2026 08:30. */
export function formatDayTime(value: string | null | undefined): string {
  if (!value) return EMPTY;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? EMPTY : `${DAY.format(date)} ${TIME.format(date)}`;
}

export interface AvailableActions {
  /** Nhãn nút đồng bộ, `null` khi không được đồng bộ ở trạng thái hiện tại. */
  syncLabel: string | null;
  /** Đồng bộ đang chạy ở hệ thống: không gửi thêm lệnh. */
  syncInProgress: boolean;
  canActivate: boolean;
  /** Lý do chưa kích hoạt được (hiện ở `title` của mục bị khóa). */
  activateBlockedReason: string | null;
  canDeactivate: boolean;
  canArchive: boolean;
}

const SYNC_RUNNING: CoreSyncStatus[] = ['PENDING', 'PROCESSING', 'RETRY_PENDING'];

/**
 * Thao tác được phép theo chuyển trạng thái của `LoanProduct` ở finora-loan:
 * - đồng bộ chỉ cho bản nháp chưa đồng bộ hoặc lỗi đồng bộ (`markCoreSyncPending` chỉ nhận DRAFT);
 * - kích hoạt từ DRAFT/INACTIVE và phải đồng bộ xong;
 * - tạm dừng chỉ từ ACTIVE; lưu trữ từ DRAFT/INACTIVE (đang mở bán phải tạm dừng trước).
 * Backend vẫn kiểm tra lại; ở đây chỉ để không bày nút chắc chắn bị từ chối.
 */
export function availableActions(product: LoanProduct): AvailableActions {
  const { status, coreSyncStatus } = product;
  const editable = status === 'DRAFT' || status === 'INACTIVE';
  const syncInProgress = SYNC_RUNNING.includes(coreSyncStatus);
  const canSync = status === 'DRAFT' && (coreSyncStatus === 'NOT_SYNCED' || coreSyncStatus === 'FAILED');
  return {
    syncLabel: canSync ? (coreSyncStatus === 'FAILED' ? 'Đồng bộ lại' : 'Đồng bộ sang Fineract') : null,
    syncInProgress,
    canActivate: editable && coreSyncStatus === 'SYNCED',
    activateBlockedReason: editable && coreSyncStatus !== 'SYNCED' ? 'Cần đồng bộ sang Fineract thành công trước khi kích hoạt' : null,
    canDeactivate: status === 'ACTIVE',
    canArchive: editable,
  };
}
