import type { PillTone } from '@/components/StatusPill';
import type {
  CollectionActionType, CollectionStage, FinoraLoanStatus, ReconciliationIncidentType, RescheduleType,
} from './types';

/** Bảng danh sách quản trị: 10 dòng mỗi trang. */
export const SERVICING_PAGE_SIZE = 10;

/** Lịch sử xử lý trong ngăn hồ sơ: số lần ghi nhận gần nhất tải một lần. */
export const ACTION_HISTORY_SIZE = 20;

export type ServicingTab = 'collection' | 'reschedule' | 'reconciliation' | 'quarantine';

export const SERVICING_TABS: ReadonlyArray<{ key: ServicingTab; label: string }> = [
  { key: 'collection', label: 'Quá hạn & thu hồi' },
  { key: 'reschedule', label: 'Yêu cầu cơ cấu' },
  { key: 'reconciliation', label: 'Đối soát' },
  { key: 'quarantine', label: 'Sự kiện trả nợ chờ ghép' },
];

export const isServicingTab = (value: string | null): value is ServicingTab =>
  SERVICING_TABS.some((tab) => tab.key === value);

/**
 * Mức độ thu hồi và khoảng số ngày quá hạn, đúng ranh giới `CollectionStage.fromDaysPastDue` của
 * Loan Service (nhóm nợ cũng theo cùng ranh giới). Web không tự xếp mức, chỉ hiển thị nhãn.
 */
export const COLLECTION_STAGES: ReadonlyArray<{
  stage: CollectionStage; label: string; range: string; debtGroup: number; tone: PillTone;
}> = [
  { stage: 'EARLY_REMINDER', label: 'Nhắc sớm', range: '1 đến 9 ngày', debtGroup: 1, tone: 'neutral' },
  { stage: 'ATTENTION', label: 'Cần chú ý', range: '10 đến 90 ngày', debtGroup: 2, tone: 'warning' },
  { stage: 'NPL', label: 'Nợ xấu', range: '91 đến 180 ngày', debtGroup: 3, tone: 'danger' },
  { stage: 'INTENSIVE', label: 'Thu hồi tăng cường', range: '181 đến 360 ngày', debtGroup: 4, tone: 'danger' },
  { stage: 'LOSS', label: 'Có nguy cơ mất vốn', range: 'Trên 360 ngày', debtGroup: 5, tone: 'danger' },
];

export const stageInfo = (stage: CollectionStage) =>
  COLLECTION_STAGES.find((item) => item.stage === stage)
  ?? { stage, label: stage, range: '', debtGroup: 0, tone: 'neutral' as PillTone };

export const ACTION_LABEL: Record<CollectionActionType, string> = {
  REMINDER_SENT: 'Gửi tin nhắc nợ',
  BORROWER_CONTACTED: 'Đã liên hệ người vay',
  PROMISE_TO_PAY: 'Người vay hẹn trả',
  LEGAL_REVIEW: 'Chuyển pháp lý xem xét',
  FIELD_COLLECTION: 'Thu hồi tại địa chỉ',
  WRITE_OFF_RECOMMENDED: 'Đề xuất xóa nợ',
  NOTE: 'Ghi chú nội bộ',
};

/** Ba loại ghi nhận quản trị viên nhập tay từ trang này (theo mockup); các loại khác do quy trình khác tạo. */
export const MANUAL_ACTION_TYPES: ReadonlyArray<{ type: CollectionActionType; label: string; submit: string }> = [
  { type: 'BORROWER_CONTACTED', label: 'Đã liên hệ', submit: 'Ghi nhận đã liên hệ' },
  { type: 'PROMISE_TO_PAY', label: 'Hẹn trả', submit: 'Ghi nhận lời hẹn trả' },
  { type: 'NOTE', label: 'Ghi chú', submit: 'Lưu ghi chú' },
];

/** Hành động do người thật thực hiện, chấm đậm trên dòng thời gian. */
export const HUMAN_ACTIONS: ReadonlySet<CollectionActionType> = new Set(['BORROWER_CONTACTED', 'PROMISE_TO_PAY']);

export const RESCHEDULE_TYPE_LABEL: Record<RescheduleType, string> = {
  TERM_EXTENSION: 'Gia hạn thêm kỳ',
  INSTALLMENT_ADJUSTMENT: 'Dời ngày trả một kỳ',
};

/** Gợi ý lý do từ chối điền nhanh; quản trị viên vẫn sửa được. */
export const REJECT_REASON_SUGGESTIONS = [
  'Không đáp ứng chính sách cơ cấu hiện hành',
  'Thiếu giấy tờ chứng minh thu nhập giảm',
];

export const LOAN_STATUS_LABEL: Record<FinoraLoanStatus, string> = {
  ACTIVE: 'Đang trả nợ',
  RESTRUCTURING: 'Đang cơ cấu',
  SETTLED: 'Đã tất toán',
  DEFAULTED: 'Nợ xấu',
  WRITTEN_OFF: 'Đã xóa nợ',
};

export const INCIDENT_LABEL: Record<ReconciliationIncidentType, string> = {
  CORE_LOAN_ID_MISMATCH: 'Lệch mã khoản vay ở hệ thống lõi',
  EXTERNAL_ID_MISMATCH: 'Lệch mã tham chiếu',
  PRINCIPAL_DISBURSED_MISMATCH: 'Lệch số tiền giải ngân',
  OUTSTANDING_BREAKDOWN_MISMATCH: 'Lệch cơ cấu dư nợ',
};

/** Lý do cách ly sự kiện trả nợ; mã lạ giữ nguyên để tra nhật ký. */
const QUARANTINE_REASON_LABEL: Record<string, string> = {
  FINORA_LOAN_MAPPING_MISSING: 'Chưa liên kết được với khoản vay',
};

export const quarantineReasonLabel = (code: string) => QUARANTINE_REASON_LABEL[code] ?? code;
