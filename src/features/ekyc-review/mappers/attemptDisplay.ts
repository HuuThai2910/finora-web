import type { PillTone } from '@/components/StatusPill';
import { EMPTY, formatDateTime } from '@/utils';
import type { EkycAttemptStatus, EkycCardType } from '../types';

export interface PillDisplay {
  label: string;
  tone: PillTone;
}

const STATUS_DISPLAY: Record<EkycAttemptStatus, PillDisplay> = {
  MANUAL_REVIEW: { label: 'Chờ duyệt tay', tone: 'warning' },
  APPROVED: { label: 'Đã duyệt', tone: 'success' },
  REJECTED: { label: 'Đã từ chối', tone: 'danger' },
  VERIFIED: { label: 'Xác minh tự động', tone: 'success' },
  IN_PROGRESS: { label: 'Đang thực hiện', tone: 'info' },
  ABANDONED: { label: 'Bỏ dở', tone: 'neutral' },
};

/** Trạng thái lượt; mã lạ hiện nguyên văn, màu trung tính, để UI không vỡ khi backend thêm trạng thái. */
export function attemptStatusDisplay(status: string): PillDisplay {
  return STATUS_DISPLAY[status as EkycAttemptStatus] ?? { label: status, tone: 'neutral' };
}

const CARD_TYPE_LABELS: Record<EkycCardType, string> = {
  CCCD_CHIP_2021: 'CCCD gắn chip (mẫu 2021)',
  CAN_CUOC_2024: 'Thẻ Căn cước (mẫu 2024)',
  CCCD_CHIP_UNKNOWN: 'CCCD gắn chip (chưa rõ mẫu)',
  CCCD_BARCODE: 'CCCD mã vạch',
  CMND: 'Chứng minh nhân dân',
  UNKNOWN: 'Chưa nhận diện được',
};

export function cardTypeLabel(cardType: string | null): string {
  if (!cardType) return EMPTY;
  return CARD_TYPE_LABELS[cardType as EkycCardType] ?? cardType;
}

const SCORE = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Điểm so khớp khuôn mặt (độ tương đồng cosine của AI), hiện hai chữ số thập phân, ví dụ 0,52. */
export function formatFaceScore(score: number | null): string {
  return score == null || !Number.isFinite(score) ? EMPTY : SCORE.format(score);
}

/** Thời điểm (`Instant`) theo giờ Việt Nam như mọi màn quản trị, ví dụ 09:30 16/10/2026. */
export function formatDayTime(value: string | null | undefined): string {
  return formatDateTime(value);
}
