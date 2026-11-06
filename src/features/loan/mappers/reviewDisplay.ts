import { GIA_TRI_LABEL, NHAN_MA_LOAI_TRUC_TIEP } from '@/features/rule-engine';
import { findBusinessLabel, formatMoney, formatPercent } from '../formatters';
import type { AdminLoanReviewDetail, RuleTraceItem, YeuToGop } from '../types';

/** Tab của trang chi tiết hồ sơ; giá trị nằm trên URL (`?tab=`) để chia sẻ đúng màn đang xem. */
export type ReviewTabId = 'review' | 'model' | 'history';

export const REVIEW_TABS: Array<{ id: ReviewTabId; label: string }> = [
  { id: 'review', label: 'Thẩm định' },
  { id: 'model', label: 'Chi tiết chấm điểm' },
  { id: 'history', label: 'Lịch sử xử lý' },
];

export function isReviewTab(value: string | null): value is ReviewTabId {
  return value === 'review' || value === 'model' || value === 'history';
}

/** Mã lý do từ chối khớp enum `AdminDecisionReasonCode` của Loan Service (trừ POLICY_APPROVED dành cho duyệt). */
export const REJECT_REASONS: Array<{ code: string; label: string }> = [
  { code: 'INSUFFICIENT_REPAYMENT_CAPACITY', label: 'Khả năng trả nợ chưa đạt' },
  { code: 'IDENTITY_OR_KYC_NOT_ELIGIBLE', label: 'Xác minh danh tính không đủ điều kiện' },
  { code: 'INCONSISTENT_DECLARED_INFORMATION', label: 'Thông tin khai báo không nhất quán' },
  { code: 'POLICY_NOT_SATISFIED', label: 'Không đạt chính sách' },
  { code: 'OTHER_MANUAL_REVIEW', label: 'Lý do thẩm định khác' },
];

/** Độ dài tối đa của phần giải thích khi từ chối (`@Size(max = 1000)` ở backend). */
export const REJECT_DETAIL_MAX = 1000;

/** Độ dài tối đa của ghi chú khi duyệt (`decisionReasonDetail`, `@Size(max = 1000)` ở backend). */
export const APPROVE_NOTE_MAX = 1000;

/**
 * Mã lý do của bước kiểm tra điều kiện vay (`BorrowerEligibilityPolicyImpl`, `BorrowerEligibilityServiceImpl`).
 * Mã INELIGIBLE còn được ghi làm lý do khi hệ thống tự từ chối hồ sơ ở bước này.
 */
const ELIGIBILITY_REASONS: Record<string, string> = {
  BORROWER_AGE_MISSING: 'Chưa có tuổi của người vay',
  KYC_NOT_COMPLETED: 'Người vay chưa xác minh danh tính xong',
  KYC_NOT_VALID: 'Xác minh danh tính bị từ chối hoặc đã hết hạn',
  KYC_STATUS_UNSUPPORTED: 'Trạng thái xác minh danh tính không xác định được',
  BORROWER_AGE_OUT_OF_POLICY: 'Tuổi người vay ngoài độ tuổi được vay',
  KYC_SNAPSHOT_MISSING: 'Thiếu dữ liệu xác minh danh tính lưu lúc nộp hồ sơ',
};

/** Mã lý do hệ thống ghi khi chính sách chấm điểm tự quyết (`CreditScoringStateServiceImpl.complete`). */
const AI_POLICY_REASONS: Record<string, string> = {
  AI_POLICY_AUTO_REJECTED: 'Không đạt chính sách chấm điểm tự động',
  AI_POLICY_AUTO_APPROVED: 'Đạt chính sách chấm điểm tự động',
  AI_POLICY_REQUIRES_REVIEW: 'Chính sách chấm điểm yêu cầu thẩm định',
};

/** Mã lý do AI chuyển hồ sơ cho người thẩm định (`review_reasons` của finora-ai, Loan lưu cùng lần chấm). */
const AI_REVIEW_REASONS: Record<string, string> = {
  SCORE_IN_REVIEW_BAND: 'Điểm nằm giữa ngưỡng tự từ chối và ngưỡng tự duyệt',
  INSUFFICIENT_RULE_DATA: 'Tra được quá ít dữ liệu để máy tự quyết',
  CIC_CURRENT_GROUP_MISSING: 'CIC có lịch sử tín dụng nhưng chưa trả nhóm nợ hiện tại',
  CIC_BAD_DEBT_RECOVERY_REVIEW: 'Người vay từng nợ xấu, đang trong thời gian phục hồi cần người xem',
};

/** Mã lý do hệ thống ghi khi chính sách chấm điểm chuyển hồ sơ cho người thẩm định. */
export const AI_POLICY_REVIEW = 'AI_POLICY_REQUIRES_REVIEW';

