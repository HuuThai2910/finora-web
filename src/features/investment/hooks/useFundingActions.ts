import { useState } from 'react';
import {
  useActivateNotesMutation,
  useApproveListingMutation,
  useCloseExpiredListingsMutation,
  useFinalizeCommitmentsMutation,
} from '../api/investmentApi';
import type { ApproveListingRequest, MarketListing } from '../types';
import { formatNumber } from '@/utils';

export type FundingActionKind = 'approve' | 'finalize' | 'activate' | 'close';

/**
 * Bốn thao tác quản trị trên trang chi tiết một khoản gọi vốn.
 *
 * Chỉ một thao tác chạy tại một thời điểm (`busy`), để không bấm chồng hai bước của cùng
 * khoản. Lỗi giữ theo đúng thao tác gây ra để hiện ngay dưới nút đó; thành công trả câu
 * thông báo cho trang hiện toast. Cache được làm mới bằng tag trong API slice, trang không
 * phải tự tải lại.
 */
export function useFundingActions(listing: MarketListing | undefined, onSuccess: (message: string) => void) {
  const [approve] = useApproveListingMutation();
  const [finalize] = useFinalizeCommitmentsMutation();
  const [activate] = useActivateNotesMutation();
  const [closeExpired] = useCloseExpiredListingsMutation();
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
    approve: (body: ApproveListingRequest) =>
      listing &&
      run('approve', async () => {
        await approve({ listingId: listing.listingId, body }).unwrap();
        return `Đã duyệt khoản vay #${listing.loanId} lên sàn. Nhà đầu tư có thể đặt lệnh từ bây giờ.`;
      }),
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
    closeExpired: () =>
      run('close', async () => {
        const { closedCount } = await closeExpired().unwrap();
        return closedCount === 0
          ? 'Không có khoản nào quá hạn gọi vốn.'
          : `Đã đóng ${closedCount} khoản quá hạn, tiền giữ chỗ đã trả về ví nhà đầu tư.`;
      }),
  };
}
