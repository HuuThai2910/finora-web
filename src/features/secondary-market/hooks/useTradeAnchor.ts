import { usePermission } from '@/features/auth';
import { useSearchProofsQuery, type Proof } from '@/features/blockchain';
import type { AnchorState } from '../mappers/tradeSteps';
import type { AdminTrade } from '../types';

/**
 * Bằng chứng blockchain của giấy xác nhận một lần khớp (`referenceType=NOTE_TRANSFER_DOCUMENT`, `referenceId` = mã lần
 * khớp), cho bước "Lưu bằng chứng" và ngăn Kiểm toán.
 *
 * Chỉ tra khi giấy đã phát hành (trước đó chưa có gì để neo) và tài khoản có quyền Xem "Bằng chứng blockchain"; thiếu
 * quyền thì `unknown`: bước được coi là đã gửi neo nhưng không có giờ, và không có nút Kiểm toán.
 *
 * @returns `anchor` cho bước tiến trình và `proof` khi sổ cái đã xác nhận (mở được ngăn Kiểm toán)
 */
export function useTradeAnchor(trade: AdminTrade | undefined) {
  const canView = usePermission().canView('blockchain');
  const issued = trade?.documentStatus === 'ISSUED';
  const proofs = useSearchProofsQuery(
    { referenceType: 'NOTE_TRANSFER_DOCUMENT', referenceId: trade?.tradeReference ?? '', page: 0, size: 5 },
    { skip: !trade || !issued || !canView },
  );
  const proof: Proof | undefined = proofs.data?.content.find((item) => item.proofType === 'NOTE_TRANSFER_DOCUMENT');

  let anchor: AnchorState;
  if (!canView || proofs.isError) anchor = { kind: 'unknown' };
  else if (proof?.status === 'CONFIRMED') anchor = { kind: 'confirmed', at: proof.receipt?.confirmedAt ?? proof.updatedAt };
  else anchor = { kind: 'pending' };

  return { anchor, proof: proof?.status === 'CONFIRMED' ? proof : undefined };
}