/** Nhãn lý do chuyển thẩm định; nhận mảng mã hoặc chuỗi nối ", " (lịch sử xử lý). Mã lạ gộp thành "Lý do khác". */
export function aiReviewReasonLabels(codes: string[] | string | null | undefined): string[] {
  const list = Array.isArray(codes) ? codes : (codes ?? '').split(', ');
  const labels = list.map((code) => code.trim()).filter(Boolean).map((code) => AI_REVIEW_REASONS[code] ?? 'Lý do khác');
  return Array.from(new Set(labels));
}

/** Mã lý do hệ thống ghi kèm phần giải thích là danh sách mã loại trực tiếp của chính sách chấm điểm. */
export const AI_POLICY_REJECTED = 'AI_POLICY_AUTO_REJECTED';

/**
 * Nhãn của một mã lý do: lý do từ chối của quản trị viên, lý do ở bước kiểm tra điều kiện vay hoặc lý do tự quyết
 * của chính sách chấm điểm. Mã chưa biết ghi "Lý do khác" thay vì để lộ mã kỹ thuật.
 */
export function reasonLabel(code: string | null | undefined): string {
  if (!code) return '-';
  return REJECT_REASONS.find((item) => item.code === code)?.label
    ?? ELIGIBILITY_REASONS[code]
    ?? AI_POLICY_REASONS[code]
    ?? 'Lý do khác';
}

/**
 * Lý do loại trực tiếp của chính sách chấm điểm. Loan Service nối các mã `rejection_reasons` bằng ", " (cả ở
 * `rejectionReason` của lần chấm lẫn `reasonDetail` của lịch sử khi tự từ chối). Mã chưa có nhãn gộp thành một dòng
 * "Lý do khác".
 */
export function policyRejectionLabels(summary: string): string[] {
  const labels = summary
    .split(', ')
    .map((code) => code.trim())
    .filter(Boolean)
    .map((code) => NHAN_MA_LOAI_TRUC_TIEP[code] ?? 'Lý do khác');
  return Array.from(new Set(labels));
}

/**
 * Lý do khóa nút "Yêu cầu chấm lại", hoặc `null` khi bấm được. Theo đúng điều kiện Loan Service nhận yêu cầu
 * (`CreditScoringAdminStateService.retry`, `LoanApplication.reopenScoring`): lần chấm mới nhất `FAILED` và hồ sơ
 * đang `PENDING_REVIEW`. Trạng thái khác backend trả `409` (ADM-N02b).
 */
export function scoringRetryBlockedReason(application: AdminLoanReviewDetail): string | null {
  const status = application.assessment?.status;
  if (status === 'RETRY_PENDING') return 'Hệ thống đang tự chấm lại, chưa cần yêu cầu thêm.';
  if (status !== 'FAILED') return 'Chỉ lần chấm điểm không thành công mới yêu cầu chấm lại được.';
  if (application.status !== 'PENDING_REVIEW') return 'Chỉ hồ sơ chờ thẩm định mới yêu cầu chấm lại được.';
  return null;
}

/**
 * Lý do khóa nút "Duyệt hồ sơ", hoặc `null` khi duyệt được. Backend chỉ nhận duyệt bằng lần chấm điểm thành công mới
 * nhất (`AdminLoanDecisionStateServiceImpl.approve`); từ chối thì chỉ cần hồ sơ đang chờ thẩm định.
 */
export function approveBlockedReason(application: AdminLoanReviewDetail): string | null {
  const assessment = application.assessment;
  if (assessment?.status === 'SUCCEEDED') return null;
  if (!assessment) return 'Hồ sơ chưa được chấm điểm nên chưa duyệt được.';
  if (assessment.status === 'FAILED') return 'Lần chấm điểm gần nhất không thành công nên chưa duyệt được.';
  return 'Hệ thống chưa chấm điểm xong nên chưa duyệt được.';
}

/**
 * Mã phiên bản chính sách của backend sang tên đọc được.
 *
 * Backend công bố các dạng `CREDIT_POLICY_V<n>` (AI), `RISK_PRICING_V<n>`, `BORROWER_ELIGIBILITY_V<n>`,
 * `FINORA_INTERNAL_CREDIT_V<n>` và `*_SCHEDULE_V<n>` (lịch trả). Mã lạ giữ nguyên để vẫn đối chiếu được.
 */
const POLICY_PATTERNS: Array<[RegExp, string]> = [
  [/^CREDIT_POLICY_V(\d+)$/, 'chính sách tín dụng v'],
  [/^RISK_PRICING_V(\d+)$/, 'chính sách định giá v'],
  [/^BORROWER_ELIGIBILITY_V(\d+)$/, 'chính sách điều kiện vay v'],
  [/^FINORA_INTERNAL_CREDIT_V(\d+)$/, 'hồ sơ tín dụng nội bộ v'],
  [/_SCHEDULE_V(\d+)$/, 'cách tính lịch trả v'],
];

