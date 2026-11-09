import { useState } from 'react';
import { usePermission } from '@/features/auth';
import { useLazyLookupApplicationQuery } from '@/features/loan';
import { toUiApiError } from '@/lib/api/errors';
import { isContractDisplayCode, isLoanApplicationCode } from '../schemas/proofInputs';
import type { ProofReference } from './useProofFilters';

export type ResolveResult = { ok: true; reference: ProofReference } | { ok: false; message: string };

/**
 * Đổi tham chiếu người dùng nhập thành tham chiếu explorer nhận được. Explorer tra hồ sơ vay theo ID số và hợp đồng
 * theo mã tra cứu `LC-…`, còn người vận hành quen mã hiển thị `HS-…`/`HĐ-…` thấy trên màn Hồ sơ vay: các mã đó được
 * tra qua API tra mã của Loan (cần quyền Xem "Hồ sơ vay") để lấy ID số hoặc mã `LC-…`; ID số, mã `LC-…` của hợp đồng
 * và các loại tham chiếu khác đi thẳng.
 *
 * Chỉ gọi khi bấm "Tra cứu"; đang tra thì `resolving` bật để form khóa nút, không gửi chồng.
 */
export function useLoanReferenceResolver() {
  const canViewLoan = usePermission().canView('loan-application');
  const [lookup] = useLazyLookupApplicationQuery();
  const [resolving, setResolving] = useState(false);

  const resolve = async (reference: ProofReference): Promise<ResolveResult> => {
    const id = reference.id.trim();
    const needsLookup = (reference.type === 'LOAN_APPLICATION' && isLoanApplicationCode(id))
      || (reference.type === 'LOAN_CONTRACT' && isContractDisplayCode(id));
    if (!needsLookup) return { ok: true, reference };
    const code = id.toUpperCase();
    if (!canViewLoan) {
      return {
        ok: false,
        message: reference.type === 'LOAN_APPLICATION'
          ? 'Tra bằng mã hồ sơ cần quyền Xem "Hồ sơ vay". Hãy nhập ID số của hồ sơ.'
          : 'Tra bằng mã hợp đồng HĐ-… cần quyền Xem "Hồ sơ vay". Hãy nhập mã LC-… của hợp đồng.',
      };
    }
    setResolving(true);
    try {
      // Dùng cache nếu vừa tra mã này: các cặp mã của một hồ sơ không đổi.
      const found = await lookup(code, true).unwrap();
      if (reference.type === 'LOAN_APPLICATION') {
        return { ok: true, reference: { type: 'LOAN_APPLICATION', id: String(found.id) } };
      }
      if (!found.contractNumber) return { ok: false, message: `Hồ sơ ${code} chưa có hợp đồng.` };
      return { ok: true, reference: { type: 'LOAN_CONTRACT', id: found.contractNumber } };
    } catch (error) {
      const uiError = toUiApiError(error);
      return {
        ok: false,
        message: uiError.status === 404 ? `Không tìm thấy hồ sơ hoặc hợp đồng ${code}.` : uiError.message,
      };
    } finally {
      setResolving(false);
    }
  };

  return { resolve, resolving };
}
