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

/**
 * Thẻ "Kết quả eKYC": số tài khoản theo trạng thái eKYC hiện tại, đếm trên toàn hệ thống (`/admin/users/stats`).
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
    <section className="ui-card kyc-chart" aria-labelledby="kycOutcomeTitle">
      <div className="kyc-chart-head">
        <h2 id="kycOutcomeTitle">Kết quả eKYC</h2>
        <span className="ui-tag">Hiện tại, toàn hệ thống</span>
      </div>

      {error ? (
        <div className="kyc-chart-body"><ErrorNotice error={error} onRetry={onRetry} /></div>
      ) : isLoading || !stats || !verified ? (
        <div className="kyc-chart-body" aria-busy="true">
          <span className="ui-skeleton kyc-skel-lead" />
          <span className="ui-skeleton kyc-skel-plot" />
        </div>
      ) : stats.total === 0 ? (
        <p className="kyc-chart-lead">Chưa có tài khoản nào trong hệ thống.</p>
      ) : (
        <>
          <p className="kyc-chart-lead">
            <b>{chartNumber(verified.count)}</b> trên <b>{chartNumber(stats.total)}</b> tài khoản đã xác minh eKYC
            (<b>{formatShare(verified.share)}</b>); <b>{chartNumber(count('PENDING') + count('MANUAL_REVIEW'))}</b> chưa
            xác minh xong, <b>{chartNumber(count('FAILED'))}</b> thất bại.
          </p>
          <EChart
            className="kyc-chart-plot"
            option={option}
            ariaLabel="Biểu đồ thanh ngang số tài khoản theo trạng thái eKYC"
            onClick={({ dataIndex }) => {
              const row = rows[dataIndex];
              if (row) onSelect(row.status);
            }}
          />
          <details className="kyc-chart-data">
            <summary>Xem số liệu</summary>
            <table className="kyc-data-table">
              <thead><tr><th>Trạng thái</th><th className="num">Số tài khoản</th><th className="num">Tỷ lệ</th></tr></thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.status}>
                    <td>{row.label}</td>
                    <td className="num">{chartNumber(row.count)}</td>
                    <td className="num">{formatShare(row.share)}</td>
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
