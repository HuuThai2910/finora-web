import { Link, useLocation } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { ErrorNotice } from '@/components/ErrorNotice';
import { fromListState } from '@/lib/navigation';
import { formatMoney, formatPercent, formatScore } from '../formatters';
import { daysSince, formatCompactDateTime } from '../mappers/applicationListDisplay';
import type { PendingReviewSummary } from '../hooks/usePendingReviewSummary';

interface PendingReviewCardProps {
  summary: PendingReviewSummary | null;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}

const ROW_LABELS = ['Tổng số tiền đề nghị', 'Xác suất vỡ nợ bình quân', 'Điểm bình quân', 'Chưa chấm được điểm', 'Chờ lâu nhất'];

const BAD_VALUE =
  'bad inline-flex items-center gap-2 text-danger [&_svg]:size-4.5 [&_svg]:p-0.75 [&_svg]:rounded-[50%] [&_svg]:bg-danger-bg';

/**
 * Thẻ gọn "Đang chờ thẩm định" cạnh biểu đồ 30 ngày (mockup loans.html): các dòng nhãn, giá trị.
 * Số liệu tính ở `usePendingReviewSummary`; khi hàng chờ dài hơn mẫu thì ghi rõ phạm vi.
 */
export function PendingReviewCard({ summary, isLoading, error, onRetry }: PendingReviewCardProps) {
  const location = useLocation();
  return (
    <section className="ui-card loan-top-card py-4 px-4.5" aria-labelledby="loanPendingTitle">
      <div className="ui-card-head flex-nowrap">
        <h2 id="loanPendingTitle">
          <span className="ui-ico"><Icon name="clock" /></span>
          Đang chờ thẩm định
        </h2>
        {summary && <span className="ui-tag">{summary.total} hồ sơ</span>}
      </div>

      {error ? (
        <div className="loan-top-body grid gap-2.5 mt-3"><ErrorNotice error={error} onRetry={onRetry} /></div>
      ) : isLoading || !summary ? (
        <dl className="ui-rows loan-pending-rows mt-2" aria-busy="true">
          {ROW_LABELS.map((label) => (
            <div key={label}><dt>{label}</dt><dd><span className="ui-skeleton loan-skel-value w-27.5 h-3.5" /></dd></div>
          ))}
        </dl>
      ) : summary.total === 0 ? (
        <p className="loan-top-empty mt-2.5 text-secondary text-[13px]">Không còn hồ sơ nào chờ thẩm định.</p>
      ) : (
        <>
          <dl className="ui-rows loan-pending-rows mt-2">
            <div><dt>Tổng số tiền đề nghị</dt><dd>{formatMoney(summary.requestedAmount)}</dd></div>
            <div><dt>Xác suất vỡ nợ bình quân</dt><dd>{formatPercent(summary.averagePd, true)}</dd></div>
            <div>
              <dt>Điểm bình quân</dt>
              <dd>{summary.averageScore == null ? '-' : `${formatScore(summary.averageScore)} / 100`}</dd>
            </div>
            <div>
              <dt>Chưa chấm được điểm</dt>
              {/* Dòng cảnh báo: icon tròn nền đỏ nhạt như mockup .soft-rows dd.bad */}
              <dd className={summary.unscored > 0 ? BAD_VALUE : undefined}>
                {summary.unscored > 0 && <Icon name="alert" />}
                {summary.unscored} hồ sơ
              </dd>
            </div>
            <div>
              <dt className="[&_svg]:size-3.75 [&_svg]:text-muted"><Icon name="clock" />Chờ lâu nhất</dt>
              <dd>
                {/* Mở thẳng hồ sơ chờ lâu nhất: thường là hồ sơ cần xử lý trước. */}
                {summary.oldest ? (
                  <Link
                    className="ui-link loan-oldest-link"
                    to={`/loans/${encodeURIComponent(summary.oldest.applicationNumber)}/review`}
                    state={fromListState(location)}
                    title={`Mở hồ sơ ${summary.oldest.applicationNumber}`}
                  >
                    {daysSince(summary.oldest.submittedAt)} ngày, từ {formatCompactDateTime(summary.oldest.submittedAt)}
                  </Link>
                ) : '-'}
              </dd>
            </div>
          </dl>
          {summary.sampled < summary.total && (
            <p className="loan-pending-note mt-2.5 text-secondary text-[13px]">
              Tổng tiền, xác suất vỡ nợ và điểm tính trên {summary.sampled} hồ sơ mới nhất trong {summary.total} hồ sơ đang chờ.
            </p>
          )}
        </>
      )}
    </section>
  );
}
