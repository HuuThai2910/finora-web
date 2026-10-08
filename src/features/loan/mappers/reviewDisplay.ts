import { formatBusinessLabel, findBusinessLabel, formatPercent } from '../formatters';
import type { RuleTraceItem, YeuToGop } from '../types';

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
  { code: 'IDENTITY_OR_KYC_NOT_ELIGIBLE', label: 'eKYC không đủ điều kiện' },
  { code: 'INCONSISTENT_DECLARED_INFORMATION', label: 'Thông tin khai báo không nhất quán' },
  { code: 'POLICY_NOT_SATISFIED', label: 'Không đạt chính sách' },
  { code: 'OTHER_MANUAL_REVIEW', label: 'Lý do thẩm định khác' },
];

/** Độ dài tối đa của phần giải thích khi từ chối (`@Size(max = 1000)` ở backend). */
export const REJECT_DETAIL_MAX = 1000;

export function reasonLabel(code: string | null | undefined): string {
  return REJECT_REASONS.find((item) => item.code === code)?.label ?? formatBusinessLabel(code);
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

/** Giá trị luật đã đọc: enum quen thuộc thì dịch, số thì định dạng, còn lại giữ nguyên. */
export function formatRuleValue(value: RuleTraceItem['gia_tri']): string {
  if (value == null) return '-';
  if (typeof value === 'number') return formatDecimal(value);
  return findBusinessLabel(value) ?? value;
}

/**
 * Vài số liệu chỉ có trong vết chấm điểm (không nằm trong hồ sơ): điểm CIC, số lần tra cứu, tỷ lệ
 * tiền trả mỗi kỳ. Luật là dữ liệu do quản trị viên cấu hình nên trường có thể vắng; khi vắng thì
 * không hiện dòng tương ứng.
 */
export const TRACE_FIELDS: Record<string, { label: string; format: (value: number | string) => string }> = {
  ty_le_tra_no_thang: {
    label: 'Tiền trả mỗi kỳ so với thu nhập',
    format: (value) => (typeof value === 'number' ? formatPercent(value, true) : value),
  },
  cic_score: { label: 'Điểm tín dụng CIC', format: (value) => (typeof value === 'number' ? formatDecimal(value) : value) },
  so_lan_tra_cuu: { label: 'Tra cứu CIC trong 6 tháng', format: (value) => `${String(value)} lần` },
};

export const IMPACT_LABELS: Record<YeuToGop['muc_do'], string> = {
  manh: 'Mạnh',
  vua: 'Vừa',
  nhe: 'Nhẹ',
};
