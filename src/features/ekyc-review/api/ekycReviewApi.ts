import type { PageResponse } from '@/features/user';
import { toUiApiError } from '@/lib/api/errors';
import { apiFetch, apiFetchBlob } from '@/lib/api/httpClient';
import type {
  EkycAttemptDetail,
  EkycAttemptListArgs,
  EkycAttemptSummary,
  EkycEvidenceId,
  EkycReviewDecision,
} from '../types';

/**
 * API duyệt eKYC của finora-user qua Gateway (EKYC-002 §3.7). Trả DTO trực tiếp, không bọc `BaseResponse`.
 * Quyền do backend kiểm: đọc cần `user:admin:read_all`, duyệt/từ chối cần `user:admin:lock`.
 */
const BASE = '/api/v1/admin/users/ekyc-attempts';

const attemptPath = (attemptId: string) => `${BASE}/${encodeURIComponent(attemptId)}`;

export const ekycReviewApi = {
  listAttempts: ({ status, page, size }: EkycAttemptListArgs, signal?: AbortSignal): Promise<PageResponse<EkycAttemptSummary>> => {
    const params = new URLSearchParams({ status, page: String(page), size: String(size) });
    return apiFetch<PageResponse<EkycAttemptSummary>>(`${BASE}?${params.toString()}`, { signal });
  },

  getAttempt: (attemptId: string, signal?: AbortSignal): Promise<EkycAttemptDetail> =>
    apiFetch<EkycAttemptDetail>(attemptPath(attemptId), { signal }),

  /**
   * Nội dung một tệp bằng chứng. Mỗi lần gọi được backend ghi vào `ekyc_evidence_access_log`,
   * nên chỉ gọi khi thật sự hiển thị tệp. Đi bằng cookie như mọi request khác, không gắn token vào URL.
   */
  getEvidenceFile: (attemptId: string, evidenceId: EkycEvidenceId, signal?: AbortSignal): Promise<Blob> =>
    apiFetchBlob(`${attemptPath(attemptId)}/evidence/${encodeURIComponent(String(evidenceId))}`, { signal }),

  /**
   * Duyệt hoặc từ chối một lượt đang `MANUAL_REVIEW`; backend trả lại chi tiết sau quyết định.
   * Ghi chú gửi dạng chuỗi (rỗng khi duyệt không ghi chú); từ chối bắt buộc có ghi chú.
   */
  decide: (attemptId: string, decision: EkycReviewDecision, note: string): Promise<EkycAttemptDetail> =>
    apiFetch<EkycAttemptDetail>(`${attemptPath(attemptId)}/${decision}`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    }),
};

/** 409 khi quản trị viên khác đã quyết định trước (`@Version` trên lượt). Các lỗi 409 khác, như trùng số, không thuộc nhánh này. */
export function isAttemptAlreadyDecided(error: unknown): boolean {
  return toUiApiError(error).code === 'ATTEMPT_ALREADY_DECIDED';
}

/** 410 `EVIDENCE_DELETED`: tệp đã bị xoá sau khi trang tải danh sách bằng chứng. */
export function isEvidenceDeleted(error: unknown): boolean {
  const uiError = toUiApiError(error);
  return uiError.code === 'EVIDENCE_DELETED' || uiError.status === 410;
}