export function policyLabel(code: string | null | undefined): string {
  if (!code) return '-';
  for (const [pattern, label] of POLICY_PATTERNS) {
    const match = pattern.exec(code);
    if (match) return `${label}${match[1]}`;
  }
  return code;
}

export type RateDirection = 'lower' | 'same' | 'higher';

export function rateDirection(baseRate: number, finalRate: number): RateDirection {
  if (finalRate < baseRate) return 'lower';
  if (finalRate > baseRate) return 'higher';
  return 'same';
}

export const DIRECTION_COPY: Record<RateDirection, { label: string; tone: 'success' | 'warning' | 'neutral' }> = {
  lower: { label: 'Lãi suất giảm', tone: 'success' },
  higher: { label: 'Lãi suất tăng', tone: 'warning' },
  same: { label: 'Giữ nguyên lãi suất', tone: 'neutral' },
};

const NUMBER_4 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 4 });

/** Số thập phân tới 4 chữ số, dùng cho điểm luật, trọng số và chênh lệch lãi suất. */
export function formatDecimal(value: number): string {
  return NUMBER_4.format(value);
}

/** Số có dấu (+/-) theo định dạng vi-VN, dùng cho đóng góp SHAP. */
export function formatSignedDecimal(value: number): string {
  return `${value > 0 ? '+' : ''}${formatDecimal(value)}`;
}

/**
 * Định dạng giá trị theo trường luật, chép đơn vị từ danh mục trường của finora-ai (`truong_du_lieu.py`). Danh mục
 * thật chỉ đọc được bằng quyền Chính sách AI nên giữ bản tĩnh; trường mới chưa có ở đây vẫn hiện số vi-VN.
 */
const MONEY_FIELDS = new Set(['annual_inc', 'loan_amnt', 'installment', 'tong_du_no', 'du_no_the_tin_dung']);
/** Trường tỷ lệ 0..1 (`la_ty_le`): hiện theo phần trăm. */
const FRACTION_FIELDS = new Set(['ty_le_tra_no_thang', 'loan_to_income', 'ty_le_du_no_thu_nhap']);
/** Trường đã ở đơn vị phần trăm. */
const PERCENT_FIELDS = new Set(['dti', 'ty_le_su_dung_the']);
const UNIT_FIELDS: Record<string, string> = {
  person_age: 'tuổi',
  emp_length_years: 'năm',
  term_months: 'tháng',
  cic_score: 'điểm',
  so_lan_tre_han: 'lần',
  thang_tu_tre_gan_nhat: 'tháng',
  nhom_no_cao_nhat: 'nhóm',
  so_lan_tra_cuu: 'lần',
  so_hop_dong_dang_co: 'hợp đồng',
  so_thang_quan_he: 'tháng',
};

function formatNumberByField(field: string, value: number): string {
  if (MONEY_FIELDS.has(field)) return formatMoney(value);
  if (FRACTION_FIELDS.has(field)) return formatPercent(value, true);
  if (PERCENT_FIELDS.has(field)) return formatPercent(value);
  if (field === 'nhom_no_cao_nhat') return `nhóm ${formatDecimal(value)}`;
  const unit = UNIT_FIELDS[field];
  return unit ? `${formatDecimal(value)} ${unit}` : formatDecimal(value);
}

/** Giá trị luật đã đọc: số theo đơn vị của trường, giá trị phân loại thì dịch, còn lại giữ nguyên. */
export function formatRuleValue(field: string, value: RuleTraceItem['gia_tri']): string {
  if (value == null) return '-';
  if (typeof value === 'number') return formatNumberByField(field, value);
  return findBusinessLabel(value) ?? GIA_TRI_LABEL[value] ?? value;
}

/**
 * Vài số liệu chỉ có trong vết chấm điểm (không nằm trong hồ sơ): điểm CIC, số lần tra cứu, tỷ lệ
 * tiền trả mỗi kỳ. Luật là dữ liệu do quản trị viên cấu hình nên trường có thể vắng; khi vắng thì
 * không hiện dòng tương ứng.
 */
export const TRACE_FIELDS: Record<string, { label: string }> = {
  ty_le_tra_no_thang: { label: 'Tiền trả mỗi kỳ so với thu nhập' },
  cic_score: { label: 'Điểm tín dụng CIC' },
  so_lan_tra_cuu: { label: 'Tra cứu CIC trong 6 tháng' },
};

export const IMPACT_LABELS: Record<YeuToGop['muc_do'], string> = {
  manh: 'Mạnh',
  vua: 'Vừa',
  nhe: 'Nhẹ',
};
