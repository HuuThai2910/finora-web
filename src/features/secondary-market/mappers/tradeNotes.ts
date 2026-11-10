import { formatPrice } from '../formatters';
import type { TradeNoteOwnership } from '../types';

/**
 * Tình trạng hiện nay của một phần vốn so với lần khớp đang xem: đã bán tiếp (lần chuyển ngay sau lần này), bên mua
 * đang rao bán lại, đã tất toán, hoặc bên mua vẫn đang nắm giữ.
 */
export function currentStatus(note: TradeNoteOwnership, tradeReference: string): string {
  // Lịch sử mới nhất trước: lần chuyển đứng ngay trước lần này trong mảng là lần bán tiếp của bên mua.
  const index = note.transfers.findIndex((item) => item.tradeReference === tradeReference);
  if (index > 0) return `Đã bán tiếp cho ${note.transfers[index - 1].buyerName ?? 'nhà đầu tư khác'}`;
  if (note.status === 'CLOSED') return 'Đã tất toán';
  if (note.askPricePercent != null) return `Bên mua đang rao bán lại, giá ${formatPrice(note.askPricePercent)}`;
  return 'Bên mua đang nắm giữ';
}
