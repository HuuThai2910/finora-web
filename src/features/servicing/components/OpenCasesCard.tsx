import { useMemo } from 'react';
import { EChart } from '@/components/EChart';
import { ErrorNotice } from '@/components/ErrorNotice';
import { overdueGroups, type LoanStatisticsSummary } from '@/features/statistics';
import { formatNumber } from '@/utils';
import { money } from '../formatters';
import type { StageCount } from '../hooks/useServicingCounts';
import type { CollectionStage } from '../types';
import { buildStageOption, stageFromChartClick } from '../mappers/stageChartOption';

interface Props {
  stages: StageCount[] | undefined;
  /** Danh mục từ cùng summary thống kê: tiền quá hạn và nợ xấu toàn danh mục (số hiện tại). */
  portfolio: LoanStatisticsSummary['portfolio'] | undefined;
  openCases: number | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  /** Bấm một thanh để mở tab thu hồi lọc đúng mức độ đó; bỏ trống khi tài khoản không xem được tab thu hồi. */
  onShowStage?: (stage: CollectionStage) => void;
}

/**
 * Hồ sơ thu hồi đang mở theo mức độ, từ `collections.openByStage` của summary thống kê (đếm ở DB, toàn hệ
 * thống); mức độ và nhóm nợ của từng khoảng nằm trong tooltip. Bên dưới là các dòng số liệu như mockup, chỉ
 * giữ số summary có thật: "chưa liên hệ trong 7 ngày" và "lỡ hẹn trả" cần lịch sử từng hồ sơ nên bỏ. Bấm một thanh
 * (hoặc nhãn khoảng ngày) mở hàng đợi thu hồi lọc đúng mức độ đó.
 */
export function OpenCasesCard({ stages, portfolio, openCases, isLoading, error, onRetry, onShowStage }: Props) {
  const option = useMemo(() => (stages ? buildStageOption(stages) : null), [stages]);
  // Nhóm nợ 3 trở lên theo đúng ranh giới mức độ backend trả về, không tự đặt ngưỡng.
  const severe = stages?.filter((item) => item.debtGroup >= 3).reduce((sum, item) => sum + item.count, 0);
  // Khoản quá hạn là nhóm nợ 2 trở lên (nhóm 1 gồm cả khoản đang trả đúng hạn).
  const overdueLoans = portfolio ? overdueGroups(portfolio.byDebtGroup).reduce((sum, item) => sum + item.loans, 0) : 0;

  return (
    <section className="ui-card svc-overview px-4.5 pt-4 pb-3.5" aria-labelledby="svc-open-title">
      <div className="ui-card-head">
        <h2 id="svc-open-title">Hồ sơ thu hồi đang mở</h2>
        <span className="ui-tag">theo số ngày quá hạn</span>
      </div>

      {error ? (
        <div className="svc-overview-body mt-3 grid gap-2.5"><ErrorNotice error={error} onRetry={onRetry} /></div>
      ) : isLoading || !stages || !option ? (
        <div className="svc-overview-body mt-3 grid gap-2.5" aria-busy="true">
          <span className="ui-skeleton svc-skel-line w-70 max-w-full" />
          <span className="ui-skeleton svc-skel-chart h-37.5" />
        </div>
      ) : (
        <>
          <p className="svc-lead mt-0.5 text-[13px] text-secondary [&_b]:font-semibold [&_b]:text-primary [&_b]:tabular-nums">
            <b>{formatNumber(openCases ?? 0)}</b> hồ sơ đang mở
            {severe != null && <>, trong đó <b>{formatNumber(severe)}</b> hồ sơ từ nhóm nợ 3 trở lên</>}.
          </p>
          {/* Đứng cạnh biểu đồ nhóm nợ (trong svc-overview-row) thì thẻ hẹp: biểu đồ trên, bảng dưới. */}
          <div
            className={
              'svc-overview-grid mt-2 grid grid-cols-[minmax(0,1.2fr)_minmax(300px,1fr)] items-center gap-6 '
              + 'in-[.svc-overview-row]:grid-cols-[minmax(0,1fr)] in-[.svc-overview-row]:gap-2 max-[1100px]:grid-cols-[minmax(0,1fr)]'
            }
          >
            <EChart
              className={onShowStage ? 'svc-stage-plot h-47.5 cursor-pointer' : 'svc-stage-plot h-47.5'}
              option={option}
              onClick={onShowStage && ((params) => {
                const picked = stageFromChartClick(stages, params);
                if (picked) onShowStage(picked.stage);
              })}
              ariaLabel={`Biểu đồ thanh ngang số hồ sơ thu hồi đang mở theo số ngày quá hạn: ${stages.map((item) => `${item.range} ${item.count}`).join(', ')}`}
            />
            {portfolio && (
              <dl className="ui-rows svc-open-rows mt-1">
                <div><dt>Tổng tiền quá hạn</dt><dd>{money(portfolio.overdueAmount)}</dd></div>
                <div><dt>Khoản vay đang quá hạn</dt><dd>{formatNumber(overdueLoans)} khoản</dd></div>
                <div>
                  <dt>Dư nợ gốc nợ xấu</dt>
                  <dd className={portfolio.nplPrincipalOutstanding > 0 ? 'svc-bad text-danger' : undefined}>
                    {money(portfolio.nplPrincipalOutstanding)}
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
