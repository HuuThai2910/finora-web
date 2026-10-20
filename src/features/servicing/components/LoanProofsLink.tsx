import { Link } from 'react-router-dom';

/**
 * Lối sang trang Bằng chứng blockchain lọc theo hồ sơ vay (W3D): xem các mốc hợp đồng, giải ngân, trả nợ, Note của
 * hồ sơ đã được neo lên sổ cái chưa khi đang xử lý sự cố của hồ sơ đó. Proof tra theo ID số `loanApplicationId`.
 */
export function LoanProofsLink({ loanApplicationId }: { loanApplicationId: number }) {
  return (
    <Link
      className="ui-link"
      to={`/blockchain/proofs?referenceType=LOAN_APPLICATION&referenceId=${loanApplicationId}`}
      aria-label={`Bằng chứng blockchain của hồ sơ #${loanApplicationId}`}
    >
      Bằng chứng
    </Link>
  );
}
