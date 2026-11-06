import { Icon } from '@/components/Icon';
import { formatDate, formatDateTime, formatMoney } from '../../formatters';
import type { AdminLoanReviewDetail } from '../../types';
import { policyLabel } from '../../mappers/reviewDisplay';
import { FOOTNOTE, MUTED, STRIP } from './reviewClassNames';

// Mũi tên của phần gập xoay 90 độ khi mở.
const MORE = 'lr-more mt-3 border border-line rounded-md [&[open]>summary_svg]:transform-[rotate(90deg)]';

const MORE_SUMMARY =
  'flex items-center gap-2 min-h-9.5 py-2 px-3 rounded-md cursor-pointer text-[13px] font-medium [list-style:none] [&::-webkit-details-marker]:hidden hover:bg-surface-muted [&_svg]:flex-none [&_svg]:size-3.5 [&_svg]:text-muted [&_svg]:transition-[transform] [&_svg]:duration-150 [&_svg]:ease-soft';

// Bảng cuộn trong khung cao tối đa 440px, hàng tiêu đề dính ở đầu khung.
const SCHEDULE_TABLE =
  'ui-table lr-schedule-table [&_th]:sticky [&_th]:top-0 [&_th]:z-1 [&_th]:py-2 [&_th]:px-2.5 [&_th]:text-[13px] [&_td]:py-2 [&_td]:px-2.5 [&_td]:text-[13px]';

/**
 * Lịch trả từng kỳ, thu gọn mặc định vì bảng dài. Lịch sau định giá (nếu có) là cơ sở lập hợp
 * đồng; chưa định giá thì hiện lịch dự kiến lúc nộp. Số liệu là snapshot backend đã lưu.
 */
export function RepaymentSchedule({ application }: { application: AdminLoanReviewDetail }) {
  const isFinal = application.finalSchedule != null;
  const schedule = application.finalSchedule ?? application.initialSchedule;

  return (
    <details className={MORE}>
      <summary className={MORE_SUMMARY}>
        <Icon name="chevronRight" />
        Lịch trả {schedule.periods.length} kỳ
        <span className="lr-more-sub ml-auto text-muted font-normal">{isFinal ? 'theo lãi suất sau định giá' : 'theo lãi suất cơ sở lúc nộp'}</span>
      </summary>
      <div className="lr-more-body grid gap-3 pt-1 px-3 pb-3">
        <p className={MUTED}>
          {isFinal
            ? 'Là cơ sở lập hợp đồng. Lịch chính thức có thể dịch theo ngày giải ngân thực tế.'
            : 'Lịch dự kiến lúc nộp hồ sơ. Lịch chính thức chỉ chốt theo ngày giải ngân thực tế.'}
        </p>
        <dl className={STRIP}>
          <div><dt>Ngày giải ngân dự kiến</dt><dd>{formatDate(schedule.expectedDisbursementDate)}</dd></div>
          <div><dt>Kỳ trả đầu</dt><dd>{formatMoney(schedule.firstInstallment)}</dd></div>
          <div><dt>Kỳ trả cao nhất</dt><dd>{formatMoney(schedule.maximumInstallment)}</dd></div>
          <div><dt>Tổng phải trả</dt><dd>{formatMoney(schedule.totalRepayment)}</dd></div>
        </dl>
        {schedule.periods.length === 0 ? (
          <p className={FOOTNOTE}>Lịch đã lưu chưa có chi tiết từng kỳ.</p>
        ) : (
          <div className="ui-table-wrap lr-schedule-wrap max-h-110 overflow-y-auto">
            <table className={SCHEDULE_TABLE}>
              <thead>
                <tr>
                  <th className="num">Kỳ</th>
                  <th>Từ ngày</th>
                  <th>Đến hạn</th>
                  <th className="num">Số ngày</th>
                  <th className="num">Gốc</th>
                  <th className="num">Lãi</th>
                  <th className="num">Phí</th>
                  <th className="num">Phạt</th>
                  <th className="num">Tổng trả</th>
                  <th className="num">Dư nợ còn lại</th>
                </tr>
              </thead>
              <tbody>
                {schedule.periods.map((period) => (
                  <tr key={period.period}>
                    <td className="num">{period.period}</td>
                    <td>{formatDate(period.fromDate)}</td>
                    <td>{formatDate(period.dueDate)}</td>
                    <td className="num">{period.daysInPeriod}</td>
                    <td className="num">{formatMoney(period.principal)}</td>
                    <td className="num">{formatMoney(period.interest)}</td>
                    <td className="num">{formatMoney(period.fees)}</td>
                    <td className="num">{formatMoney(period.penalties)}</td>
                    <td className="num strong">{formatMoney(period.totalDue)}</td>
                    <td className="num">{formatMoney(period.outstandingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <details className="lr-technical text-secondary text-[13px]">
          <summary className="cursor-pointer text-primary font-medium">Thông tin đối soát kỹ thuật</summary>
          <p className="mt-1">
            Tổng gốc {formatMoney(schedule.totalPrincipal)}, tổng lãi {formatMoney(schedule.totalInterest)},
            tổng phí {formatMoney(schedule.totalFees)}, tiền phạt dự kiến {formatMoney(schedule.totalPenalties)}.
          </p>
          <p className="mt-1">
            Phiên bản cách tính: {policyLabel(schedule.calculationPolicyVersion)}, tính lúc {formatDateTime(schedule.calculatedAt)}.
          </p>
        </details>
      </div>
    </details>
  );
}
