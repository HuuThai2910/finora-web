import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import { StatusPill } from '@/components/StatusPill';
import { toUiApiError } from '@/lib/api/errors';
import { useGetAdminTradeQuery } from '../api/orderBookApi';
import { AuditDrawer } from '../components/trade/AuditDrawer';
import { MovedNotesCard } from '../components/trade/MovedNotesCard';
import { TradeInfoCard } from '../components/trade/TradeInfoCard';
import { TradeProgressSlip } from '../components/trade/TradeProgressSlip';
import { LIST_PATH, TRADE_PROGRESS_META, bookPath } from '../constant';
import { useTradeAnchor } from '../hooks/useTradeAnchor';
import { tradeSteps } from '../mappers/tradeSteps';

const DOSSIER = 'grid grid-cols-[minmax(0,1fr)_320px] gap-5 [align-items:start] max-[1180px]:grid-cols-[minmax(0,1fr)]';

/**
 * Chi tiết một lần khớp (`/investments/secondary/:listingId/trades/:tradeReference`): tiêu đề "Chuyển nhượng N phần vốn"
 * và nhãn chặng; bên trái thông tin giao dịch và phần vốn đã chuyển, bên phải tiến trình kèm nút Kiểm toán mở ngăn dữ
 * liệu blockchain. Trang chỉ đọc; không có thao tác gửi lại hay lập lại (hai trường hợp lỗi không hiện trên giao diện).
 */
export default function TradeDetailPage() {
  const params = useParams();
  const tradeReference = params.tradeReference ?? '';
  const listingId = Number(params.listingId);
  const detail = useGetAdminTradeQuery(tradeReference, { skip: !tradeReference });
  const trade = detail.data;
  const { anchor, proof } = useTradeAnchor(trade);
  const [auditOpen, setAuditOpen] = useState(false);
  const backUrl = Number.isInteger(listingId) && listingId > 0 ? bookPath(listingId) : LIST_PATH;

  if (!tradeReference || toUiApiError(detail.error).status === 404) {
    return (
      <section className="ui-page">
        <div className="ui-card ui-empty">
          Không tìm thấy giao dịch này. <Link className="ui-link" to={backUrl}>Về sổ lệnh</Link>
        </div>
      </section>
    );
  }
  if (detail.error) {
    return (
      <section className="ui-page">
        <ErrorNotice error={detail.error} onRetry={detail.refetch} />
        <Link className="ui-link" to={backUrl}>Về sổ lệnh</Link>
      </section>
    );
  }
  if (!trade) {
    return (
      <section className="ui-page" aria-busy="true">
        <span className="ui-skeleton block h-5.5 w-80 max-w-full" />
        <div className="ui-card ui-empty">Đang tải giao dịch...</div>
      </section>
    );
  }

  const meta = TRADE_PROGRESS_META[trade.progress] ?? { label: trade.progress, tone: 'neutral' as const };

  return (
    <section className="ui-page">
      <header className="ui-title">
        <div className="flex flex-wrap items-center gap-2">
          <h1>Chuyển nhượng {trade.quantity} phần vốn</h1>
          <StatusPill tone={meta.tone} dot>{meta.label}</StatusPill>
        </div>
      </header>

      <div className={detail.isFetching ? `${DOSSIER} ui-busy` : DOSSIER}>
        <div className="grid min-w-0 gap-4">
          <TradeInfoCard trade={trade} />
          <MovedNotesCard tradeReference={trade.tradeReference} />
        </div>
        <TradeProgressSlip
          steps={tradeSteps(trade, anchor)}
          tradeReference={trade.tradeReference}
          onAudit={proof ? () => setAuditOpen(true) : undefined}
        />
      </div>

      {auditOpen && proof && (
        <AuditDrawer proof={proof} documentNumber={trade.documentNumber} onClose={() => setAuditOpen(false)} />
      )}
    </section>
  );
}
