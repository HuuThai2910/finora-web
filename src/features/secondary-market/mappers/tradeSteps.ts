import { formatDateTime } from '@/utils';
import type { AdminTrade } from '../types';

export type StepState = 'done' | 'current' | 'todo';

export interface TradeStep {
  name: string;
  state: StepState;
  /** Mốc giờ hoặc câu ngắn dưới tên bước; null là không ghi gì. */
  lines: string[];
}

/**
 * Bằng chứng blockchain của giấy xác nhận: `confirmed` khi sổ cái đã xác nhận (có giờ), `pending` khi đang ghi,
 * `unknown` khi tài khoản không có quyền xem bằng chứng (không biết giờ neo).
 */
export type AnchorState = { kind: 'confirmed'; at: string | null } | { kind: 'pending' } | { kind: 'unknown' };

/**
 * Bốn bước của một lần khớp, mốc giờ chỉ ghi ở đây: Khớp lệnh (phần vốn đổi chủ ngay) → Thanh toán (Payment chuyển
 * tiền đã giữ của bên mua sang bên bán, trừ phí) → Lập giấy xác nhận (FINORA đóng dấu số) → Lưu bằng chứng (neo mã băm
 * lên blockchain). Thanh toán hay lập giấy lỗi vẫn hiện là đang chờ: thực tế không xảy ra và hệ thống tự gửi lại.
 */
export function tradeSteps(trade: AdminTrade, anchor: AnchorState): TradeStep[] {
  const settled = trade.settlementStatus === 'SETTLED';
  const issued = trade.documentStatus === 'ISSUED';
  const anchorStep: TradeStep = !issued
    ? { name: 'Lưu bằng chứng', state: 'todo', lines: [] }
    : anchor.kind === 'pending'
      ? { name: 'Lưu bằng chứng', state: 'current', lines: ['đang ghi lên sổ cái'] }
      : { name: 'Lưu bằng chứng', state: 'done', lines: anchor.kind === 'confirmed' && anchor.at ? [formatDateTime(anchor.at)] : [] };

  return [
    { name: 'Khớp lệnh', state: 'done', lines: [formatDateTime(trade.executedAt), 'phần vốn đã sang bên mua'] },
    settled
      ? { name: 'Thanh toán', state: 'done', lines: trade.settledAt ? [formatDateTime(trade.settledAt)] : [] }
      : { name: 'Thanh toán', state: 'current', lines: ['đang chờ dịch vụ thanh toán chuyển tiền'] },
    issued
      ? { name: 'Lập giấy xác nhận', state: 'done', lines: trade.documentIssuedAt ? [formatDateTime(trade.documentIssuedAt)] : [] }
      : settled
        ? { name: 'Lập giấy xác nhận', state: 'current', lines: ['đang đóng dấu số'] }
        : { name: 'Lập giấy xác nhận', state: 'todo', lines: ['sau khi thanh toán xong'] },
    anchorStep,
  ];
}
