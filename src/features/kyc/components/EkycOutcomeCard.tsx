import { useMemo } from 'react';
import { EChart } from '@/components/EChart';
import { ErrorNotice } from '@/components/ErrorNotice';
import type { EkycStatusType, UserStats } from '@/features/user';
import { chartNumber } from '@/lib/charts/theme';
import { buildEkycOutcomeOption, formatShare, toOutcomeRows } from '../mappers/ekycOutcomeChart';

interface EkycOutcomeCardProps {
  stats: UserStats | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  /** Bấm một thanh để lọc bảng theo trạng thái đó. */
  onSelect: (status: EkycStatusType) => void;
}

const CHART_BODY = 'kyc-chart-body grid gap-2.5 mt-2.5';
const CHART_LEAD = 'kyc-chart-lead mt-1 text-secondary text-[13px] [&_b]:text-primary [&_b]:font-semibold [&_b]:[font-variant-numeric:tabular-nums]';
/** Ô số trong bảng "Xem số liệu": canh phải, chữ số đều độ rộng. */
const NUM_CELL = 'num text-right [font-variant-numeric:tabular-nums]';

/**
 * Thẻ "Kết quả xác minh danh tính": số tài khoản theo trạng thái xác minh hiện tại, đếm trên toàn hệ thống (`/admin/users/stats`).
 * Mockup chia theo cách xác minh (tự động, duyệt tay) trong 30 ngày; backend chỉ có trạng thái hiện tại nên thẻ
 * hiện phân bổ hiện tại. Biểu đồ theo tuần nằm ở `SignupWeeklyCard`.
 */
export function EkycOutcomeCard({ stats, isLoading, error, onRetry, onSelect }: EkycOutcomeCardProps) {
  const rows = useMemo(() => (stats ? toOutcomeRows(stats) : []), [stats]);
  // Giữ cùng một option giữa các lần vẽ lại trang để biểu đồ không chạy lại hoạt ảnh vô cớ.
  const option = useMemo(() => buildEkycOutcomeOption(rows), [rows]);
  const count = (status: EkycStatusType) => rows.find((row) => row.status === status)?.count ?? 0;
  const verified = rows.find((row) => row.status === 'VERIFIED');

  return (
    <section
      className="ui-card kyc-chart pt-4 px-4.5 pb-3 max-[760px]:pt-3.5 max-[760px]:px-3 max-[760px]:pb-2.5"
      aria-labelledby="kycOutcomeTitle"
    >
      <div className="kyc-chart-head flex items-center justify-between gap-3">
        <h2 id="kycOutcomeTitle" className="text-[15px] font-semibold">Kết quả xác minh danh tính</h2>
        <span className="ui-tag">Hiện tại, toàn hệ thống</span>
      </div>

      {error ? (
        <div className={CHART_BODY}><ErrorNotice error={error} onRetry={onRetry} /></div>
      ) : isLoading || !stats || !verified ? (
        <div className={CHART_BODY} aria-busy="true">
          <span className="ui-skeleton kyc-skel-lead w-[60%]" />
          <span className="ui-skeleton kyc-skel-plot h-35" />
        </div>
      ) : stats.total === 0 ? (
        <p className={CHART_LEAD}>Chưa có tài khoản nào trong hệ thống.</p>
      ) : (
        <>
          <p className={CHART_LEAD}>
            <b>{chartNumber(verified.count)}</b> trên <b>{chartNumber(stats.total)}</b> tài khoản đã xác minh danh tính
            (<b>{formatShare(verified.share)}</b>); <b>{chartNumber(count('PENDING') + count('MANUAL_REVIEW'))}</b> chưa
            xác minh xong, <b>{chartNumber(count('FAILED'))}</b> thất bại.
          </p>
          {/* Cao gần bằng biểu đồ tuần bên cạnh (mockup để cả hai 220px) để các thanh giãn đều, không dồn lên đầu thẻ. */}
          <EChart
            className="kyc-chart-plot h-50 mt-2"
            option={option}
            ariaLabel="Biểu đồ thanh ngang số tài khoản theo trạng thái xác minh danh tính"
            onClick={({ dataIndex }) => {
              const row = rows[dataIndex];
              if (row) onSelect(row.status);
            }}
          />
          <details className="kyc-chart-data mt-1">
            <summary
              className="inline-flex items-center gap-1 py-0.5 text-brand text-[12px] cursor-pointer [list-style:none] [&::-webkit-details-marker]:hidden before:content-[''] before:w-1.5 before:h-1.5 before:mr-1 before:border-r-[1.5px] before:border-b-[1.5px] before:border-current before:transform-[rotate(-45deg)] before:transition-[transform] before:duration-150 motion-reduce:before:transition-none [[open]>&]:before:transform-[rotate(45deg)]"
            >
              Xem số liệu
            </summary>
            <table
              className="kyc-data-table w-full max-w-120 mt-1.5 border-collapse text-[12px] [&_th]:py-1 [&_th]:px-2 [&_th]:bg-surface-muted [&_th]:text-muted [&_th]:font-medium [&_td]:py-1 [&_td]:px-2 [&_td]:border-b [&_td]:border-b-divider [&_td]:text-secondary"
            >
              <thead><tr><th className="text-left">Trạng thái</th><th className={NUM_CELL}>Số tài khoản</th><th className={NUM_CELL}>Tỷ lệ</th></tr></thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.status}>
                    <td>{row.label}</td>
                    <td className={NUM_CELL}>{chartNumber(row.count)}</td>
                    <td className={NUM_CELL}>{formatShare(row.share)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  );
}
