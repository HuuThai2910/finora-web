import type { PageResponse, RepaymentMethod } from '@/features/product/types';

export type LoanApplicationStatus =
  | 'SUBMITTED' | 'ELIGIBILITY_PENDING' | 'SCORING' | 'SCORING_RETRY_PENDING'
  | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
export type CreditAssessmentStatus = 'PENDING' | 'PROCESSING' | 'RETRY_PENDING' | 'SUCCEEDED' | 'FAILED';

export interface ApplicantFinancialInformation {
  declaredMonthlyIncome: number;
  annualIncomeSnapshot: number;
  employmentLengthMonths: number | null;
  educationLevel: string | null;
  homeOwnership: string;
  monthlyDebtObligations: number;
  dtiSnapshot: number;
  informationSource: string;
  capturedAt: string;
}

export interface SchedulePeriod {
  period: number;
  fromDate: string;
  dueDate: string;
  daysInPeriod: number;
  principal: number;
  interest: number;
  fees: number;
  penalties: number;
  totalDue: number;
  outstandingBalance: number;
}

export interface ScheduleCalculationSnapshot {
  id: number;
  expectedDisbursementDate: string;
  totalPrincipal: number;
  totalInterest: number;
  totalFees: number;
  totalPenalties: number;
  totalRepayment: number;
  firstInstallment: number;
  maximumInstallment: number;
  periods: SchedulePeriod[];
  calculationPolicyVersion: string;
  calculatedAt: string;
}

export interface EligibilityEvidence {
  age: number;
  kycStatus: 'VERIFIED' | 'PENDING' | 'PROCESSING' | 'REJECTED' | 'EXPIRED';
  profileSource: string;
  result: 'ELIGIBLE' | 'RETRY_PENDING' | 'INELIGIBLE' | 'DEPENDENCY_UNAVAILABLE' | 'INVALID_PROFILE';
  reasonCode: string | null;
  policyVersion: string;
  checkedAt: string;
}

export interface CreditProfileEvidence {
  hasInternalCreditHistory: boolean;
  internalDelinquenciesLast2Years: number;
  internalDefaultedLoanCount: number;
  completedLoanCount: number;
  source: string;
  calculationPolicyVersion: string;
}

export interface LoanApplicationHistoryItem {
  id: number;
  fromStatus: LoanApplicationStatus | null;
  toStatus: LoanApplicationStatus;
  reasonCode: string | null;
  reasonDetail: string | null;
  actorType: 'BORROWER' | 'ADMIN' | 'SYSTEM';
  actorId: string;
  createdAt: string;
}

export interface AssessmentEvidence {
  assessmentId: number;
  status: CreditAssessmentStatus;
  actualModelVersion: string | null;
  pdProbability: number | null;
  riskScore: number | null;
  evaluationScore: number | null;
  creditGrade: string | null;
  suggestedLimit: number | null;
  aiRecommendation: string | null;
  rejectionReason: string | null;
  decisionPolicyVersion: string | null;
  scoredAt: string | null;
}

export interface AdminLoanReviewSummary {
  applicationNumber: string;
  borrowerId: string;
  requestedAmount: number;
  requestedTermMonths: number;
  annualInterestRate: number;
  repaymentMethod: RepaymentMethod;
  status: LoanApplicationStatus;
  assessment: AssessmentEvidence | null;
  version: number;
  submittedAt: string;
}

export interface AdminLoanReviewDetail extends AdminLoanReviewSummary {
  purposeCode: string;
  purposeDetail: string | null;
  financialInformation: ApplicantFinancialInformation;
  schedule: ScheduleCalculationSnapshot;
  eligibility: EligibilityEvidence | null;
  creditProfile: CreditProfileEvidence | null;
  recentHistory: LoanApplicationHistoryItem[];
}

export interface CreditAssessmentSummary {
  id: number;
  applicationId: number;
  requestId: string;
  status: CreditAssessmentStatus;
  attemptCount: number;
  requestedModelVersion: string;
  actualModelVersion: string | null;
  pdProbability: number | null;
  riskScore: number | null;
  evaluationScore: number | null;
  creditGrade: string | null;
  suggestedLimit: number | null;
  aiRecommendation: string | null;
  failureCode: string | null;
  nextRetryAt: string | null;
  scoredAt: string | null;
  createdAt: string;
}

