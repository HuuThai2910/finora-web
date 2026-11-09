import type { PillTone } from '@/components/StatusPill';
import type {
  CollectionActionType, CollectionCaseStatus, CollectionStage, FinoraLoanStatus, ReconciliationIncidentType,
  RepaymentType, RescheduleStatus, RescheduleType, WalletOwnerType,
} from './types';

/** Bảng danh sách quản trị: 10 dòng mỗi trang. */
export const SERVICING_PAGE_SIZE = 10;

/** Lịch sử xử lý của hồ sơ thu hồi: số lần ghi nhận gần nhất tải một lần. */
export const ACTION_HISTORY_SIZE = 20;

/**
 * Việc của một khoản vay trên trang hồ sơ thường chỉ vài dòng (một khoản vay có ít đợt thu hồi, ít yêu cầu cơ cấu), nên
 * mỗi khối tải một lần tối đa chừng này dòng thay cho phân trang.
 */
export const LOAN_SCOPED_SIZE = 20;

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

/**
 * Các loại ghi nhận quản trị viên nhập tay từ trang này; "Gửi tin nhắc nợ" do worker tạo. Ba loại leo thang (`escalation`)
 * Loan Service nhận như mọi ghi nhận khác (`LoanCollectionAction.record`): chỉ lưu vết, KHÔNG đổi trạng thái hồ sơ hay
 * khoản vay, nên giao diện nói rõ điều đó và bắt buộc ghi nội dung để người sau biết vì sao leo thang. `label` là nhãn
 * ngắn trên nút chọn (ba nút một hàng trong ngăn 440px); tên đầy đủ ở `ACTION_LABEL` và nút gửi.
 */
export const MANUAL_ACTION_TYPES: ReadonlyArray<{
  type: CollectionActionType; label: string; submit: string; escalation: boolean;
}> = [
  { type: 'BORROWER_CONTACTED', label: 'Đã liên hệ', submit: 'Ghi nhận đã liên hệ', escalation: false },
  { type: 'PROMISE_TO_PAY', label: 'Hẹn trả', submit: 'Ghi nhận lời hẹn trả', escalation: false },
  { type: 'NOTE', label: 'Ghi chú', submit: 'Lưu ghi chú', escalation: false },
  { type: 'LEGAL_REVIEW', label: 'Chuyển pháp lý', submit: 'Ghi nhận chuyển pháp lý', escalation: true },
  { type: 'FIELD_COLLECTION', label: 'Thu hồi tận nơi', submit: 'Ghi nhận thu hồi tại địa chỉ', escalation: true },
  { type: 'WRITE_OFF_RECOMMENDED', label: 'Đề xuất xóa nợ', submit: 'Ghi nhận đề xuất xóa nợ', escalation: true },
];

/** Hành động do người thật thực hiện, chấm đậm trên dòng thời gian. */
export const HUMAN_ACTIONS: ReadonlySet<CollectionActionType> = new Set([
  'BORROWER_CONTACTED', 'PROMISE_TO_PAY', 'LEGAL_REVIEW', 'FIELD_COLLECTION', 'WRITE_OFF_RECOMMENDED',
]);

/** Kết quả của một đợt thu hồi đã đóng. */
export const COLLECTION_CASE_STATUS_LABEL: Record<CollectionCaseStatus, string> = {
  OPEN: 'Đang thu hồi',
  CURED: 'Đã trả hết phần quá hạn',
  SETTLED: 'Đã tất toán',
  WRITTEN_OFF: 'Đã xóa nợ',
};

/** Nhãn và màu trạng thái yêu cầu cơ cấu; các bước đang ghi hệ thống lõi gộp một nhãn. */
export const RESCHEDULE_STATUS: Record<RescheduleStatus, { label: string; tone: PillTone }> = {
  PENDING_REVIEW: { label: 'Chờ thẩm định', tone: 'warning' },
  PENDING_INVESTOR_CONSENT: { label: 'Chờ nhà đầu tư đồng ý', tone: 'info' },
  INVESTOR_REJECTED: { label: 'Nhà đầu tư không đồng ý', tone: 'neutral' },
  REJECTED: { label: 'Đã từ chối', tone: 'neutral' },
  CREATE_PENDING: { label: 'Đang áp dụng lịch mới', tone: 'info' },
  CREATING: { label: 'Đang áp dụng lịch mới', tone: 'info' },
  APPROVAL_PENDING: { label: 'Đang áp dụng lịch mới', tone: 'info' },
  APPROVING: { label: 'Đang áp dụng lịch mới', tone: 'info' },
  COMPLETED: { label: 'Đã áp dụng lịch mới', tone: 'success' },
  RECONCILIATION_REQUIRED: { label: 'Cần đối soát', tone: 'warning' },
  MANUAL_REVIEW: { label: 'Cần xử lý lỗi', tone: 'danger' },
  CANCELLED: { label: 'Đã đóng, giữ lịch cũ', tone: 'neutral' },
};

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

export const REPAYMENT_TYPE_LABEL: Record<RepaymentType, string> = {
  SCHEDULED: 'Trả kỳ',
  OVERDUE_CURE: 'Trả nợ quá hạn',
  PARTIAL_PREPAYMENT: 'Trả trước một phần',
  EARLY_SETTLEMENT: 'Tất toán sớm',
};

/** Vai trò chủ ví của lệnh rút; mã lạ (backend thêm loại ví) giữ nguyên để tra nhật ký. */
export const WALLET_OWNER_LABEL: Record<WalletOwnerType, string> = {
  BORROWER: 'Người vay',
  INVESTOR: 'Nhà đầu tư',
  PLATFORM: 'Ví nền tảng',
};
