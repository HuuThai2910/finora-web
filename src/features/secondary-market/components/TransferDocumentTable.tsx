import { useActorNames } from '@/features/loan';
import { formatDateTime } from '@/utils';
import { formatMoneyVnd } from '../formatters';
import { LOAN_CELL, LOAN_LINK, MARKET_TABLE } from '../styles';
import type { TransferDocument } from '../types';
import { PartiesCell } from './PartiesCell';
import { TransferDocumentCell } from './TransferDocumentCell';

interface Props {
  documents: TransferDocument[];
  onOpenBook: (listingId: number) => void;
}

/**
 * Giấy xác nhận chuyển nhượng đang lỗi hoặc đang lập (`GET /investments/admin/transfer-documents?status=`). Cột cuối
 * dùng lại ô của bảng giao dịch với văn bản có sẵn từ danh sách, nên văn bản lỗi có nút "Thử lại" ngay tại dòng.
 */
export function TransferDocumentTable({ documents, onOpenBook }: Props) {
  const { displayName } = useActorNames(documents.flatMap((doc) => [doc.buyerId, doc.sellerId]));

  return (
    <div className="ui-table-wrap">
      <table className={`ui-table list sm-table sm-doc-table ${MARKET_TABLE}`}>
        <thead>
          <tr>
            <th>Số văn bản</th>
            <th>Khoản vay</th>
            <th>Hai bên</th>
            <th className="num">Số tiền</th>
            <th>Giấy xác nhận</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.tradeReference}>
              <td>
                <span className="ui-mono">{doc.documentNumber}</span>
                <span className="ui-sub">Khớp {formatDateTime(doc.executedAt)}</span>
              </td>
              <td>
                <span className={`sm-loan ${LOAN_CELL}`}>
                  <button
                    type="button"
                    className={`sm-link ${LOAN_LINK}`}
                    aria-label={`Xem sổ lệnh khoản vay #${doc.loanApplicationId}`}
                    onClick={() => onOpenBook(doc.listingId)}
                  >
                    #{doc.loanApplicationId}
                  </button>
                </span>
                <span className="ui-sub ui-mono">Đợt #{doc.listingId}</span>
              </td>
              <PartiesCell buyerId={doc.buyerId} sellerId={doc.sellerId} nameOf={displayName} />
              <td className="num">
                <span className="strong">{formatMoneyVnd(doc.amount)}</span>
                <span className="ui-sub">{doc.quantity} phần vốn</span>
              </td>
              <td className="sm-doc min-w-42.5 max-w-70 whitespace-normal">
                <TransferDocumentCell tradeReference={doc.tradeReference} settled doc={doc} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
