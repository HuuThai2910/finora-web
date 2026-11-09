import type { ReactNode } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import type { AppDispatch } from '@/app/store';
import { Icon } from '@/components/Icon';
import { usePermission } from '@/features/auth';
import { useApplicationNumbers } from '@/features/loan';
import { investmentApi } from '@/lib/api/investmentApi';
import { loanApi } from '@/lib/api/loanApi';
import { paymentApi } from '@/lib/api/paymentApi';
import { formatDateTime } from '@/utils';
import { useDisbursementIncidentsQuery, useRepaymentIncidentsQuery, useWithdrawalIncidentsQuery } from '../api/paymentIncidentApi';
import { LOAN_SCOPED_SIZE, WALLET_OWNER_LABEL } from '../constant';
import { money } from '../formatters';
import { useSystemIncidentCounts } from '../hooks/useSystemIncidentCounts';
import { OrderIncidentsSection } from '../components/OrderIncidentsSection';
import { QuarantinePanel } from '../components/QuarantinePanel';
import { NothingOpen, ServicingCard } from '../components/ServicingCard';
import { UserName } from '../components/UserName';
import { WithdrawalIncidentsSection } from '../components/WithdrawalIncidentsSection';

/** Một dòng chỉ đường: số việc đang mở và nơi xử lý. */
function PointerRow({ label, count, to, linkLabel }: { label: string; count: number | undefined; to: string; linkLabel: string }) {
  if (!count) return null;
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2 [&+li]:border-t [&+li]:border-t-divider">
      <span className="text-[13px] text-primary">
        {label}: <b className="font-semibold tabular-nums">{count}</b>
      </span>
      <Link className="ui-link inline-flex items-center gap-1 text-[13px]" to={to}>
        {linkLabel}
        <Icon name="chevronRight" />
      </Link>
    </li>
  );
}

/**
 * Lệnh rút tiền chờ đối soát theo khách hàng: chỉ đường sang trang chi tiết khách hàng, nơi có nút "Tra cứu lại".
 */
