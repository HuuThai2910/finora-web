import { Link } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import { StatusPill } from '@/components/StatusPill';
import { formatCurrency, formatDate } from '@/utils/format';
import { useGetAdminApplicationsQuery } from '../api/loanReviewApi';
import { APPLICATION_STATUS_LABELS } from '../formatters';
import { applicationStatusTone } from '../mappers/applicationListDisplay';
import type { LoanApplicationStatus } from '../types';

interface BorrowerApplicationsCardProps {
  /** ID người dùng ở finora-user (cũng là `borrowerId` của hồ sơ vay). */
  borrowerId: string;
  title: string;
  /** Bỏ hồ sơ đang xem khỏi danh sách (trang thẩm định). */
  excludeApplicationNumber?: string;
  /** Số hồ sơ tối đa hiện; còn nhiều hơn thì có link sang danh sách đầy đủ. */
  limit?: number;
  emptyText: string;
}

/**
 * Các hồ sơ vay của một người vay, lọc ở backend theo `borrowerId`: dùng ở trang khách hàng và mục "Hồ sơ khác của
 * cùng người vay" ở trang thẩm định.
 */
export function BorrowerApplicationsCard({
  borrowerId, title, excludeApplicationNumber, limit = 10, emptyText,
}: BorrowerApplicationsCardProps) {
  // Lấy dư một dòng để vẫn đủ `limit` dòng sau khi bỏ hồ sơ đang xem.
  const query = useGetAdminApplicationsQuery({ borrowerId, page: 0, size: limit + 1 });
  const rows = (query.data?.data ?? [])
    .filter((item) => item.applicationNumber !== excludeApplicationNumber)
    .slice(0, limit);
  const total = Math.max((query.data?.totalElements ?? 0) - (excludeApplicationNumber ? 1 : 0), 0);

  return (
    <section className="ui-card borrower-apps pt-3.5 px-4.5 pb-4 max-[600px]:px-3.5" aria-label={title}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold leading-[1.4]">{title}</h2>
        {query.data && <span className="text-[12px] text-muted">{total} hồ sơ</span>}
      </div>
      {query.error ? (
        <ErrorNotice error={query.error} onRetry={query.refetch} />
      ) : query.isLoading ? (
        <p className="ui-empty" aria-busy="true">Đang tải hồ sơ vay...</p>
      ) : rows.length === 0 ? (
        <p className="ui-empty">{emptyText}</p>
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Mã hồ sơ</th>
                <th className="num">Số tiền</th>
                <th>Kỳ hạn</th>
                <th>Trạng thái</th>
                <th>Ngày nộp</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.applicationNumber}>
                  <td>
                    <Link className="ui-link ui-mono" to={`/loans/${encodeURIComponent(item.applicationNumber)}/review`}>
                      {item.applicationNumber}
                    </Link>
                  </td>
                  <td className="num">{formatCurrency(item.requestedAmount)}</td>
                  <td>{item.requestedTermMonths} tháng</td>
                  <td>
                    <StatusPill tone={applicationStatusTone(item.status)} small>
                      {APPLICATION_STATUS_LABELS[item.status as LoanApplicationStatus] ?? 'Không rõ'}
                    </StatusPill>
                  </td>
                  <td>{formatDate(item.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {total > rows.length && rows.length > 0 && (
        <p className="mt-2 text-[12px] text-muted">Đang hiện {rows.length} hồ sơ mới nhất trên tổng {total}.</p>
      )}
    </section>
  );
}
