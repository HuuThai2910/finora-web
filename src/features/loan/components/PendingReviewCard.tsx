import { Icon } from '@/components/Icon';
import { ErrorNotice } from '@/components/ErrorNotice';
import { formatMoney, formatPercent } from '../formatters';
import { daysSince, formatCompactDateTime } from '../mappers/applicationListDisplay';
import type { PendingReviewSummary } from '../hooks/usePendingReviewSummary';

interface PendingReviewCardProps {
  summary: PendingReviewSummary | null;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}

const SCORE_FORMAT = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

const ROW_LABELS = ['Tổng số tiền đề nghị', 'Xác suất vỡ nợ bình quân', 'Điểm bình quân', 'Chưa chấm được điểm', 'Chờ lâu nhất'];

/**
 * Thẻ gọn "Đang chờ thẩm định" cạnh biểu đồ 30 ngày (mockup loans.html): các dòng nhãn, giá trị.
 * Số liệu tính ở `usePendingReviewSummary`; khi hàng chờ dài hơn mẫu thì ghi rõ phạm vi.
 */
export function PendingReviewCard({ summary, isLoading, error, onRetry }: PendingReviewCardProps) {
  return (
    <section className="ui-card loan-top-card" aria-labelledby="loanPendingTitle">
      <div className="ui-card-head">
        <h2 id="loanPendingTitle">
          <span className="ui-ico"><Icon name="clock" /></span>
          Đang chờ thẩm định
        </h2>
        {summary && <span className="ui-tag">{summary.total} hồ sơ</span>}
      </div>

      {error ? (
        <div className="loan-top-body"><ErrorNotice error={error} onRetry={onRetry} /></div>
      ) : isLoading || !summary ? (
        <dl className="ui-rows loan-pending-rows" aria-busy="true">
          {ROW_LABELS.map((label) => (
            <div key={label}><dt>{label}</dt><dd><span className="ui-skeleton loan-skel-value" /></dd></div>
          ))}
        </dl>
      ) : summary.total === 0 ? (
        <p className="loan-top-empty">Không còn hồ sơ nào chờ thẩm định.</p>
      ) : (
        <>
          <dl className="ui-rows loan-pending-rows">
            <div><dt>Tổng số tiền đề nghị</dt><dd>{formatMoney(summary.requestedAmount)}</dd></div>
            <div><dt>Xác suất vỡ nợ bình quân</dt><dd>{formatPercent(summary.averagePd, true)}</dd></div>
            <div>
              <dt>Điểm bình quân</dt>
              <dd>{summary.averageScore == null ? '-' : `${SCORE_FORMAT.format(summary.averageScore)} / 100`}</dd>
            </div>
            <div>
              <dt>Chưa chấm được điểm</dt>
              <dd className={summary.unscored > 0 ? 'bad' : undefined}>
                {summary.unscored > 0 && <Icon name="alert" />}
                {summary.unscored} hồ sơ
              </dd>
            </div>
            <div>
              <dt><Icon name="clock" />Chờ lâu nhất</dt>
              <dd>
                {summary.oldest
                  ? `${daysSince(summary.oldest.submittedAt)} ngày, từ ${formatCompactDateTime(summary.oldest.submittedAt)}`
                  : '-'}
              </dd>
            </div>
          </dl>
          {summary.sampled < summary.total && (
            <p className="loan-pending-note">
              Tổng tiền, xác suất vỡ nợ và điểm tính trên {summary.sampled} hồ sơ mới nhất trong {summary.total} hồ sơ đang chờ.
            </p>
          )}
        </>
      )}
    </section>
  );
}
