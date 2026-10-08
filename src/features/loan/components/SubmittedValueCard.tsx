import { useMemo } from 'react';
import { ChartDataTable } from '@/components/ChartCard';
import { EChart } from '@/components/EChart';
import { ErrorNotice } from '@/components/ErrorNotice';
import {
  bucketTitle,
  lastDaysRange,
  useGetLoanStatisticsSeriesQuery,
  vnToday,
} from '@/features/statistics';
import { chartNumber, moneyShort } from '@/lib/charts/theme';
import { formatMoney } from '../formatters';
import {
  buildSubmittedValueOption,
  hasSubmittedAmount,
  SUBMITTED_DAYS,
  summarizeSubmitted,
} from '../mappers/submittedValueChart';

const PERCENT = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

/** Icon cột của tiêu đề thẻ (cùng nét với icon "Gọi vốn" ở sidebar). */
function BarsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19V9" /><path d="M10 19V5" /><path d="M16 19v-7" /><path d="M22 19H2" />
    </svg>
  );
}

/**
 * Thẻ "Giá trị hồ sơ nộp 30 ngày" (mockup loans.html): tổng số tiền đề nghị của hồ sơ nộp trong 30 ngày,
 * chênh lệch so với 30 ngày trước đó và cột theo ngày. Một lời gọi series ngày dài 60 ngày (giờ Việt Nam)
 * cho cả kỳ hiện tại lẫn kỳ so sánh.
 */
export function SubmittedValueCard() {
  const range = lastDaysRange(SUBMITTED_DAYS * 2);
  const series = useGetLoanStatisticsSeriesQuery(range);
  const points = series.data?.points;
  const ready = points != null && hasSubmittedAmount(points);
  const summary = useMemo(() => (points && ready ? summarizeSubmitted(points, range.to) : null), [points, ready, range.to]);
  const option = useMemo(() => (summary ? buildSubmittedValueOption(summary.points) : null), [summary]);

  return (
    <section className="ui-card loan-top-card" aria-labelledby="loanSubmittedTitle">
      <div className="ui-card-head">
        <h2 id="loanSubmittedTitle">
          <span className="ui-ico"><BarsIcon /></span>
          Giá trị hồ sơ nộp {SUBMITTED_DAYS} ngày
        </h2>
        <span className="ui-tag">{summary?.periodLabel ?? `${SUBMITTED_DAYS} ngày đến ${vnToday().slice(8, 10)}/${vnToday().slice(5, 7)}`}</span>
      </div>

      {series.error ? (
        <div className="loan-top-body"><ErrorNotice error={series.error} onRetry={series.refetch} /></div>
      ) : series.isLoading ? (
        <div className="loan-top-body" aria-busy="true">
          <span className="ui-skeleton loan-skel-big" />
          <span className="ui-skeleton loan-skel-plot" />
        </div>
      ) : !summary || !option ? (
        <p className="loan-top-empty">Máy chủ chưa trả số tiền đề nghị theo ngày, nên chưa vẽ được biểu đồ này.</p>
      ) : (
        <>
          <div className="ui-big">
            <b>{formatMoney(summary.total)}</b>
            {summary.change != null && (
              <span
                className={summary.change >= 0 ? 'ui-up' : 'ui-down'}
                title={`So với ${SUBMITTED_DAYS} ngày trước đó`}
              >
                {PERCENT.format(Math.abs(summary.change))}%
                <span className="ui-sr-only">{summary.change >= 0 ? 'tăng' : 'giảm'} so với {SUBMITTED_DAYS} ngày trước đó</span>
              </span>
            )}
            <span className="ui-note">
              {summary.applications === 0
                ? 'Chưa có hồ sơ nộp trong kỳ'
                : `${chartNumber(summary.applications)} hồ sơ, bình quân ${moneyShort(summary.average ?? 0)} mỗi hồ sơ`}
            </span>
          </div>
          <EChart
            className="loan-top-plot"
            option={option}
            ariaLabel={`Biểu đồ cột số tiền đề nghị vay theo ngày, ${SUBMITTED_DAYS} ngày gần nhất`}
          />
          <ChartDataTable
            headers={['Ngày', 'Số tiền đề nghị', 'Số hồ sơ']}
            rows={summary.points.map((point) => [
              bucketTitle(point.bucketStart, 'DAY'),
              formatMoney(point.applicationsSubmittedAmount ?? 0),
              chartNumber(point.applicationsSubmitted),
            ])}
          />
        </>
      )}
    </section>
  );
}
