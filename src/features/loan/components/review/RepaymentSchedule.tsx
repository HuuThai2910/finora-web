import { Icon } from '@/components/Icon';
import { formatDate, formatDateTime, formatMoney } from '../../formatters';
import type { AdminLoanReviewDetail } from '../../types';
import { policyLabel } from '../../mappers/reviewDisplay';

/**
 * Lịch trả từng kỳ, thu gọn mặc định vì bảng dài. Lịch sau định giá (nếu có) là cơ sở lập hợp
 * đồng; chưa định giá thì hiện lịch dự kiến lúc nộp. Số liệu là snapshot backend đã lưu.
 */
export function RepaymentSchedule({ application }: { application: AdminLoanReviewDetail }) {
  const isFinal = application.finalSchedule != null;
  const schedule = application.finalSchedule ?? application.initialSchedule;

  return (
    <details className="lr-more">
      <summary>
        <Icon name="chevronRight" />
        Lịch trả {schedule.periods.length} kỳ
        <span className="lr-more-sub">{isFinal ? 'theo lãi suất sau định giá' : 'theo lãi suất cơ sở lúc nộp'}</span>
      </summary>
      <div className="lr-more-body">
        <p className="lr-muted">
          {isFinal
            ? 'Là cơ sở lập hợp đồng. Lịch chính thức có thể dịch theo ngày giải ngân thực tế.'
            : 'Lịch dự kiến lúc nộp hồ sơ. Lịch chính thức chỉ chốt theo ngày giải ngân thực tế.'}
        </p>
        <dl className="lr-strip">
          <div><dt>Ngày giải ngân dự kiến</dt><dd>{formatDate(schedule.expectedDisbursementDate)}</dd></div>
          <div><dt>Kỳ trả đầu</dt><dd>{formatMoney(schedule.firstInstallment)}</dd></div>
          <div><dt>Kỳ trả cao nhất</dt><dd>{formatMoney(schedule.maximumInstallment)}</dd></div>
          <div><dt>Tổng phải trả</dt><dd>{formatMoney(schedule.totalRepayment)}</dd></div>
        </dl>
        {schedule.periods.length === 0 ? (
          <p className="lr-footnote">Lịch đã lưu chưa có chi tiết từng kỳ.</p>
        ) : (
          <div className="ui-table-wrap lr-schedule-wrap">
            <table className="ui-table lr-schedule-table">
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
        <details className="lr-technical">
          <summary>Thông tin đối soát kỹ thuật</summary>
          <p>
            Tổng gốc {formatMoney(schedule.totalPrincipal)}, tổng lãi {formatMoney(schedule.totalInterest)},
            tổng phí {formatMoney(schedule.totalFees)}, tiền phạt dự kiến {formatMoney(schedule.totalPenalties)}.
          </p>
          <p>
            Phiên bản cách tính: {policyLabel(schedule.calculationPolicyVersion)}, tính lúc {formatDateTime(schedule.calculatedAt)}.
          </p>
        </details>
      </div>
    </details>
  );
}
