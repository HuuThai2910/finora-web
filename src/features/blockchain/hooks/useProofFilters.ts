import { useSearchParams } from 'react-router-dom';
import { PROOF_TYPE_LABEL, PROVIDER_LABEL, REFERENCE_TYPES, STATUS_TABS } from '../constants';
import type { ProofProvider, ProofReferenceType, ProofStatus, ProofType } from '../types';

export interface ProofReference {
  type: ProofReferenceType;
  id: string;
}

export interface ProofFilters {
  /** Có cả loại và mã tham chiếu: đang tra theo tham chiếu (ô tìm). */
  reference: ProofReference | null;
  status: ProofStatus | null;
  proofType: ProofType | null;
  provider: ProofProvider | null;
  /** Ngày tạo `YYYY-MM-DD` (giờ VN, gồm hai đầu); rỗng là không lọc. */
  createdFrom: string;
  createdTo: string;
  /** Trang hiện tại, tính từ 0 như backend. */
  page: number;
  /** Proof đang mở trong ngăn chi tiết. */
  proofId: string | null;
}

export const isReferenceType = (value: string | null): value is ProofReferenceType =>
  REFERENCE_TYPES.some((item) => item.value === value);

export const isProofStatus = (value: string | null): value is ProofStatus =>
  STATUS_TABS.some((item) => item.value !== null && item.value === value);

export const isProofType = (value: string | null): value is ProofType => value != null && value in PROOF_TYPE_LABEL;

export const isProvider = (value: string | null): value is ProofProvider => value != null && value in PROVIDER_LABEL;

/** Số trang trên URL tính từ 1; giá trị lạ coi như trang đầu. */
function readPage(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 1 ? parsed - 1 : 0;
}

/**
 * Bộ lọc của trang Kiểm toán nằm trên URL (`?referenceType=LOAN_APPLICATION&referenceId=123`, `?status=DEAD_LETTER`,
 * `?proofType=REPAYMENT&createdFrom=…`, thêm `&proof=<proofId>` khi mở ngăn chi tiết) để gửi đường dẫn đúng kết quả.
 * Link cũ (Tổng quan `?status=DEAD_LETTER`, hồ sơ vay `?referenceType=…&referenceId=…`) giữ nguyên nghĩa; tra theo tham
 * chiếu nay ghép được với trạng thái và các bộ lọc khác. Đổi bộ lọc thì về trang đầu và đóng ngăn chi tiết.
 */
export function useProofFilters() {
  const [params, setParams] = useSearchParams();
  const type = params.get('referenceType');
  const id = params.get('referenceId')?.trim() ?? '';
  const status = params.get('status');
  const proofType = params.get('proofType');
  const provider = params.get('provider');
  const filters: ProofFilters = {
    reference: isReferenceType(type) && id ? { type, id } : null,
    status: isProofStatus(status) ? status : null,
    proofType: isProofType(proofType) ? proofType : null,
    provider: isProvider(provider) ? provider : null,
    createdFrom: params.get('createdFrom') ?? '',
    createdTo: params.get('createdTo') ?? '',
    page: readPage(params.get('page')),
    proofId: params.get('proof'),
  };

  const update = (patch: Record<string, string | null>, replace = false) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setParams(next, { replace });
  };

  return {
    filters,
    search: (next: ProofReference) =>
      update({ referenceType: next.type, referenceId: next.id, page: null, proof: null }, true),
    clearSearch: () => update({ referenceType: null, referenceId: null, page: null, proof: null }),
    setPage: (next: number) => update({ page: next > 0 ? String(next + 1) : null, proof: null }),
    // Mở, đóng ngăn chi tiết không thêm mục lịch sử: Back vẫn về bộ lọc trước đó.
    openProof: (proofId: string) => update({ proof: proofId }, true),
    closeProof: () => update({ proof: null }, true),
  };
}
