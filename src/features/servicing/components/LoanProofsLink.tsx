import { Link } from 'react-router-dom';
import { usePermission } from '@/features/auth';

/**
 * Lối sang trang xác minh dữ liệu lọc theo hồ sơ vay (W3D): xem các mốc hợp đồng, giải ngân, trả nợ, Note của
 * hồ sơ đã được neo lên sổ cái chưa khi đang xử lý sự cố của hồ sơ đó. Proof tra theo ID số `loanApplicationId`.
 * Ẩn khi tài khoản không có quyền Xem "Bằng chứng blockchain".
 */
export function LoanProofsLink({ loanApplicationId, separated = false }: { loanApplicationId: number; separated?: boolean }) {
  if (!usePermission().canView('blockchain')) return null;
  return (
    <>
      {separated && ' · '}
      <Link
        className="ui-link"
        to={`/blockchain/proofs?referenceType=LOAN_APPLICATION&referenceId=${loanApplicationId}`}
        aria-label={`Xác minh dữ liệu của hồ sơ #${loanApplicationId}`}
      >
        Xác minh
      </Link>
    </>
  );
}
