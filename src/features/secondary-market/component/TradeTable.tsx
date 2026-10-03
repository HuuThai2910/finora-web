import { formatDateTime } from '@/utils';
import { useInvestorNames } from '@/features/investment';
import { SETTLEMENT_LABEL, SETTLEMENT_TONE, settlementErrorLabel } from '../constant';
import { formatMoney, formatPrice } from '../formatters';
import type { AdminTrade } from '../types';

interface Props {
  trades: AdminTrade[];
  isFiltered: boolean;
}

/**
 * Các lần khớp: ai mua của ai, bao nhiêu Note ở giá nào, tiền và phí, và Payment đã chuyển tiền
 * chưa. Lần khớp lỗi hiện mã lỗi và số lần thử để quản trị đối soát với sổ của Payment.
 */
export function TradeTable({ trades, isFiltered }: Props) {
  // Tên lấy từ finora-user và ghép ở đây; Investment Service không lưu dữ liệu cá nhân.
  const { names } = useInvestorNames(trades.flatMap((trade) => [trade.buyerId, trade.sellerId]));
  const nameOf = (id: string) => names[id] ?? id;

  if (trades.length === 0) {
    return (
      <div className="inv-empty">
        {isFiltered ? 'Không có lần khớp nào ở trạng thái này.' : 'Chưa có lần khớp nào trên chợ Notes.'}
      </div>
    );
  }

  return (
    <div className="inv-table-wrap">
      <table className="inv-table sm-table sm-trades">
        <thead>
          <tr>
            <th>Thời điểm</th>
            <th>Khoản vay</th>
            <th>Hai bên</th>
            <th className="inv-num">Khối lượng</th>
            <th className="inv-num">Số tiền</th>
            <th className="inv-num">Phí</th>
            <th className="inv-col-status">Thanh toán</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <tr key={trade.tradeReference} className="inv-row">
              <td className="inv-desc" title={`Mã lần khớp ${trade.tradeReference}`}>
                {formatDateTime(trade.executedAt)}
              </td>
              <td>
                {trade.loanId != null ? `#${trade.loanId}` : `Đợt #${trade.listingId}`}
                {trade.defaulted && <div className="sm-warning-inline">Khoản vay đang nợ xấu</div>}
              </td>
              <td>
                <div className="sm-party-row">
                  <span className="sm-party">Mua</span> {nameOf(trade.buyerId)}
                </div>
                <div className="sm-party-row">
                  <span className="sm-party">Bán</span> {nameOf(trade.sellerId)}
                </div>
              </td>
              <td className="inv-num">
                {trade.quantity} Note
                <div className="inv-desc">giá {formatPrice(trade.pricePercent)}</div>
              </td>
              <td className="inv-num">
                <strong className="inv-num-strong">{formatMoney(trade.amount)} đ</strong>
                <div className="inv-desc">bán nhận {formatMoney(trade.sellerProceeds)} đ</div>
              </td>
              <td className="inv-num">{formatMoney(trade.platformFee)} đ</td>
              <td className="inv-col-status">
                <span className={`inv-status ${SETTLEMENT_TONE[trade.settlementStatus]}`}>
                  {SETTLEMENT_LABEL[trade.settlementStatus]}
                </span>
                {trade.settlementStatus === 'SETTLED' && trade.settledAt && (
                  <div className="inv-desc">{formatDateTime(trade.settledAt)}</div>
                )}
                {trade.settlementStatus !== 'SETTLED' && trade.settlementAttempts > 0 && (
                  <div className="inv-desc">
                    {trade.settlementAttempts} lần thử
                    {trade.lastSettlementError ? `, ${settlementErrorLabel(trade.lastSettlementError)}` : ''}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
