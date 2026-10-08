import { useMemo } from 'react';
import { EChart } from '@/components/EChart';
import { ErrorNotice } from '@/components/ErrorNotice';
import { overdueGroups, type LoanStatisticsSummary } from '@/features/statistics';
import { formatCurrency, formatNumber } from '@/utils';
import type { StageCount } from '../hooks/useServicingCounts';
import { buildStageOption } from '../mappers/stageChartOption';

interface Props {
  stages: StageCount[] | undefined;
  /** Danh mục từ cùng summary thống kê: tiền quá hạn và nợ xấu toàn danh mục (số hiện tại). */
  portfolio: LoanStatisticsSummary['portfolio'] | undefined;
  openCases: number | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  onShowCollection: () => void;
}

/**
 * Hồ sơ thu hồi đang mở theo mức độ, từ `collections.openByStage` của summary thống kê (đếm ở DB, toàn hệ
 * thống); mức độ và nhóm nợ của từng khoảng nằm trong tooltip. Bên dưới là các dòng số liệu như mockup, chỉ
 * giữ số summary có thật: "chưa liên hệ trong 7 ngày" và "lỡ hẹn trả" cần lịch sử từng hồ sơ nên bỏ.
 */
export function OpenCasesCard({ stages, portfolio, openCases, isLoading, error, onRetry, onShowCollection }: Props) {
  const option = useMemo(() => (stages ? buildStageOption(stages) : null), [stages]);
  // Nhóm nợ 3 trở lên theo đúng ranh giới mức độ backend trả về, không tự đặt ngưỡng.
  const severe = stages?.filter((item) => item.debtGroup >= 3).reduce((sum, item) => sum + item.count, 0);
  // Khoản quá hạn là nhóm nợ 2 trở lên (nhóm 1 gồm cả khoản đang trả đúng hạn).
  const overdueLoans = portfolio ? overdueGroups(portfolio.byDebtGroup).reduce((sum, item) => sum + item.loans, 0) : 0;

  return (
    <section className="ui-card svc-overview" aria-labelledby="svc-open-title">
      <div className="ui-card-head">
        <h2 id="svc-open-title">Hồ sơ thu hồi đang mở</h2>
        <span className="ui-tag">theo số ngày quá hạn</span>
      </div>

      {error ? (
        <div className="svc-overview-body"><ErrorNotice error={error} onRetry={onRetry} /></div>
      ) : isLoading || !stages || !option ? (
        <div className="svc-overview-body" aria-busy="true">
          <span className="ui-skeleton svc-skel-line" />
          <span className="ui-skeleton svc-skel-chart" />
        </div>
      ) : (
        <>
          <p className="svc-lead">
            <b>{formatNumber(openCases ?? 0)}</b> hồ sơ đang mở
            {severe != null && <>, trong đó <b>{formatNumber(severe)}</b> hồ sơ từ nhóm nợ 3 trở lên</>}.
          </p>
          <div className="svc-overview-grid">
            <EChart
              className="svc-stage-plot"
              option={option}
              onClick={onShowCollection}
              ariaLabel={`Biểu đồ thanh ngang số hồ sơ thu hồi đang mở theo số ngày quá hạn: ${stages.map((item) => `${item.range} ${item.count}`).join(', ')}`}
            />
            {portfolio && (
              <dl className="ui-rows svc-open-rows">
                <div><dt>Tổng tiền quá hạn</dt><dd>{formatCurrency(portfolio.overdueAmount)}</dd></div>
                <div><dt>Khoản vay đang quá hạn</dt><dd>{formatNumber(overdueLoans)} khoản</dd></div>
                <div>
                  <dt>Dư nợ gốc nợ xấu</dt>
                  <dd className={portfolio.nplPrincipalOutstanding > 0 ? 'svc-bad' : undefined}>
                    {formatCurrency(portfolio.nplPrincipalOutstanding)}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </>
      )}
    </section>
  );
}
