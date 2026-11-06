import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { EChart } from '@/components/EChart';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { StatusPill } from '@/components/StatusPill';
import { usePermission } from '@/features/auth';
import { changePercent, sumOf } from '@/features/statistics';
import { EKYC_DISPLAY, ROLE_LABELS, useGetUsersQuery } from '@/features/user';
import { EMPTY, formatNumber } from '@/utils';
import type { DashboardStatistics } from '../hooks/useDashboardStatistics';
import { buildSignupOption } from '../mappers/chartOptions';
import { DashCardHead } from './DashCardHead';

/** Số tài khoản tạo gần nhất hiện trên thẻ (mockup NEW_ROWS); xem hết ở trang danh sách qua "Xem tất cả". */
const NEW_ACCOUNTS_SIZE = 5;

const TH = 'px-2.5 py-1.75';
const TD = 'px-2.5 py-2';
const WHO = 'block overflow-hidden text-ellipsis';

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
      <div className="dash-block mt-2.5">
        <ErrorNotice error={error} onRetry={() => { void userCompare.refetch(); void userChart.refetch(); }} />
      </div>
    );
  }
  if (!userPeriods || !points || !option) {
    return <div className="dash-block mt-2.5" aria-busy="true"><span className="ui-skeleton dash-signup-skel block h-42.5" /></div>;
  }

  const total = sumOf(userPeriods.current, (point) => point.registered);
  const borrowers = sumOf(userPeriods.current, (point) => point.registeredBorrowers);
  const investors = sumOf(userPeriods.current, (point) => point.registeredInvestors);
  const change = changePercent(total, sumOf(userPeriods.previous, (point) => point.registered), userPeriods.previousComplete);
  // Tài khoản không phải người vay hay nhà đầu tư (nhân viên, quản trị viên) vẫn nằm trong tổng: ghi riêng để câu cộng đúng.
  const others = Math.max(0, total - borrowers - investors);

  return (
    <>
      <p className="dash-lead mt-1.5 text-[13px] leading-normal text-secondary min-[900px]:max-[1360px]:col-span-full">
        <b className="font-semibold text-primary tabular-nums">{formatNumber(total)}</b> tài khoản mới trong {period} ngày, {formatNumber(borrowers)} người vay
        {others > 0
          ? <>, {formatNumber(investors)} nhà đầu tư và {formatNumber(others)} tài khoản khác</>
          : <> và {formatNumber(investors)} nhà đầu tư</>}
        {change != null && <>; {change >= 0 ? 'tăng' : 'giảm'} {PERCENT0.format(Math.abs(change))}% so với kỳ trước</>}.
      </p>
      {total > 0 && (
        <EChart
          className="dash-signup-plot mt-1.5 h-42.5 min-[900px]:max-[1360px]:col-1 min-[900px]:max-[1360px]:row-3 min-[900px]:max-[1360px]:h-55"
          option={option}
          notMerge
          ariaLabel={`Biểu đồ cột chồng số tài khoản mới ${chartBucket === 'DAY' ? 'theo ngày' : 'theo tuần'}, ${period} ngày gần nhất`}
        />
      )}
    </>
  );
}

/**
 * Thẻ "Tài khoản mới" (mockup .db-new): tóm tắt theo kỳ, cột chồng người vay và nhà đầu tư, bảng 5 tài khoản tạo
 * gần nhất (finora-user xếp danh sách theo thời điểm tạo, mới nhất trước). Không phân trang trên thẻ: lật trang ở đây
 * là việc của trang danh sách, mở bằng "Xem tất cả".
 */
