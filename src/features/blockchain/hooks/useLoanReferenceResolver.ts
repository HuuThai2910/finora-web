import { useState } from 'react';
import { usePermission } from '@/features/auth';
import { useLazyGetReviewDetailQuery } from '@/features/loan';
import { toUiApiError } from '@/lib/api/errors';
import { isLoanApplicationCode } from '../schemas/proofInputs';
import type { ProofReference } from './useProofFilters';

export type ResolveResult = { ok: true; reference: ProofReference } | { ok: false; message: string };

/**
 * Đổi tham chiếu người dùng nhập thành tham chiếu explorer nhận được. Explorer tra hồ sơ vay theo ID số, còn người vận
 * hành quen mã hồ sơ LA-… thấy trên màn Hồ sơ vay: mã LA-… được tra qua API chi tiết hồ sơ của Loan để lấy ID số
 * (cần quyền Xem "Hồ sơ vay"); ID số và các loại tham chiếu khác đi thẳng.
 *
 * Chỉ gọi khi bấm "Tra cứu"; đang tra thì `resolving` bật để form khóa nút, không gửi chồng.
 */
export function useLoanReferenceResolver() {
  const canViewLoan = usePermission().canView('loan-application');
  const [loadDetail] = useLazyGetReviewDetailQuery();
  const [resolving, setResolving] = useState(false);

  const resolve = async (reference: ProofReference): Promise<ResolveResult> => {
    if (reference.type !== 'LOAN_APPLICATION' || !isLoanApplicationCode(reference.id)) return { ok: true, reference };
    const code = reference.id.trim().toUpperCase();
    if (!canViewLoan) {
      return { ok: false, message: 'Tra bằng mã LA-... cần quyền Xem "Hồ sơ vay". Hãy nhập ID số của hồ sơ.' };
    }
    setResolving(true);
    try {
      // Dùng cache nếu vừa xem hồ sơ này: mã hồ sơ và ID số không đổi.
      const detail = await loadDetail(code, true).unwrap();
      return { ok: true, reference: { type: 'LOAN_APPLICATION', id: String(detail.id) } };
    } catch (error) {
      const uiError = toUiApiError(error);
      return {
        ok: false,
        message: uiError.status === 404 ? `Không tìm thấy hồ sơ vay ${code}.` : uiError.message,
      };
    } finally {
      setResolving(false);
    }
  };

  return { resolve, resolving };
}