export interface CreditAssessmentDetail extends CreditAssessmentSummary {
  version: number;
  failureDetail: string | null;
  inputSnapshot: Record<string, unknown>;
  inputSources: Record<string, unknown>;
  responseSnapshot: Record<string, unknown> | null;
}

export interface AdminDecisionResponse {
  applicationNumber: string;
  applicationStatus: LoanApplicationStatus;
  applicationVersion: number;
  decisionReasonCode: string;
  contractNumber: string | null;
  contractStatus: string | null;
  contractVersion: number | null;
  documentHash: string | null;
  expiresAt: string | null;
}

export interface ScoringRetryAcceptedResponse {
  assessmentId: number;
  requestStatus: 'ACCEPTED';
  assessmentStatus: CreditAssessmentStatus;
  message: string;
  resultPath: string;
}

export type AdminLoanReviewPage = PageResponse<AdminLoanReviewSummary>;
export type AssessmentPage = PageResponse<CreditAssessmentSummary>;

/* ── AI Config (finora-ai /api/v1/ai/config/product) ────────────────────── */

export interface GradeConfig {
  grade: string;
  min_score: number;
  max_score: number;
  limit: number;
}

export interface ApprovalThresholds {
  auto_approve: number;
  auto_reject: number;
}

export interface ModelWeights {
  pd_weight: number;
  risk_weight: number;
}

export interface LegalLimits {
  max_platform_limit: number;
  /** Trần tổng dư nợ một khách hàng trên toàn bộ nền tảng — QĐ 2866/QĐ-NHNN. */
  max_total_debt_all_platforms: number;
  max_interest_rate: number;
  max_term_months: number;
}

export interface AiProductConfig {
  grades: GradeConfig[];
  approval_thresholds: ApprovalThresholds;
  model_weights: ModelWeights;
  legal_limits: LegalLimits;
}

export interface AiProductConfigUpdate {
  grades: GradeConfig[];
  approval_thresholds: ApprovalThresholds;
  model_weights?: ModelWeights;
}

/* ── AI Rules (finora-ai /api/v1/ai/config/rules) ───────────────────────── */

/** Một bậc chấm điểm: [ngưỡng, điểm]. */
export type RuleBac = [number, number];

/**
 * Một luật chấm điểm — đúng bản ghi backend lưu trong product_config.json.
 * Luật là dữ liệu: admin thêm/sửa/xoá tuỳ ý, không còn bộ luật cố định.
 */
export interface AiRule {
  /** Mã ổn định, ^[A-Z][A-Z0-9_]{2,63}$ — xuất hiện trong rule_trace lưu kèm quyết định. */
  ma: string;
  mo_ta: string;
  /** Mã trường trong danh mục `AiTruong` mà luật đọc giá trị. */
  truong: string;
  /** True nghĩa là giá trị càng thấp càng tốt (ví dụ DTI). Chỉ có nghĩa với trường số. */
  nghich_dao: boolean;
  /** Tỷ trọng so với luật khác khi chuẩn hoá về thang 100, 0.1–10. */
  trong_so: number;
  bat: boolean;
  diem_khi_thieu: number;
  /** Bậc (ngưỡng, điểm) — trường số. */
  bac: RuleBac[] | null;
  /** Bảng điểm theo giá trị rời rạc — trường phân loại. */
  bang_diem: Record<string, number> | null;
  /** Mẫu câu gợi ý cải thiện cho người vay, chỗ trống {moc} là ngưỡng kế tiếp. */
  goi_y: string | null;
}

/** Một trường trong danh mục backend công bố — luật chỉ được đọc trường ở đây. */
export interface AiTruong {
  ma: string;
  mo_ta: string;
  kieu: 'so' | 'phan_loai';
  nguon: 'ho_so' | 'cic' | 'fineract' | 'dan_xuat';
  don_vi: string;
  /** True với trường 0–1: hiển thị và gợi ý theo phần trăm. */
  la_ty_le: boolean;
  gia_tri_hop_le: string[];
  nhom_shap: string | null;
}

