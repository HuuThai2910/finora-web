import { useLocation, useSearchParams } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Pager } from '@/components/Pager';
import { SearchBox } from '@/components/SearchBox';
import { StatusPill } from '@/components/StatusPill';
import { useGetListingNotesQuery } from '../../api/orderBookApi';
import { MARKET_PAGE_SIZE } from '../../constant';
import { formatPrice } from '../../formatters';
import { PartyName } from '../PartyName';

function readPage(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 1 ? parsed - 1 : 0;
}

/**
 * Tab Phần vốn của sổ lệnh: từng phần vốn của khoản vay theo thứ tự phát hành, ai đang nắm giữ, ai góp ban đầu, đã đổi
 * chủ mấy lần, có đang rao bán không. Tìm theo mã phần vốn hoặc họ tên người nắm giữ (ở server); ô tìm và trang nằm trên
 * URL (`nq`, `page`).
 */
export function BookNotesTab({ listingId, total }: { listingId: number; total: number }) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = (searchParams.get('nq') ?? '').trim();
  const page = readPage(searchParams.get('page'));
  const notes = useGetListingNotesQuery({ listingId, q: search || undefined, page, size: MARKET_PAGE_SIZE });
  const rows = notes.data?.content ?? [];

  const updateParam = (key: string, value: string, replace = false) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.delete('page');
    setSearchParams(params, { replace, state: location.state });
  };

  return (
    <article className="ui-card pt-3.5 px-3.5 pb-3 max-[760px]:px-2.5">
      <div className="mb-3">
        <SearchBox
          className="w-80 max-[760px]:w-full"
          value={search}
          onSearch={(next) => updateParam('nq', next, true)}
          label="Tìm phần vốn"
          placeholder="Tìm mã phần vốn hoặc người nắm giữ"
        />
      </div>
      {notes.error ? (
        <ErrorNotice error={notes.error} onRetry={notes.refetch} />
      ) : notes.isLoading ? (
        <div className="ui-empty" aria-busy="true">Đang tải phần vốn...</div>
      ) : rows.length === 0 ? (
        <div className="ui-empty">{search ? `Không có phần vốn nào khớp "${search}".` : 'Khoản vay chưa có phần vốn.'}</div>
      ) : (
        <div className={notes.isFetching ? 'ui-busy' : undefined}>
          <div className="ui-table-wrap">
            <table className="ui-table [&_td]:px-2 [&_th]:px-2">
              <thead>
                <tr>
                  <th>Mã phần vốn</th>
                  <th>Người đang nắm giữ</th>
                  <th className="max-[760px]:hidden">Người góp ban đầu</th>
                  <th className="num">Chuyển nhượng</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((note) => (
                  <tr key={note.noteId}>
                    <td className="ui-mono">{note.noteNumber}</td>
                    <td><PartyName userId={note.holderId} name={note.holderName} plain /></td>
                    <td className="text-muted max-[760px]:hidden">{note.originalInvestorName ?? 'Chưa có họ tên'}</td>
                    <td className="num">
                      {note.transferCount > 0 ? `${note.transferCount} lần` : <span className="text-muted">Chưa</span>}
                    </td>
                    <td>
                      {note.status === 'CLOSED' ? (
                        <StatusPill tone="neutral" dot small>Đã tất toán</StatusPill>
                      ) : note.askPricePercent != null ? (
                        <StatusPill tone="info" dot small>Đang rao bán {formatPrice(note.askPricePercent)}</StatusPill>
                      ) : (
                        <StatusPill tone="neutral" dot small>Đang nắm giữ</StatusPill>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager
            page={page}
            size={MARKET_PAGE_SIZE}
            total={notes.data?.totalElements ?? total}
            unit="phần vốn"
            disabled={notes.isFetching}
            onPage={(next) => updateParam('page', next > 0 ? String(next + 1) : '')}
          />
        </div>
      )}
    </article>
  );
}
