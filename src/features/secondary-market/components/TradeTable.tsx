import { StatusPill } from '@/components/StatusPill';
import { useInvestorNames } from '@/features/investment';
import { formatDateTime } from '@/utils';
import { SETTLEMENT_LABEL, SETTLEMENT_TONE, settlementErrorLabel } from '../constant';
import { formatMoneyVnd, formatPrice } from '../formatters';
import type { AdminTrade } from '../types';

interface Props {
  trades: AdminTrade[];
  onOpenBook: (listingId: number) => void;
}

/** Dòng phụ dưới nhãn thanh toán: lúc đã chuyển, hoặc số lần thử và lỗi gần nhất để đối soát. */
function SettlementDetail({ trade }: { trade: AdminTrade }) {
  if (trade.settlementStatus === 'SETTLED') {
    return <span className="ui-sub">{formatDateTime(trade.settledAt)}</span>;
  }
  if (trade.settlementAttempts === 0) {
    return <span className="ui-sub">Chưa gửi thanh toán</span>;
  }
  const text = `${trade.settlementAttempts} lần thử${trade.lastSettlementError ? `, ${settlementErrorLabel(trade.lastSettlementError)}` : ''}`;
  return <span className={trade.settlementStatus === 'FAILED' ? 'sm-err' : 'ui-sub'}>{text}</span>;
}

/**
 * Các lần khớp: ai mua của ai, bao nhiêu Note ở giá nào, tiền và phí, và tiền đã chuyển chưa. Lần
 * khớp lỗi hiện mã lỗi và số lần thử để quản trị đối soát với sổ của dịch vụ thanh toán.
 */
export function TradeTable({ trades, onOpenBook }: Props) {
  // Tên lấy từ finora-user rồi ghép ở đây; Investment Service không lưu dữ liệu cá nhân.
  const { names } = useInvestorNames(trades.flatMap((trade) => [trade.buyerId, trade.sellerId]));
  // Chưa tra được tên (đang tải hoặc tài khoản không có họ tên) thì chỉ hiện mã người dùng.
  const person = (id: string) => (names[id] ? (
    <>
      {names[id]}
      <span className="ui-sub ui-mono">{id}</span>
    </>
  ) : <span className="ui-mono">{id}</span>);

  return (
    <div className="ui-table-wrap">
      <table className="ui-table list sm-table">
        <thead>
          <tr>
            <th>Mã khớp</th>
            <th>Khoản vay</th>
            <th>Bên mua</th>
            <th>Bên bán</th>
            <th className="num">Giá</th>
            <th className="num">Số Note</th>
            <th className="num">Số tiền</th>
            <th className="num">Phí</th>
            <th>Thanh toán</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <tr key={trade.tradeReference}>
              <td>
                <span className="ui-mono">{trade.tradeReference}</span>
                <span className="ui-sub">{formatDateTime(trade.executedAt)}</span>
              </td>
              <td>
                <span className="sm-loan">
                  <button
                    type="button"
                    className="sm-link"
                    aria-label={`Xem sổ lệnh ${trade.loanId != null ? `khoản vay #${trade.loanId}` : `đợt #${trade.listingId}`}`}
                    onClick={() => onOpenBook(trade.listingId)}
                  >
                    {trade.loanId != null ? `#${trade.loanId}` : `Đợt #${trade.listingId}`}
                  </button>
                  {trade.defaulted && <StatusPill tone="danger" small>Nợ xấu</StatusPill>}
                </span>
                <span className="ui-sub">{trade.aggressorSide === 'BID' ? 'Bên mua chủ động' : 'Bên bán chủ động'}</span>
              </td>
              <td>{person(trade.buyerId)}</td>
              <td>{person(trade.sellerId)}</td>
              <td className="num">{formatPrice(trade.pricePercent)}</td>
              <td className="num">{trade.quantity}</td>
              <td className="num">
                <span className="strong">{formatMoneyVnd(trade.amount)}</span>
                <span className="ui-sub">bán nhận {formatMoneyVnd(trade.sellerProceeds)}</span>
              </td>
              <td className="num">{formatMoneyVnd(trade.platformFee)}</td>
              <td className="sm-st">
                <StatusPill tone={SETTLEMENT_TONE[trade.settlementStatus]}>{SETTLEMENT_LABEL[trade.settlementStatus]}</StatusPill>
                <SettlementDetail trade={trade} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
