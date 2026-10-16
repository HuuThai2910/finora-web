import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { Pager } from '@/components/Pager';
import { useGetEkycAttemptsQuery } from '../api/ekycReviewQueries';
import { AttemptTable } from '../components/AttemptTable';
import {
  ATTEMPT_FILTERS,
  DEFAULT_ATTEMPT_FILTER,
  EKYC_REVIEW_PAGE_SIZE,
  EMPTY_LIST_TEXT,
  isAttemptFilter,
} from '../constants';
import { attemptStatusDisplay } from '../mappers/attemptDisplay';
import type { EkycAttemptStatus } from '../types';
import './EkycReviewListPage.css';

/** Đọc số trang từ URL (tính từ 1 cho dễ đọc), trả về chỉ số từ 0 như backend. */
function readPage(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 1 ? parsed - 1 : 0;
}

/**
 * Danh sách lượt eKYC theo trạng thái (`GET /admin/users/ekyc-attempts`), mặc định hàng chờ duyệt tay.
 * Trạng thái và trang nằm trên URL để chia sẻ đường dẫn và giữ chỗ khi quay lại; thứ tự dòng do backend quyết.
 */
export default function EkycReviewListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('status');
  const status: EkycAttemptStatus = isAttemptFilter(requested) ? requested : DEFAULT_ATTEMPT_FILTER;
  const page = readPage(searchParams.get('page'));

  const list = useGetEkycAttemptsQuery({ status, page, size: EKYC_REVIEW_PAGE_SIZE });
  const attempts = list.data?.content ?? [];
  const total = list.data?.totalElements ?? 0;

  const updateQuery = (nextStatus: EkycAttemptStatus, nextPage: number) => {
    const params: Record<string, string> = {};
    if (nextStatus !== DEFAULT_ATTEMPT_FILTER) params.status = nextStatus;
    if (nextPage > 0) params.page = String(nextPage + 1);
    setSearchParams(params);
  };

  let body: ReactNode;
  if (list.error) {
    body = <ErrorNotice error={list.error} onRetry={list.refetch} />;
  } else if (list.isLoading) {
    body = <div className="ui-empty" aria-busy="true">Đang tải danh sách lượt eKYC...</div>;
  } else if (attempts.length === 0 && page > 0 && total > 0) {
    // Trang trên URL đã vượt số trang (ví dụ vừa duyệt hết dòng của trang cuối).
    body = (
      <div className="ui-empty">
        Trang này không còn lượt nào.{' '}
        <button type="button" className="ui-link" onClick={() => updateQuery(status, 0)}>Về trang đầu</button>
      </div>
    );
  } else if (attempts.length === 0) {
    body = <div className="ui-empty">{EMPTY_LIST_TEXT[status]}</div>;
  } else {
    body = (
      <div className={list.isFetching ? 'ui-busy' : undefined}>
        <AttemptTable attempts={attempts} />
        <Pager
          page={page}
          size={EKYC_REVIEW_PAGE_SIZE}
          total={total}
          unit="lượt"
          disabled={list.isFetching}
          onPage={(next) => updateQuery(status, next)}
        />
      </div>
    );
  }

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title">
          <h1>Duyệt eKYC</h1>
          <p>Đối chiếu ảnh thẻ, video kiểm tra khuôn mặt và thông tin đọc được của từng lượt; duyệt hoặc từ chối lượt chờ duyệt tay.</p>
        </div>
        <button type="button" className="ui-btn ghost" onClick={() => void list.refetch()} disabled={list.isFetching}>
          <Icon name="refresh" />
          {list.isFetching ? 'Đang tải...' : 'Làm mới'}
        </button>
      </header>

      <section className="ui-card ekr-list" aria-label="Danh sách lượt eKYC">
        <div className="ekr-list-bar">
          <div className="ui-tabs" role="tablist" aria-label="Lọc trạng thái lượt eKYC">
            {ATTEMPT_FILTERS.map((tab) => (
              <button key={tab} type="button" role="tab" aria-selected={status === tab} onClick={() => updateQuery(tab, 0)}>
                {attemptStatusDisplay(tab).label}
              </button>
            ))}
          </div>
        </div>
        {body}
      </section>
    </section>
  );
}
