import { useState } from 'react';
import { useActivateNotesMutation, useFinalizeCommitmentsMutation } from '../api/investmentApi';
import type { MarketListing } from '../types';
import { formatNumber } from '@/utils';

export type FundingActionKind = 'finalize' | 'activate';

/**
 * Hai thao tác sửa lỗi trên trang chi tiết một khoản gọi vốn. Khóa vốn và phát hành Note chạy tự động khi Loan xác
 * nhận giải ngân; hai nút này chỉ dùng khi bước tự động không chạy, backend từ chối nếu chưa giải ngân. Đóng khoản quá
 * hạn có hộp xác nhận riêng (`CloseExpiredDialog`).
 *
 * Chỉ một thao tác chạy tại một thời điểm (`busy`), để không bấm chồng hai bước của cùng
 * khoản. Lỗi giữ theo đúng thao tác gây ra để hiện ngay dưới nút đó; thành công trả câu
 * thông báo cho trang hiện toast. Cache được làm mới bằng tag trong API slice, trang không
 * phải tự tải lại.
 */
export function useFundingActions(listing: MarketListing | undefined, onSuccess: (message: string) => void) {
  const [finalize] = useFinalizeCommitmentsMutation();
  const [activate] = useActivateNotesMutation();
  const [busy, setBusy] = useState<FundingActionKind | null>(null);
  const [failure, setFailure] = useState<{ kind: FundingActionKind; error: unknown } | null>(null);

  const run = async (kind: FundingActionKind, action: () => Promise<string>) => {
    if (busy) return;
    setBusy(kind);
    setFailure(null);
    try {
      onSuccess(await action());
    } catch (error) {
      setFailure({ kind, error });
    } finally {
      setBusy(null);
    }
  };

  return {
    busy,
    errorOf: (kind: FundingActionKind) => (failure?.kind === kind ? failure.error : undefined),
    finalize: () =>
      listing &&
      run('finalize', async () => {
        const { finalizedCount } = await finalize(listing.listingId).unwrap();
        return finalizedCount === 0
          ? 'Mọi phần vốn đã được khóa từ trước, không có gì thay đổi.'
          : `Đã khóa ${finalizedCount} phần vốn. Bước tiếp: phát hành Note.`;
      }),
    activate: () =>
      listing &&
      run('activate', async () => {
        const { issuedNoteCount } = await activate(listing.listingId).unwrap();
        return issuedNoteCount === 0
          ? 'Note đã được phát hành trước đó, không tạo thêm.'
          : `Đã phát hành ${formatNumber(issuedNoteCount)} Note.`;
      }),
  };
}
