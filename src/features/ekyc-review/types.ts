/*
 * Kiểu dữ liệu trang Duyệt eKYC, khớp hợp đồng EKYC-002 (§3.3 bản nháp, §3.7 API quản trị, §4 bảng
 * `ekyc_attempts`/`ekyc_evidence`). Cột nào DB cho phép rỗng thì field tương ứng nhận `null`.
 * Mã trạng thái/lý do có thể được backend bổ sung: mapper luôn có nhánh cho mã lạ thay vì làm vỡ UI.
 */

/** Vòng đời một lượt: `IN_PROGRESS → VERIFIED | MANUAL_REVIEW | ABANDONED`; `MANUAL_REVIEW → APPROVED | REJECTED`. */
export type EkycAttemptStatus = 'IN_PROGRESS' | 'VERIFIED' | 'MANUAL_REVIEW' | 'APPROVED' | 'REJECTED' | 'ABANDONED';

export type EkycCardType = 'CCCD_CHIP_2021' | 'CAN_CUOC_2024' | 'CCCD_CHIP_UNKNOWN' | 'CCCD_BARCODE' | 'CMND' | 'UNKNOWN';

/** Quyết định của bước đọc giấy tờ đã lưu vào lượt (`ck_ekyc_attempts_document_decision`). */
export type EkycDocumentDecision = 'AUTO_OK' | 'NEEDS_REVIEW';

/** Kết quả liveness đã lưu vào lượt (`ck_ekyc_attempts_liveness_result`); `null` khi chưa quay. */
export type EkycLivenessResult = 'PASS' | 'REVIEW' | 'FAIL';

/** Nguồn của một trường: QR, MRZ, OCR (chữ in), AI (Gemini) hoặc USER (người dùng đã sửa). */
export type EkycFieldSource = 'QR' | 'MRZ' | 'OCR' | 'AI' | 'USER';

export interface EkycDraftField {
  value: string | null;
  sources: EkycFieldSource[];
  editable: boolean;
}

export type EkycDraftFieldKey =
  | 'idNumber'
  | 'fullName'
  | 'dateOfBirth'
  | 'gender'
  | 'address'
  | 'placeOfOrigin'
  | 'birthRegistrationPlace'
  | 'issueDate'
  | 'expiryDate';

/** Bản nháp đã giải mã (§3.3): trường không thu được là `null`; dùng `Partial` vì serializer có thể bỏ khoá rỗng. */
export type EkycDraft = Partial<Record<EkycDraftFieldKey, EkycDraftField | null>>;

/**
 * Một lý do liveness. §3.7 chưa chốt `livenessReasons` là mảng mã (như cột `liveness_reasons`) hay mảng
 * `{code, message}` (như `liveness.reasons` ở §3.3), nên nhận cả hai; mapper chuẩn hoá về một dạng.
 */
export type EkycReasonEntry = string | { code: string; message?: string | null };

/** Một dòng trong danh sách lượt (`EkycAttemptSummaryResponse`). */
export interface EkycAttemptSummary {
  attemptId: string;
  userProfileId: number;
  email: string;
  status: EkycAttemptStatus;
  cardType: EkycCardType | null;
  documentDecision: EkycDocumentDecision;
  livenessResult: EkycLivenessResult | null;
  faceMatchScore: number | null;
  /** Vùng điểm so mặt finora-user suy ra từ lý do AI lúc chấm; thiếu thì trang tự suy từ `livenessReasons`. */
  faceMatchZone?: 'HIGH' | 'GRAY' | 'LOW' | null;
  /** Mã lý do của bước đọc giấy tờ (cột `document_reasons`, cho phép rỗng). */
  reasons: string[] | null;
  createdAt: string;
  submittedAt: string | null;
}

export type EkycEvidenceKind = 'CCCD_FRONT' | 'CCCD_BACK' | 'LIVENESS_VIDEO' | 'LIVENESS_FRAME' | 'RESULT';

/** Hợp đồng không chốt kiểu mã tệp (id số của bảng hay chuỗi); web chỉ dùng nó để dựng đường dẫn. */
export type EkycEvidenceId = number | string;

export interface EkycEvidenceItem {
  evidenceId: EkycEvidenceId;
  kind: EkycEvidenceKind;
  /** Nhãn khung hình (`FRONTAL`, `TURN_LEFT`…) hoặc rỗng. */
  label: string | null;
  contentType: string;
  sizeBytes: number;
  /** Tệp đã xoá theo hạn lưu hoặc khi người dùng rút lại đồng ý. */
  deleted: boolean;
}

/** Chi tiết một lượt (`EkycAttemptDetailResponse`) = dòng tóm tắt + bản nháp + bằng chứng + kết quả duyệt. */
export interface EkycAttemptDetail extends EkycAttemptSummary {
  /** `null` khi lượt không lưu bản nháp (chưa gửi duyệt) hoặc bản nháp đã bị xoá. */
  draft: EkycDraft | null;
  livenessReasons: EkycReasonEntry[] | null;
  consentVersion: string | null;
  evidence: EkycEvidenceItem[];
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewerKeycloakId: string | null;
  /** Email người duyệt (backend tra hồ sơ theo `reviewerKeycloakId`); `null` khi admin không có hồ sơ FINORA. */
  reviewerEmail?: string | null;
  /** Họ tên người duyệt theo cùng cách tra; `null` nếu hồ sơ chưa có họ tên. */
  reviewerName?: string | null;
}

export type EkycReviewDecision = 'approve' | 'reject';

export interface EkycAttemptListArgs {
  status: EkycAttemptStatus;
  /** Trang tính từ 0 như backend. */
  page: number;
  size: number;
}

export interface EkycDecisionArgs {
  attemptId: string;
  decision: EkycReviewDecision;
  note: string;
  /** Hồ sơ bị đổi trạng thái eKYC sau quyết định, để làm mới cache người dùng tương ứng. */
  userProfileId: number;
}
