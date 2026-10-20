import { useSearchParams } from 'react-router-dom';
import { REFERENCE_TYPES, STATUS_TABS } from '../constants';
import type { ProofReferenceType, ProofStatus } from '../types';

export interface ProofReference {
  type: ProofReferenceType;
  id: string;
}

export interface ProofFilters {
  /** Có cả loại và mã tham chiếu: đang tra theo tham chiếu, khi đó không lọc trạng thái. */
  reference: ProofReference | null;
  status: ProofStatus | null;
  /** Trang hiện tại, tính từ 0 như backend. */
  page: number;
  /** Proof đang mở trong ngăn chi tiết. */
  proofId: string | null;
}

const isReferenceType = (value: string | null): value is ProofReferenceType =>
  REFERENCE_TYPES.some((item) => item.value === value);

const isStatus = (value: string | null): value is ProofStatus =>
  STATUS_TABS.some((item) => item.value !== null && item.value === value);

/** Số trang trên URL tính từ 1; giá trị lạ coi như trang đầu. */
function readPage(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 1 ? parsed - 1 : 0;
}

function toQuery(filters: ProofFilters): Record<string, string> {
  const query: Record<string, string> = {};
  if (filters.reference) {
    query.referenceType = filters.reference.type;
    query.referenceId = filters.reference.id;
  } else if (filters.status) {
    query.status = filters.status;
  }
  if (filters.page > 0) query.page = String(filters.page + 1);
  if (filters.proofId) query.proof = filters.proofId;
  return query;
}

/**
 * Bộ lọc của trang Bằng chứng blockchain nằm trên URL (`?referenceType=LOAN_APPLICATION&referenceId=123`,
 * `?status=DEAD_LETTER&page=2`, thêm `&proof=<proofId>` khi mở ngăn chi tiết) để gửi đường dẫn đúng kết quả hoặc đúng
 * proof đang xem. Tra theo tham chiếu và lọc trạng thái loại trừ nhau vì backend không nhận cả hai cùng lúc
 * (`PROOF_FILTER_UNSUPPORTED`); đổi bộ lọc thì về trang đầu và đóng ngăn chi tiết.
 */
export function useProofFilters() {
  const [params, setParams] = useSearchParams();
  const type = params.get('referenceType');
  const id = params.get('referenceId')?.trim() ?? '';
  const reference = isReferenceType(type) && id ? { type, id } : null;
  const status = params.get('status');
  const filters: ProofFilters = {
    reference,
    status: reference === null && isStatus(status) ? status : null,
    page: readPage(params.get('page')),
    proofId: params.get('proof'),
  };

  const write = (next: ProofFilters, replace = false) => setParams(toQuery(next), { replace });

  return {
    filters,
    search: (next: ProofReference) => write({ reference: next, status: null, page: 0, proofId: null }),
    clearSearch: () => write({ reference: null, status: null, page: 0, proofId: null }),
    setStatus: (next: ProofStatus | null) => write({ reference: null, status: next, page: 0, proofId: null }),
    setPage: (next: number) => write({ ...filters, page: next, proofId: null }),
    // Mở, đóng ngăn chi tiết không thêm mục lịch sử: Back vẫn về bộ lọc trước đó.
    openProof: (proofId: string) => write({ ...filters, proofId }, true),
    closeProof: () => write({ ...filters, proofId: null }, true),
  };
}
