import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EChart } from '@/components/EChart';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { Pager } from '@/components/Pager';
import { StatusPill } from '@/components/StatusPill';
import { changePercent, sumOf } from '@/features/statistics';
import { EKYC_DISPLAY, ROLE_LABELS, useGetUsersQuery } from '@/features/user';
import { EMPTY, formatNumber } from '@/utils';
import type { DashboardStatistics } from '../hooks/useDashboardStatistics';
import { buildSignupOption } from '../mappers/chartOptions';
import { DashCardHead } from './DashCardHead';

/** 5 tài khoản mỗi trang như mockup (NEW_ROWS). */
const NEW_ACCOUNTS_PAGE_SIZE = 5;

const PERCENT0 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const VN_PARTS = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
});

/** Ngày tạo hai dòng như mockup: "06/10" và "19:42" (giờ Việt Nam); khác năm nay thì thêm năm. */
function createdParts(iso: string | null): { day: string; time: string } | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const part = (type: Intl.DateTimeFormatPartTypes) => VN_PARTS.formatToParts(date).find((item) => item.type === type)?.value ?? '';
  const thisYear = VN_PARTS.formatToParts(new Date()).find((item) => item.type === 'year')?.value;
  const day = `${part('day')}/${part('month')}${part('year') === thisYear ? '' : `/${part('year')}`}`;
  return { day, time: `${part('hour')}:${part('minute')}` };
}

/** Câu dẫn và cột chồng tài khoản mới theo kỳ (user series), so với kỳ trước khi so được. */
function SignupSummary({ stats }: { stats: DashboardStatistics }) {
  const { period, chartBucket, userPeriods, userCompare, userChart } = stats;
  const points = userChart.currentData?.points;
  const option = useMemo(() => (points ? buildSignupOption(points, chartBucket) : null), [points, chartBucket]);

  const error = userCompare.error ?? userChart.error;
  if (error) {
    return (
      <div className="dash-block">
        <ErrorNotice error={error} onRetry={() => { void userCompare.refetch(); void userChart.refetch(); }} />
      </div>
    );
  }
  if (!userPeriods || !points || !option) {
    return <div className="dash-block" aria-busy="true"><span className="ui-skeleton dash-signup-skel" /></div>;
  }

  const total = sumOf(userPeriods.current, (point) => point.registered);
  const borrowers = sumOf(userPeriods.current, (point) => point.registeredBorrowers);
  const investors = sumOf(userPeriods.current, (point) => point.registeredInvestors);
  const change = changePercent(total, sumOf(userPeriods.previous, (point) => point.registered), userPeriods.previousComplete);

  return (
    <>
      <p className="dash-lead">
        <b>{formatNumber(total)}</b> tài khoản mới trong {period} ngày, {formatNumber(borrowers)} người vay và {formatNumber(investors)} nhà đầu tư
        {change != null && <>; {change >= 0 ? 'tăng' : 'giảm'} {PERCENT0.format(Math.abs(change))}% so với kỳ trước</>}.
      </p>
      {total > 0 && (
        <EChart
          className="dash-signup-plot"
          option={option}
          notMerge
          ariaLabel={`Biểu đồ cột chồng số tài khoản mới ${chartBucket === 'DAY' ? 'theo ngày' : 'theo tuần'}, ${period} ngày gần nhất`}
        />
      )}
    </>
  );
}

/**
 * Thẻ "Tài khoản mới" (mockup .db-new): tóm tắt theo kỳ, cột chồng người vay và nhà đầu tư, bảng tài khoản
 * tạo gần nhất có phân trang. finora-user xếp danh sách theo thời điểm tạo, mới nhất trước, và chưa lọc được
 * theo khoảng ngày, nên bảng phân trang trên toàn bộ tài khoản.
 */
export function NewAccountsCard({ stats }: { stats: DashboardStatistics }) {
  const [page, setPage] = useState(0);
  const query = useGetUsersQuery({ page, size: NEW_ACCOUNTS_PAGE_SIZE, role: 'ALL', ekycStatus: 'ALL' });
  const rows = query.data?.content ?? [];

  return (
    <section className="ui-card dash-card dash-new" aria-labelledby="dashNewUsers">
      <DashCardHead
        id="dashNewUsers"
        icon="userPlus"
        title="Tài khoản mới"
        aside={<Link className="dash-more" to="/users">Xem tất cả<Icon name="chevronRight" /></Link>}
      />
      <SignupSummary stats={stats} />
      {query.error ? (
        <div className="dash-block"><ErrorNotice error={query.error} onRetry={query.refetch} /></div>
      ) : query.isLoading ? (
        <div className="ui-empty" aria-busy="true">Đang tải...</div>
      ) : rows.length === 0 ? (
        <div className="ui-empty">Chưa có tài khoản nào.</div>
      ) : (
        <>
          <div className="ui-table-wrap">
            <table className="ui-table dash-new-table">
              <thead><tr><th scope="col">Người dùng</th><th scope="col">eKYC</th><th scope="col" className="num">Ngày tạo</th></tr></thead>
              <tbody aria-busy={query.isFetching}>
                {rows.map((user) => {
                  const ekyc = EKYC_DISPLAY[user.ekycStatus];
                  const created = createdParts(user.createdAt);
                  return (
                    <tr key={user.id}>
                      <td>
                        <Link className={user.fullName ? 'dash-who' : 'dash-who empty'} to={`/customers/kyc/${user.id}`} title={user.email}>
                          {user.fullName || 'Chưa cập nhật tên'}
                        </Link>
                        <span className="ui-sub dash-new-sub">{ROLE_LABELS[user.role] ?? user.role}, {user.email}</span>
                      </td>
                      <td>
                        {ekyc
                          ? <StatusPill tone={ekyc.tone} dot>{ekyc.label}</StatusPill>
                          : <StatusPill tone="neutral" dot>{user.ekycStatus}</StatusPill>}
                      </td>
                      <td className="num dash-new-date">
                        {created ? <>{created.day}<span className="ui-sub">{created.time}</span></> : EMPTY}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="dash-new-foot">
            <Pager
              page={page}
              size={NEW_ACCOUNTS_PAGE_SIZE}
              total={query.data?.totalElements ?? 0}
              unit="tài khoản"
              onPage={setPage}
              disabled={query.isFetching}
            />
          </div>
        </>
      )}
    </section>
  );
}
