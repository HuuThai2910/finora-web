import { apiFetchBlob } from '@/lib/api/httpClient';
import { loanApi } from '@/lib/api/loanApi';
import type { AdminLoanContract, ContractSigningPolicy, LoanInstallments } from '../types';

const LOAN_BASE_URL = import.meta.env.VITE_LOAN_API_URL ?? '/api/v1';

/**
 * Hợp đồng và kỳ trả của khoản gọi vốn, đọc từ Loan (`/admin/loan-contracts`, `/admin/loans/{mã}/installments`).
 * Quyền: Xem "Gọi vốn" hoặc quyền đọc hồ sơ vay. Chỉ đọc nên không gắn tag làm mới; trang tải lại khi cần.
 */
const contractEndpoints = loanApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminLoanContract: builder.query<AdminLoanContract, string>({
      query: (contractNumber) => `/admin/loan-contracts/${encodeURIComponent(contractNumber)}`,
    }),

    /** Nhà cung cấp chữ ký số và thời hạn ký đang áp dụng, cho khoản chưa đủ vốn. */
    getContractSigningPolicy: builder.query<ContractSigningPolicy, void>({
      query: () => '/admin/loan-contracts/signing-policy',
    }),

    getLoanInstallments: builder.query<LoanInstallments, string>({
      query: (loanNumber) => `/admin/loans/${encodeURIComponent(loanNumber)}/installments`,
    }),
  }),
});

/**
 * Tải PDF hợp đồng hiện hành (bản để ký khi còn chờ ký, bản đủ chữ ký sau khi ký xong). Không qua RTK Query vì `Blob`
 * không lưu được vào store; `apiFetchBlob` kèm cookie phiên và tự làm mới phiên khi gặp 401.
 */
export function fetchContractPdf(contractNumber: string): Promise<Blob> {
  return apiFetchBlob(`${LOAN_BASE_URL}/admin/loan-contracts/${encodeURIComponent(contractNumber)}/document`);
}

export const {
  useGetAdminLoanContractQuery,
  useGetContractSigningPolicyQuery,
  useGetLoanInstallmentsQuery,
} = contractEndpoints;
