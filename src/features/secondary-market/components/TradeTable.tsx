import { StatusPill } from '@/components/StatusPill';
import { useActorNames } from '@/features/loan';
import { formatDateTime } from '@/utils';
import { SETTLEMENT_LABEL, SETTLEMENT_TONE, settlementErrorLabel } from '../constant';
import { formatMoneyVnd, formatPrice } from '../formatters';
import type { AdminTrade } from '../types';
import { ERROR_LINE, LOAN_CELL, LOAN_LINK, MARKET_TABLE } from '../styles';
import { PartiesCell } from './PartiesCell';
import { TradeActions } from './TradeActions';
import { TransferDocumentCell } from './TransferDocumentCell';

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
  return <span className={trade.settlementStatus === 'FAILED' ? `sm-err ${ERROR_LINE}` : 'ui-sub'}>{text}</span>;
}

/**
 * Các lần khớp: ai mua của ai, bao nhiêu Note ở giá nào, tiền và phí, và tiền đã chuyển chưa. Lần
 * khớp lỗi hiện lỗi và số lần thử để quản trị đối soát với sổ của dịch vụ thanh toán. Lần khớp
 * đã thanh toán có giấy xác nhận chuyển nhượng (PDF ký số) ở cột cuối.
 *
 * Hai bên gộp một ô, số Note và phí là dòng phụ của số tiền: bảng vừa 1440px mà vẫn thấy cột Thanh toán và
 * Giấy xác nhận, hai cột quản trị cần đối soát.
 */
export function TradeTable({ trades, onOpenBook }: Props) {
  // Tên tra theo đúng mã của hai bên (họ tên, không có thì email); Investment Service không lưu dữ liệu cá nhân.
  const { displayName } = useActorNames(trades.flatMap((trade) => [trade.buyerId, trade.sellerId]));

  return (
    <div className="ui-table-wrap">
      <table className={`ui-table list sm-table ${MARKET_TABLE}`}>
        <thead>
          <tr>
            <th>Mã khớp</th>
            <th>Khoản vay</th>
            <th>Hai bên</th>
            <th className="num">Giá</th>
            <th className="num">Số tiền</th>
            <th>Thanh toán</th>
            <th>Giấy xác nhận</th>
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
                <span className={`sm-loan ${LOAN_CELL}`}>
                  <button
                    type="button"
                    className={`sm-link ${LOAN_LINK}`}
                    aria-label={`Xem sổ lệnh ${trade.loanId != null ? `khoản vay #${trade.loanId}` : `đợt #${trade.listingId}`}`}
                    onClick={() => onOpenBook(trade.listingId)}
                  >
                    {trade.loanId != null ? `#${trade.loanId}` : `Đợt #${trade.listingId}`}
                  </button>
                  {trade.defaulted && <StatusPill tone="danger" small>Nợ xấu</StatusPill>}
                </span>
                <span className="ui-sub">{trade.aggressorSide === 'BID' ? 'Bên mua chủ động' : 'Bên bán chủ động'}</span>
              </td>
              <PartiesCell buyerId={trade.buyerId} sellerId={trade.sellerId} nameOf={displayName} />
              <td className="num">{formatPrice(trade.pricePercent)}</td>
              <td className="num">
                <span className="strong">{formatMoneyVnd(trade.amount)}</span>
                <span className="ui-sub">{trade.quantity} phần vốn, phí {formatMoneyVnd(trade.platformFee)}</span>
              </td>
              <td className="sm-st min-w-42.5 max-w-55 whitespace-normal">
                <StatusPill tone={SETTLEMENT_TONE[trade.settlementStatus]}>{SETTLEMENT_LABEL[trade.settlementStatus]}</StatusPill>
                <SettlementDetail trade={trade} />
                {trade.settlementRequeuedAt && (
                  <span className="ui-sub">Đã gửi lại {trade.settlementRequeueCount} lần, gần nhất {formatDateTime(trade.settlementRequeuedAt)}</span>
                )}
                <TradeActions trade={trade} />
              </td>
              {/* Giấy xác nhận chuyển nhượng: nút tải PDF và liên kết bằng chứng nằm cùng hàng, được xuống dòng. */}
              <td className="sm-doc min-w-42.5 max-w-60 whitespace-normal"><TransferDocumentCell tradeReference={trade.tradeReference} settled={trade.settlementStatus === 'SETTLED'} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
