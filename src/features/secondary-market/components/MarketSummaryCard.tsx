import { Icon } from '@/components/Icon';
import { ErrorNotice } from '@/components/ErrorNotice';
import { EMPTY, formatNumber } from '@/utils';
import { FEE_RATE_PERCENT } from '../constant';
import { formatMoneyVnd } from '../formatters';
import type { OrderBookAdminSummary, SettlementStatus } from '../types';

interface Props {
  summary: OrderBookAdminSummary | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  /** Bấm ô thanh toán để mở thẳng danh sách giao dịch lọc theo trạng thái đó. */
  onShowTrades: (status: SettlementStatus) => void;
  /** Số giấy xác nhận chuyển nhượng lập lỗi (toàn chợ); chưa tải được thì `undefined` và không hiện dòng. */
  failedDocuments?: number;
  /** Mở danh sách giấy xác nhận lỗi. */
  onShowFailedDocuments: () => void;
}

/*
 * Một ô số liệu (`sm-fig`). Vạch dọc ngăn các ô; dưới 1180px thành lưới 2x2 (ô 3 bỏ vạch dọc, hàng dưới có vạch
 * trên), dưới 520px một cột (mọi ô sau ô đầu chỉ có vạch trên).
 */
const FIG_BORDERS =
  'not-first:border-l not-first:border-l-divider ' +
  'max-[1180px]:nth-3:[border-left:0] max-[1180px]:nth-[n+3]:border-t max-[1180px]:nth-[n+3]:border-t-divider ' +
  'max-[520px]:not-first:[border-left:0] max-[520px]:not-first:border-t max-[520px]:not-first:border-t-divider';
const FIG_BODY = 'sm-fig flex flex-col items-start gap-0.5 min-w-0 py-3.5 px-4.5 text-left';
const FIG = `${FIG_BODY} ${FIG_BORDERS}`;
/** Phần bấm được của ô (mở danh sách giao dịch): nền nhạt khi rê chuột, viền focus vẽ vào trong ô. */
const FIG_PRESS =
  'transition-[background] duration-150 ease-soft hover:bg-surface-muted hover:[&_.lbl_svg]:text-brand ' +
  'focus-visible:outline-2 focus-visible:outline-brand focus-visible:-outline-offset-2';
const FIG_BUTTON = `${FIG} ${FIG_PRESS}`;
/**
 * Ô "Cần đối soát" có thêm dòng giấy xác nhận lỗi: hai nút không lồng nhau được, nên viền ô nằm ở lớp bọc
 * (`sm-fig-cell`), nút số liệu (vẫn là `button.sm-fig`) và nút giấy xác nhận nằm trong.
 */
const FIG_CELL = `sm-fig-cell flex flex-col min-w-0 ${FIG_BORDERS}`;
const FIG_INNER = `${FIG_BODY} ${FIG_PRESS} flex-1 w-full`;
const DOC_LINE =
  'sm-doc-fails self-start -mt-2.5 mx-4.5 mb-3 text-danger text-[12px] tabular-nums underline underline-offset-2 ' +
  'rounded-sm hover:decoration-2 focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-1';
const FIG_LABEL = 'lbl inline-flex items-center gap-1 text-secondary text-[13px] [&_svg]:size-3.5 [&_svg]:text-muted';
/** Con số chính và dòng gợi ý; ô "Cần đối soát" có lần khớp lỗi (`is-danger`) thì chuyển đỏ. */
const FIG_VALUE =
  'val text-primary text-[22px] font-semibold leading-[1.3] tabular-nums whitespace-nowrap in-[.sm-fig.is-danger]:text-danger';
const FIG_UNIT = 'ml-1 text-muted text-[13px] font-normal';
const FIG_HINT = 'hint min-h-4.5 text-muted text-[12px] tabular-nums in-[.sm-fig.is-danger]:text-danger';

/** Icon "i" của dòng quy tắc; Icon dùng chung chưa có hình này. */
function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}

/**
 * Bốn số liệu trong một thẻ, tính trên toàn chợ (API summary), không phải trang đang xem.
 *
 * Hai ô về thanh toán là nút: "Cần đối soát" lớn hơn 0 nghĩa là dịch vụ thanh toán đã từ chối một lần
 * khớp, việc duy nhất trên trang này mà quản trị phải ra tay, nên bấm vào là tới đúng danh sách.
 */
