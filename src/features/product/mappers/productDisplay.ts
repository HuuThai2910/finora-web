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

/** Hạn mức gọn cho bảng theo đơn vị triệu, ví dụ "5 - 100 tr"; hai đầu bằng nhau thì một số ("1 tr"). */
export function formatMillionRange(min: number, max: number): string {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return EMPTY;
  const low = MILLION.format(min / 1e6);
  const high = MILLION.format(max / 1e6);
  return low === high ? `${high} tr` : `${low} - ${high} tr`;
}

/** Kỳ hạn "3 - 12 tháng"; kỳ hạn cố định thì "12 tháng". `joiner` là chữ nối (bảng dùng " - ", ngăn chi tiết " đến "). */
export function formatTermRange(min: number, max: number, joiner = ' - '): string {
  return min === max ? `${max} tháng` : `${min}${joiner}${max} tháng`;
}

/** Khung lãi suất dưới lãi cơ sở trong bảng: "khung 6 - 14%"; khung một giá trị thì "khung 9%". */
export function formatRateFrame(min: number, max: number): string {
  if (Number(min) === Number(max)) return `khung ${formatRate(max)}`;
  return `khung ${formatRate(min).replace('%', '')} - ${formatRate(max)}`;
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
  /** Sửa cấu hình: chỉ bản nháp không đang đồng bộ (`LoanProduct.updateConfiguration`). */
  canEdit: boolean;
}

const SYNC_RUNNING: CoreSyncStatus[] = ['PENDING', 'PROCESSING', 'RETRY_PENDING'];

/**
 * Thao tác được phép theo chuyển trạng thái của `LoanProduct` ở finora-loan:
 * - đồng bộ chỉ cho bản nháp chưa đồng bộ hoặc lỗi đồng bộ (`markCoreSyncPending` chỉ nhận DRAFT);
 * - kích hoạt từ DRAFT/INACTIVE và phải đồng bộ xong;
 * - tạm dừng chỉ từ ACTIVE; lưu trữ từ DRAFT/INACTIVE (đang mở bán phải tạm dừng trước);
 * - sửa cấu hình chỉ bản nháp và không trong lúc lệnh đồng bộ đang chạy.
 * Backend vẫn kiểm tra lại; ở đây chỉ để không bày nút chắc chắn bị từ chối.
 */
export function availableActions(product: LoanProduct): AvailableActions {
  const { status, coreSyncStatus } = product;
  const editable = status === 'DRAFT' || status === 'INACTIVE';
  const syncInProgress = SYNC_RUNNING.includes(coreSyncStatus);
  const canSync = status === 'DRAFT' && (coreSyncStatus === 'NOT_SYNCED' || coreSyncStatus === 'FAILED');
  return {
    syncLabel: canSync ? (coreSyncStatus === 'FAILED' ? 'Đồng bộ lại' : 'Đồng bộ sang hệ thống lõi') : null,
    syncInProgress,
    canActivate: editable && coreSyncStatus === 'SYNCED',
    activateBlockedReason: editable && coreSyncStatus !== 'SYNCED' ? 'Cần đồng bộ sang hệ thống lõi thành công trước khi kích hoạt' : null,
    canDeactivate: status === 'ACTIVE',
    canArchive: editable,
    canEdit: status === 'DRAFT' && !syncInProgress,
  };
}
