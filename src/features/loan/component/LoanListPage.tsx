import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toUiApiError } from '@/lib/api/errors';
import { useGetAdminApplicationsQuery } from '../api/loanReviewApi';
import { APPLICATION_STATUS_LABELS, formatDateTime, formatMoney } from '../formatters';
import type { LoanApplicationStatus } from '../types';
import './LoanReview.css';

type ApplicationFilter = 'ALL' | Extract<LoanApplicationStatus, 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'>;

const FILTERS: Array<{ value: ApplicationFilter; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PENDING_REVIEW', label: 'Chờ thẩm định' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Đã từ chối' },
];

function isApplicationFilter(value: string | null): value is ApplicationFilter {
  return value === 'PENDING_REVIEW' || value === 'APPROVED' || value === 'REJECTED';
}

export default function LoanListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedStatus = searchParams.get('status');
  const filter: ApplicationFilter = isApplicationFilter(requestedStatus) ? requestedStatus : 'ALL';
  const [page, setPage] = useState(0);
  const { data, isLoading, isFetching, error, refetch } = useGetAdminApplicationsQuery({
    status: filter === 'ALL' ? undefined : filter,
    page,
    size: 20,
  });

  return (
    <section className="review-page">
      <header className="review-heading">
        <div>
          <h1>Quản lý hồ sơ vay</h1>
          <p>Theo dõi tiến trình xử lý, xem kết quả đánh giá và thẩm định các hồ sơ đã sẵn sàng.</p>
        </div>
        <button className="review-button secondary" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? 'Đang tải...' : 'Làm mới'}
        </button>
      </header>

      <div className="review-tabs" aria-label="Lọc trạng thái hồ sơ">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            className={filter === item.value ? 'active' : ''}
            onClick={() => {
              setPage(0);
              setSearchParams(item.value === 'ALL' ? {} : { status: item.value });
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isLoading && <div className="review-state">Đang tải danh sách hồ sơ...</div>}
      {error && <div className="review-state error">{toUiApiError(error).message}</div>}
      {!isLoading && !error && data?.data.length === 0 && (
        <div className="review-state">Không có hồ sơ ở trạng thái này.</div>
      )}

      {data && data.data.length > 0 && (
        <div className="review-card review-table-wrap">
          <table className="review-table">
            <thead>
              <tr>
                <th>Hồ sơ</th><th>Người vay</th><th>Khoản vay</th><th>AI</th><th>Nộp lúc</th><th />
              </tr>
            </thead>
            <tbody>
              {data.data.map((application) => (
                <tr key={application.applicationNumber}>
                  <td>
                    <strong>{application.applicationNumber}</strong>
                    <span className="review-muted">{APPLICATION_STATUS_LABELS[application.status]}</span>
                  </td>
                  <td>{application.borrowerId}</td>
                  <td>
                    <strong>{formatMoney(application.requestedAmount)}</strong>
                    <span className="review-muted">{application.requestedTermMonths} tháng · {application.annualInterestRate}%/năm</span>
                  </td>
                  <td>
                    <strong>{application.assessment?.riskScore ?? '—'}</strong>
                    <span className="review-muted">Hạng {application.assessment?.creditGrade ?? '—'}</span>
                  </td>
                  <td>{formatDateTime(application.submittedAt)}</td>
                  <td>
                    <Link className="review-link" to={`/loans/${application.applicationNumber}/review`}>
                      {application.status === 'PENDING_REVIEW' ? 'Thẩm định' : 'Xem chi tiết'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <footer className="review-pagination">
        <span>Trang {page + 1} · {data?.totalElements ?? 0} hồ sơ</span>
        <div>
          <button disabled={page === 0 || isFetching} onClick={() => setPage((value) => value - 1)}>Trang trước</button>
          <button
            disabled={(page + 1) * 20 >= (data?.totalElements ?? 0) || isFetching}
            onClick={() => setPage((value) => value + 1)}
          >Trang sau</button>
        </div>
      </footer>
    </section>
  );
}
