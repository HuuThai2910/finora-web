import { useState } from 'react';
import { EMPTY, formatNumber, parseDecimal } from '@/utils';
import { useGetSecondaryListingsQuery } from '../api/secondaryMarketApi';
import { FEE_RATE_PERCENT } from '../constant';
import type { NoteListing, NoteListingStatus } from '../types';
import { SecondaryListingTable, SecondaryListingTableSkeleton } from './SecondaryListingTable';
import './css/SecondaryMarketPage.css';

const PAGE_SIZE = 20;

type StatusFilter = 'ALL' | NoteListingStatus;

const STATUS_TABS: ReadonlyArray<{ value: StatusFilter; label: string; hint: string }> = [
  { value: 'ALL', label: 'Tất cả', hint: 'Mọi tin trên chợ' },
  { value: 'OPEN', label: 'Đang bán', hint: 'Note đang chờ người mua' },
  { value: 'SOLD', label: 'Đã bán', hint: 'Note đã đổi chủ' },
  { value: 'CANCELLED', label: 'Đã rút', hint: 'Người bán rút tin' },
];

/** Tổng phí đã thu trên các tin đã bán trong trang đang xem. */
function collectedFee(listings: NoteListing[]): string {
  const total = listings
    .filter((item) => item.status === 'SOLD')
    .reduce((sum, item) => sum + (parseDecimal(item.platformFee) ?? 0), 0);
  return formatNumber(total);
}

/**
 * Giám sát chợ thứ cấp Notes.
 *
 * Trang này **chỉ đọc**. Đăng bán và mua là việc của nhà đầu tư trên app: backend lấy danh tính từ
 * token, nên nếu quản trị bấm mua thì Note sẽ chuyển sang chính tài khoản quản trị — sai nghiệp vụ.
 *
 * Việc của quản trị ở đây là theo dõi: Note nào đang treo bán, giá so với dư nợ gốc thế nào, ai
 * bán cho ai, nền tảng thu được bao nhiêu phí, và có Note nợ xấu nào đang được bán không.
 *
 * Backend hiện chỉ trả tin **đang mở** qua `GET /secondary/listings`. Các tab còn lại lọc trên
 * trang đang xem, nên số đếm chỉ đúng trong phạm vi trang — ghi rõ trên giao diện để không đọc
 * nhầm thành số liệu toàn hệ thống.
 */
export function SecondaryMarketPage() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<StatusFilter>('ALL');

  const { data, isLoading, isError, isFetching, refetch } = useGetSecondaryListingsQuery({
    page,
    size: PAGE_SIZE,
  });

  const all = data?.content ?? [];
  const listings = status === 'ALL' ? all : all.filter((item) => item.status === status);
  const totalPages = Math.max(data?.totalPages ?? 1, 1);
  const defaultedCount = all.filter((item) => item.defaulted).length;

  const selectStatus = (next: StatusFilter) => {
    setStatus(next);
    setPage(0);
  };

  return (
    <div className="inv-page">
      <header className="inv-header">
        <div>
          <h1 className="inv-title">Chợ thứ cấp Notes</h1>
          <p className="inv-lead">
            Nhà đầu tư treo bán Note để lấy tiền trước hạn; nhà đầu tư khác mua lại và nhận quyền
            hưởng gốc lãi còn lại. Giá bán không vượt dư nợ gốc, nền tảng thu{' '}
            <strong>{FEE_RATE_PERCENT}%</strong> trên giá bán, trừ vào tiền người bán nhận.
          </p>
        </div>
        <div className="inv-header-actions">
          <span className="inv-settings-chip" title="Phí đã thu trên trang đang xem">
            Phí đã thu {collectedFee(all)} đ
          </span>
          <button
            type="button"
            className="inv-btn inv-btn-ghost"
            disabled={isFetching}
            onClick={() => refetch()}
          >
            {isFetching ? 'Đang tải…' : 'Tải lại'}
          </button>
        </div>
      </header>

      {/* Người vay không liên quan tới giao dịch này — nói rõ để quản trị không đi tìm ảnh hưởng
          lên lịch trả nợ. */}
      <div className="sm-note" role="note">
        Chuyển nhượng Note <strong>không</strong> đổi nghĩa vụ của người vay: họ vẫn trả đúng lịch
        và đúng số tiền, chỉ đích đến của phần tiền đó đổi sang người mua.
      </div>

      <div className="sm-tabs" role="tablist" aria-label="Trạng thái tin đăng bán">
        {STATUS_TABS.map((tab) => {
          const count =
            tab.value === 'ALL' ? all.length : all.filter((item) => item.status === tab.value).length;
          const selected = status === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`inv-stage-card${selected ? ' is-active' : ''}`}
              onClick={() => selectStatus(tab.value)}
            >
              <span className="inv-stage-label">{tab.label}</span>
              <span className="inv-stage-count">{isLoading ? EMPTY : count}</span>
              <span className="inv-stage-hint">{tab.hint}</span>
            </button>
          );
        })}
      </div>

      {defaultedCount > 0 && (
        <div className="inv-error inv-error-row" role="alert">
          <span>
            Có {defaultedCount} Note thuộc khoản vay đang nợ xấu đang được treo bán. Người mua được
            cảnh báo trước khi xác nhận, nhưng nên theo dõi nhóm này.
          </span>
        </div>
      )}

      {isLoading && <SecondaryListingTableSkeleton />}

      {isError && (
        <div className="inv-error" role="alert">
          Không tải được bảng tin chợ thứ cấp.{' '}
          <button type="button" className="inv-link" onClick={() => refetch()}>
            Thử lại
          </button>
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <div className={isFetching ? 'inv-refreshing' : undefined}>
            <SecondaryListingTable listings={listings} isFiltered={status !== 'ALL'} />
          </div>

          {all.length > 0 && (
            <div className="inv-pager">
              <span className="inv-muted">
                Trang {page + 1} / {totalPages}
                <span className="inv-dot" aria-hidden="true" />
                {data?.totalElements ?? 0} tin đang bán
              </span>
              <div className="inv-actions">
                <button
                  type="button"
                  className="inv-btn sm inv-btn-ghost"
                  disabled={page === 0 || isFetching}
                  onClick={() => setPage((current) => Math.max(current - 1, 0))}
                >
                  Trang trước
                </button>
                <button
                  type="button"
                  className="inv-btn sm inv-btn-ghost"
                  disabled={(data?.last ?? true) || isFetching}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Trang sau
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