function WithdrawalOwnersIndex() {
  const withdrawals = useWithdrawalIncidentsQuery({ page: 0, size: LOAN_SCOPED_SIZE });
  const rows = (withdrawals.data?.content ?? []).filter((item) => item.ownerType !== 'PLATFORM');
  if (rows.length === 0) return null;
  return (
    <>
      <h3 className="mt-3 mb-1.5 text-[13px] font-semibold text-secondary">Lệnh rút tiền chờ đối soát</h3>
      <div className="ui-table-wrap">
        <table className="ui-table list svc-table">
          <thead>
            <tr>
              <th>Khách hàng</th>
              <th className="num">Số tiền</th>
              <th>Tạo lúc</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.withdrawalId}>
                <td>
                  <Link className="ui-link" to={`/customers/kyc/${encodeURIComponent(item.ownerId)}`}>
                    <UserName userId={item.ownerId} fallback={`${WALLET_OWNER_LABEL[item.ownerType] ?? 'Khách hàng'} #${item.ownerId}`} />
                  </Link>
                </td>
                <td className="num">{money(item.amount)}</td>
                <td>{formatDateTime(item.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const servicingTab = (applicationNumber: string) => `/loans/${encodeURIComponent(applicationNumber)}/review?tab=servicing`;

/**
 * Giao dịch tiền của Payment chưa ghi xong theo từng hồ sơ: chỉ liệt kê để biết hồ sơ nào cần mở, thao tác (đối soát, ghi
 * lại, tra cứu lại) nằm ở tab "Sau giải ngân" của hồ sơ. Danh sách hồ sơ vay không lọc được nhóm này vì dữ liệu ở
 * Payment, nên trang này là lối vào chung.
 */
function MoneyIncidentsIndex() {
  const scope = { page: 0, size: LOAN_SCOPED_SIZE };
  const repayments = useRepaymentIncidentsQuery(scope);
  const disbursements = useDisbursementIncidentsQuery(scope);
  const rows: Array<{ key: string; kind: string; applicationId: number; amount: number; since: string }> = [
    ...(repayments.data?.content ?? []).map((item) => ({
      key: `r-${item.repaymentId}`, kind: 'Trả nợ chưa ghi xong vào hệ thống lõi', applicationId: item.loanApplicationId,
      amount: item.amount, since: item.updatedAt,
    })),
    ...(disbursements.data?.content ?? []).map((item) => ({
      key: `d-${item.sagaId}`, kind: 'Giải ngân chưa có kết quả chuyển tiền', applicationId: item.loanApplicationId,
      amount: item.amount, since: item.updatedAt,
    })),
  ];
  const numbers = useApplicationNumbers(rows.map((row) => row.applicationId));
  if (rows.length === 0) return null;

  return (
    <div className="ui-table-wrap">
      <table className="ui-table list svc-table">
        <thead>
          <tr>
            <th>Sự cố</th>
            <th>Hồ sơ vay</th>
            <th className="num">Số tiền</th>
            <th>Cập nhật</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const reference = numbers.get(row.applicationId);
            return (
              <tr key={row.key}>
                <td>{row.kind}</td>
                <td>
                  {reference ? (
                    <Link className="ui-link ui-mono" to={servicingTab(reference.applicationNumber)}>
                      {reference.applicationCode || reference.applicationNumber}
                    </Link>
                  ) : <span className="text-muted">Đang tra mã hồ sơ...</span>}
                </td>
                <td className="num">{money(row.amount)}</td>
                <td>{formatDateTime(row.since)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Sự cố hệ thống (`/system/incidents`): việc không gắn với một hồ sơ nào và lối vào chung cho các sự cố đã chuyển về
 * trang nghiệp vụ của chúng.
 *
 * - Sự kiện trả nợ chờ ghép: xử lý ngay tại đây (chưa ghép được hồ sơ nên không có trang nào khác).
 * - Sự cố theo khoản vay (sai lệch, số liệu cũ, giải ngân chờ ghi lõi, giao dịch tiền chưa ghi xong): chỉ đường sang
 *   danh sách hồ sơ đã lọc hoặc tab "Sau giải ngân" của hồ sơ.
 * - Lệnh góp vốn chưa khớp ví và lệnh rút tiền chờ đối soát: xử lý ở Gọi vốn & Notes và trang chi tiết khách hàng; tài
 *   khoản không mở được hai trang đó thì xử lý ngay tại đây để không mất quyền so với trang Vận hành cũ.
 * Mọi nhóm trống thì cả trang chỉ một dòng "Không có sự cố".
 */
export default function SystemIncidentsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { canView } = usePermission();
  const counts = useSystemIncidentCounts();
  const reconciliation = canView('reconciliation');
  const withdrawal = canView('withdrawal');
  const moneyIncidents = (counts.repayments ?? 0) + (counts.disbursements ?? 0);
  const all = [
    ...(reconciliation ? [counts.quarantine, counts.loans, counts.repayments, counts.disbursements, counts.orders] : []),
    ...(withdrawal ? [counts.withdrawals] : []),
  ];
  const nothing = !counts.isError && all.every((count) => count === 0);

  const refresh = () => {
    dispatch(loanApi.util.invalidateTags(['ServicingOperations', { type: 'AdminApplicationList', id: 'LIST' }]));
    dispatch(paymentApi.util.invalidateTags(['PaymentIncidents']));
    dispatch(investmentApi.util.invalidateTags(['OrderIncidents']));
  };

  let body: ReactNode;
  if (nothing) {
    body = (
      <ServicingCard title="Sự cố">
        <NothingOpen text="Không có sự cố." />
      </ServicingCard>
    );
  } else {
    const pointers = (
      <>
        {reconciliation && (
          <PointerRow
            label="Khoản vay có sai lệch số liệu hoặc chờ ghi hệ thống lõi"
            count={counts.loans}
            to="/loans?servicing=INCIDENT"
            linkLabel="Xem trong Quản lý khoản vay"
          />
        )}
        {reconciliation && canView('funding') && (
          <PointerRow label="Lệnh góp vốn chưa khớp với ví" count={counts.orders} to="/investments/funding" linkLabel="Xem ở Gọi vốn & chuyển nhượng" />
        )}
      </>
    );
    const hasPointers = (reconciliation && (counts.loans ?? 0) > 0)
      || (reconciliation && canView('funding') && (counts.orders ?? 0) > 0);
    const withdrawalIndex = withdrawal && canView('customer') && (counts.withdrawals ?? 0) > 0;
    body = (
      <>
        {reconciliation && <QuarantinePanel />}
        {(hasPointers || withdrawalIndex || (reconciliation && moneyIncidents > 0)) && (
          <ServicingCard title="Sự cố ở trang nghiệp vụ">
            {hasPointers && <ul className="mb-1">{pointers}</ul>}
            {reconciliation && <MoneyIncidentsIndex />}
            {withdrawalIndex && <WithdrawalOwnersIndex />}
          </ServicingCard>
        )}
        {/* Không mở được trang gọi vốn hay trang khách hàng thì xử lý ngay tại đây như trước. */}
        {reconciliation && !canView('funding') && <OrderIncidentsSection />}
        {withdrawal && !canView('customer') && <WithdrawalIncidentsSection />}
      </>
    );
  }

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title">
          <h1>Sự cố hệ thống</h1>
          <p>Việc chưa gắn được với hồ sơ nào và lối vào các sự cố đang mở ở từng trang nghiệp vụ.</p>
        </div>
        <button type="button" className="ui-btn ghost" onClick={refresh}>
          <Icon name="refresh" />
          Làm mới
        </button>
      </header>
      <div className="grid gap-4">{body}</div>
    </section>
  );
}
