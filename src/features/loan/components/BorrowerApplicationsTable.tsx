import { Link } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import { StatusPill } from '@/components/StatusPill';
import { formatCurrency, formatDate } from '@/utils/format';
import { useGetAdminApplicationsQuery } from '../api/loanReviewApi';
import { SERVICING_FLAG_LABELS } from '../constant';
import { APPLICATION_STATUS_LABELS, formatBusinessLabel } from '../formatters';
import { applicationStatusTone } from '../mappers/applicationListDisplay';

/** Số hồ sơ tải một lần cho tab Hồ sơ vay của hộp chi tiết khách hàng. */
const PAGE_SIZE = 20;

/** Tổng số hồ sơ vay của một người vay (số trên tab); dùng chung cache với bảng bên dưới. */
export function useBorrowerApplicationCount(borrowerId: string, skip = false): number | undefined {
  return useGetAdminApplicationsQuery({ borrowerId, page: 0, size: PAGE_SIZE }, { skip }).data?.totalElements;
}

/**
 * Hồ sơ vay của một người vay ở hộp chi tiết khách hàng, mới nhất trước (backend lọc theo `borrowerId`). Hồ sơ đã có
 * mã khoản vay là đã giải ngân; nhãn quá hạn, chờ cơ cấu, sự cố đứng sau nhãn trạng thái.
 */
export function BorrowerApplicationsTable({ borrowerId }: { borrowerId: string }) {
  const query = useGetAdminApplicationsQuery({ borrowerId, page: 0, size: PAGE_SIZE });
  const rows = query.data?.data ?? [];
  const total = query.data?.totalElements ?? 0;

  if (query.error) return <ErrorNotice error={query.error} onRetry={query.refetch} />;
  if (query.isLoading) return <p className="ui-empty" aria-busy="true">Đang tải hồ sơ vay...</p>;
  if (rows.length === 0) return <p className="ui-empty">Khách chưa nộp hồ sơ vay.</p>;

  return (
    <>
      <div className="ui-table-wrap">
        <table className="ui-table">
          <thead>
            <tr>
              <th>Mã hồ sơ</th>
              <th className="max-[760px]:hidden">Mục đích</th>
              <th className="num max-[760px]:hidden">Số tiền</th>
              <th className="max-[760px]:hidden">Ngày nộp</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.applicationNumber}>
                <td>
                  <Link className="ui-link" to={`/loans/${encodeURIComponent(item.applicationNumber)}/review`}>
                    {item.applicationCode || item.applicationNumber}
                  </Link>
                </td>
                <td className="min-w-40 whitespace-normal max-[760px]:hidden">{formatBusinessLabel(item.purposeCode)}</td>
                <td className="num max-[760px]:hidden">{formatCurrency(item.requestedAmount)}</td>
                <td className="max-[760px]:hidden">{formatDate(item.submittedAt)}</td>
                <td className="min-w-28 whitespace-normal [&_.ui-pill]:my-0.5 [&_.ui-pill]:mr-1.5">
                  {item.loanNumber
                    ? <StatusPill tone="success" small>Đã giải ngân</StatusPill>
                    : (
                      <StatusPill tone={applicationStatusTone(item.status)} small>
                        {APPLICATION_STATUS_LABELS[item.status] ?? 'Không rõ'}
                      </StatusPill>
                    )}
                  {(item.servicingFlags ?? []).map((flag) => (
                    <StatusPill key={flag} tone={SERVICING_FLAG_LABELS[flag]?.tone ?? 'warning'} small>
                      {SERVICING_FLAG_LABELS[flag]?.label ?? 'Cần xử lý'}
                    </StatusPill>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > rows.length && (
        <p className="mt-2 text-[12px] text-muted">Đang hiện {rows.length} hồ sơ mới nhất trên tổng {total}.</p>
      )}
    </>
  );
}