export function NewAccountsCard({ stats }: { stats: DashboardStatistics }) {
  const { canView, isAdmin } = usePermission();
  // Phần tóm tắt lấy từ API thống kê; bảng tài khoản đọc danh sách người dùng nên cần quyền Xem "Khách hàng".
  const canList = canView('customer');
  const query = useGetUsersQuery(
    { page: 0, size: NEW_ACCOUNTS_SIZE, role: 'ALL', ekycStatus: 'ALL' },
    { skip: !canList },
  );
  const rows = query.data?.content ?? [];

  // Màn 900–1360px: thẻ chiếm cả hàng, biểu đồ bên trái, bảng bên phải (lưới 2 cột); còn lại xếp dọc.
  return (
    <section
      className="ui-card dash-card dash-new flex flex-col px-4.5 pt-4 pb-3.5 min-[900px]:max-[1360px]:grid min-[900px]:max-[1360px]:grid-cols-2 min-[900px]:max-[1360px]:grid-rows-[auto_auto_1fr_auto] min-[900px]:max-[1360px]:gap-x-6"
      aria-labelledby="dashNewUsers"
    >
      <DashCardHead
        id="dashNewUsers"
        icon="userPlus"
        title="Tài khoản mới"
        aside={canList && (
          <Link
            className="dash-more inline-flex items-center gap-0.5 whitespace-nowrap text-[12.5px] font-semibold text-brand [&_svg]:size-3.5"
            to={isAdmin ? '/users' : '/customers/kyc'}
          >
            Xem tất cả<Icon name="chevronRight" />
          </Link>
        )}
        className="min-[900px]:max-[1360px]:col-span-full"
      />
      <SignupSummary stats={stats} />
      {!canList ? null : query.error ? (
        <div className="dash-block mt-2.5"><ErrorNotice error={query.error} onRetry={query.refetch} /></div>
      ) : query.isLoading ? (
        <div className="ui-empty" aria-busy="true">Đang tải...</div>
      ) : rows.length === 0 ? (
        <div className="ui-empty">Chưa có tài khoản nào.</div>
      ) : (
        <>
          <div className="ui-table-wrap min-[900px]:max-[1360px]:col-2 min-[900px]:max-[1360px]:row-3">
            <table className="ui-table dash-new-table mt-2.5 table-fixed text-[13px]">
              <thead>
                <tr>
                  <th scope="col" className={TH}>Người dùng</th>
                  <th scope="col" className={`w-33 ${TH}`}>Xác minh</th>
                  <th scope="col" className={`num w-19.5 ${TH}`}>Ngày tạo</th>
                </tr>
              </thead>
              <tbody aria-busy={query.isFetching}>
                {rows.map((user) => {
                  const ekyc = EKYC_DISPLAY[user.ekycStatus];
                  const created = createdParts(user.createdAt);
                  return (
                    <tr key={user.id}>
                      <td className={`overflow-hidden ${TD}`}>
                        <Link
                          className={user.fullName
                            ? `dash-who ${WHO} font-semibold text-primary hover:text-brand`
                            : `dash-who empty ${WHO} font-medium text-muted`}
                          to={`/customers/kyc/${user.id}`}
                          title={user.email}
                        >
                          {user.fullName || 'Chưa cập nhật tên'}
                        </Link>
                        <span className="ui-sub dash-new-sub overflow-hidden text-ellipsis">{ROLE_LABELS[user.role] ?? user.role}, {user.email}</span>
                      </td>
                      <td className={TD}>
                        {ekyc
                          ? <StatusPill tone={ekyc.tone} dot>{ekyc.label}</StatusPill>
                          : <StatusPill tone="neutral" dot>{user.ekycStatus}</StatusPill>}
                      </td>
                      <td className={`num dash-new-date text-secondary ${TD}`}>
                        {created ? <>{created.day}<span className="ui-sub">{created.time}</span></> : EMPTY}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="dash-new-foot mt-auto pt-2.5 text-[12px] text-muted min-[900px]:max-[1360px]:col-span-full">
            {rows.length} tài khoản tạo gần nhất trong {formatNumber(query.data?.totalElements ?? rows.length)} tài khoản
          </p>
        </>
      )}
    </section>
  );
}