export interface AiRulesResponse {
  rules: AiRule[];
  truong: AiTruong[];
  diem_toi_da_moi_luat: number;
  /** Ngưỡng biểu diễn "mọi giá trị còn lại" — JSON không có Infinity. */
  nguong_vo_cuc: number;
}

/** PUT thay TOÀN BỘ danh sách luật, theo đúng thứ tự gửi lên. */
export interface AiRulesUpdate {
  rules: AiRule[];
}

/* ── AI Credit Scoring (finora-ai /api/v1/ai/credit) ─────────────────────── */

/** Hồ sơ gửi sang finora-ai để chấm điểm. Trường tùy chọn bỏ trống thay vì
 *  điền số, để bộ dự đoán dùng median trong gói model. */
export interface CreditScoreRequest {
  annual_inc: number;
  loan_amnt: number;
  purpose: string;
  home_ownership: string;
  person_age?: number;
  emp_length?: string;
  verification_status?: string;
  dti?: number;
  installment?: number;
  int_rate?: number;
  term_months?: number;
  interest_method?: string;
  so_cccd?: string;
}

/** Vết của một luật đã chạy — cơ sở giải trình của Rule Engine (D4). */
export interface RuleTraceItem {
  ma: string;
  mo_ta: string;
  /** Mã trường luật đã đọc, ví dụ cic_score. */
  truong: string;
  gia_tri: number | string | null;
  diem: number;
  toi_da: number;
  trong_so: number;
  thieu_du_lieu: boolean;
}

export interface CreditScoreResponse {
  pd_probability: number;
  risk_score: number;
  evaluation_score: number;
  credit_grade: 'A' | 'B' | 'C' | 'D';
  suggested_limit: number;
  decision: 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED';
  rejection_reason: string | null;
  rejection_reasons: string[];
  rule_trace: RuleTraceItem[];
  model_version: string;
}

/** Một yếu tố ảnh hưởng tới PD, đo bằng đóng góp TreeSHAP (C1.2). */
export interface YeuToAnhHuong {
  dac_trung: string;
  mo_ta: string;
  gia_tri: number;
  /** Đóng góp vào log-odds: dương = đẩy về phía rủi ro, âm = kéo về an toàn. */
  muc_dong_gop: number;
  /** True khi đặc trưng là rò rỉ nhãn đã biết (int_rate) — hiển thị kèm cảnh báo. */
  la_leakage: boolean;
}

/**
 * Một dữ kiện gốc của hồ sơ (dư nợ, thu nhập, điểm CIC…), gộp từ mọi đặc trưng
 * dẫn xuất của nó. Bản này dành cho thẩm định viên: không số log-odds, chỉ mức
 * ảnh hưởng so với dữ kiện mạnh nhất của chính hồ sơ.
 */
export interface YeuToGop {
  ma_nhom: string;
  mo_ta: string;
  muc_do: 'manh' | 'vua' | 'nhe';
  /** Tổng đóng góp SHAP của cả nhóm, giữ để đối chứng với bản thô. */
  muc_dong_gop: number;
}

export interface TomTatYeuTo {
  bat_loi: YeuToGop[];
  co_loi: YeuToGop[];
}

export interface GiaiThichMoHinh {
  yeu_to_bat_loi: YeuToAnhHuong[];
  yeu_to_co_loi: YeuToAnhHuong[];
  gia_tri_co_so: number;
  canh_bao: string[];
  /** Bản gộp theo dữ kiện gốc, đã bỏ nhóm lãi suất (leakage). */
  tom_tat: TomTatYeuTo;
}

/** Bản diễn giải cho người vay — thay số log-odds bằng câu chữ và việc cần làm. */
export interface DienGiaiNguoiDung {
  thong_diep: string;
  ly_do_chinh: string[];
  goi_y_cai_thien: string[];
}

export interface CreditExplainResponse {
  pd_probability: number;
  risk_score: number;
  evaluation_score: number;
  credit_grade: 'A' | 'B' | 'C' | 'D';
  decision: 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED';
  dien_giai: DienGiaiNguoiDung;
  giai_thich_mo_hinh: GiaiThichMoHinh;
  rule_trace: RuleTraceItem[];
  rejection_reasons: string[];
  model_version: string;
}
