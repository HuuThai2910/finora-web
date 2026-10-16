import type { PillTone } from '@/components/StatusPill';
import { EMPTY } from '@/utils';
import type { EkycAttemptStatus, EkycCardType, EkycDocumentDecision, EkycLivenessResult } from '../types';

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

const DOCUMENT_DECISION_DISPLAY: Record<EkycDocumentDecision, PillDisplay> = {
  AUTO_OK: { label: 'Đạt tự động', tone: 'success' },
  NEEDS_REVIEW: { label: 'Cần duyệt tay', tone: 'warning' },
};

export function documentDecisionDisplay(decision: string): PillDisplay {
  return DOCUMENT_DECISION_DISPLAY[decision as EkycDocumentDecision] ?? { label: decision, tone: 'neutral' };
}

const LIVENESS_DISPLAY: Record<EkycLivenessResult, PillDisplay> = {
  PASS: { label: 'Đạt', tone: 'success' },
  REVIEW: { label: 'Cần xem thêm', tone: 'warning' },
  FAIL: { label: 'Không đạt', tone: 'danger' },
};

/** `null` nghĩa là lượt chưa tới bước quay video. */
export function livenessDisplay(result: string | null): PillDisplay {
  if (!result) return { label: 'Chưa kiểm tra', tone: 'neutral' };
  return LIVENESS_DISPLAY[result as EkycLivenessResult] ?? { label: result, tone: 'neutral' };
}

const SCORE = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Điểm so khớp khuôn mặt (độ tương đồng cosine của AI), hiện hai chữ số thập phân, ví dụ 0,52. */
export function formatFaceScore(score: number | null): string {
  return score == null || !Number.isFinite(score) ? EMPTY : SCORE.format(score);
}

const DAY = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const TIME = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });

/** Thời điểm (`Instant`) theo giờ máy người xem, ví dụ 16/10/2026 09:30. */
export function formatDayTime(value: string | null | undefined): string {
  if (!value) return EMPTY;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? EMPTY : `${DAY.format(date)} ${TIME.format(date)}`;
}

/** Mã lượt (UUID) rút gọn để hiện trong dòng; mã đầy đủ đặt ở `title` và chỗ cần sao chép. */
export function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}