export function MarketSummaryCard({
  summary, isLoading, error, onRetry, onShowTrades, failedDocuments, onShowFailedDocuments,
}: Props) {
  const failed = summary?.failedCount ?? 0;
  const value = (text: string) => (summary ? text : isLoading ? '...' : EMPTY);

  return (
    <section className="ui-card sm-card overflow-hidden" aria-label="Số liệu toàn chợ">
      {error ? (
        <div className="sm-card-error py-3.5 px-4.5"><ErrorNotice error={error} onRetry={onRetry} /></div>
      ) : (
        <div
          className="sm-figs grid grid-cols-4 max-[1180px]:grid-cols-2 max-[520px]:grid-cols-[minmax(0,1fr)]"
          aria-busy={isLoading}
        >
          <div className={FIG}>
            <span className={FIG_LABEL}>Phí đã thu</span>
            <b className={FIG_VALUE}>{value(formatMoneyVnd(summary?.feeCollected))}</b>
            <span className={FIG_HINT}>
              {summary ? `${formatNumber(summary.settledCount)} lần khớp, ${formatMoneyVnd(summary.settledAmount)} đã chuyển` : ' '}
            </span>
          </div>
          <button type="button" className={FIG_BUTTON} onClick={() => onShowTrades('PENDING')}>
            <span className={FIG_LABEL}>Chờ thanh toán <Icon name="chevronRight" /></span>
            <b className={FIG_VALUE}>
              {value(formatNumber(summary?.pendingCount))}
              {summary && <small className={FIG_UNIT}>lần khớp</small>}
            </b>
            <span className={FIG_HINT}>{summary ? `${formatMoneyVnd(summary.pendingAmount)} đang giữ chờ chuyển` : ' '}</span>
          </button>
          <div className={FIG_CELL}>
            <button
              type="button"
              className={failed > 0 ? `${FIG_INNER} is-danger` : FIG_INNER}
              onClick={() => onShowTrades('FAILED')}
            >
              <span className={FIG_LABEL}>Cần đối soát <Icon name="chevronRight" /></span>
              <b className={FIG_VALUE}>
                {value(formatNumber(summary?.failedCount))}
                {summary && <small className={FIG_UNIT}>lần khớp</small>}
              </b>
              <span className={FIG_HINT}>
                {!summary ? ' ' : failed > 0 ? 'Thanh toán bị từ chối, Note đã đổi chủ' : 'Không có lần khớp lỗi'}
              </span>
            </button>
            {/* Giấy xác nhận lập lỗi cũng là việc phải đối soát (bấm "Thử lại"), nên đếm chung ô này. */}
            {failedDocuments != null && failedDocuments > 0 && (
              <button type="button" className={DOC_LINE} onClick={onShowFailedDocuments}>
                {formatNumber(failedDocuments)} giấy xác nhận lỗi
              </button>
            )}
          </div>
          <div className={FIG}>
            <span className={FIG_LABEL}>Đang chờ khớp</span>
            <b className={FIG_VALUE}>
              {value(`${formatNumber(summary?.openBidNotes)} mua, ${formatNumber(summary?.openAskNotes)} bán`)}
            </b>
            <span className={FIG_HINT}>
              {summary ? `Note trong ${formatNumber(summary.openBidOrders + summary.openAskOrders)} lệnh đang nằm trong sổ` : ' '}
            </span>
          </div>
        </div>
      )}
      <p
        className="sm-rule flex items-start gap-2 py-2.5 px-4.5 border-t border-t-divider bg-surface-muted text-secondary text-[13px] [&_svg]:flex-none [&_svg]:size-4 [&_svg]:mt-0.5 [&_svg]:text-muted"
      >
        <InfoIcon />
        <span>
          Nhà đầu tư đặt lệnh giới hạn theo % dư nợ gốc còn lại, hệ thống khớp ngay khi giá mua gặp giá bán.
          Nền tảng thu <b className="text-primary font-semibold">{FEE_RATE_PERCENT}%</b> trên tiền bán, trừ vào tiền người bán nhận. Trang này chỉ để
          theo dõi và đối soát.
        </span>
      </p>
    </section>
  );
}
