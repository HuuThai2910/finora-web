import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import {
  DateRangeField,
  FilterBar,
  RangeField,
  SelectField,
  rangeChipLabel,
  rangeError,
  shortDate,
  useUrlFilters,
  type FilterChip,
} from '@/components/filters';
import { Icon } from '@/components/Icon';
import { Pager } from '@/components/Pager';
import { StatusPill } from '@/components/StatusPill';
import { fromListState } from '@/lib/navigation';
import { formatDateTime } from '@/utils';
import { useGetAdminTradesQuery } from '../../api/orderBookApi';
import {
  MARKET_PAGE_SIZE,
  TRADE_PROGRESSES,
  TRADE_PROGRESS_META,
  isTradeProgress,
  tradeDetailPath,
} from '../../constant';
import { formatMoneyVnd, formatPrice } from '../../formatters';
import type { AdminOrderBookDetail, TradeProgress } from '../../types';

/** Bộ lọc của tab trên URL (cùng trang chi tiết sổ); ô tìm là `tq`, trang là `page`. */
const FILTER_KEYS = ['progress', 'from', 'to', 'amountMin', 'amountMax'] as const;
const MILLION = 1_000_000;

const toVnd = (millions: string) => (millions ? String(Number(millions) * MILLION) : undefined);
const millionsLabel = (value: string) => `${value} triệu`;

function readPage(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 1 ? parsed - 1 : 0;
}

/** Số lần khớp mỗi chặng lấy từ chi tiết sổ (đếm ở server trên toàn bộ lần khớp của sổ). */
function progressCount(book: AdminOrderBookDetail, progress: TradeProgress): number {
  if (progress === 'SETTLING') return book.settlingTrades;
  if (progress === 'DOC_PENDING') return book.documentPendingTrades;
  return book.completedTrades;
}

/**
 * Tab Giao dịch của sổ lệnh: các lần khớp mới nhất trước, tìm theo tên người bán/người mua, lọc theo chặng, ngày khớp và
 * số tiền (nhập theo triệu đồng, gửi backend bằng đồng). Lọc ở server; bấm một dòng để mở chi tiết giao dịch.
 */
export function BookTradesTab({ book }: { book: AdminOrderBookDetail }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useUrlFilters(FILTER_KEYS);
  const { applied, draft } = filters;
  const party = (searchParams.get('tq') ?? '').trim();
  const page = readPage(searchParams.get('page'));
  const progress = isTradeProgress(applied.progress) ? applied.progress : undefined;

  const trades = useGetAdminTradesQuery({
    listingId: book.listingId,
    party: party.length >= 2 ? party : undefined,
    progress,
    executedFrom: applied.from || undefined,
    executedTo: applied.to || undefined,
    amountMin: toVnd(applied.amountMin),
    amountMax: toVnd(applied.amountMax),
    page,
    size: MARKET_PAGE_SIZE,
  });
  const rows = trades.data?.content ?? [];
  const errors = {
    date: rangeError(draft.from, draft.to, false),
    amount: rangeError(draft.amountMin, draft.amountMax),
  };

  const chips: FilterChip[] = [];
  if (progress) chips.push({ key: 'progress', label: `Trạng thái: ${TRADE_PROGRESS_META[progress].label}`, onRemove: () => filters.remove('progress') });
  if (applied.from || applied.to) {
    chips.push({ key: 'date', label: rangeChipLabel('Ngày khớp', applied.from, applied.to, shortDate), onRemove: () => filters.remove('from', 'to') });
  }
  if (applied.amountMin || applied.amountMax) {
    chips.push({
      key: 'amount',
      label: rangeChipLabel('Số tiền', applied.amountMin, applied.amountMax, millionsLabel),
      onRemove: () => filters.remove('amountMin', 'amountMax'),
    });
  }
  const total = book.settlingTrades + book.documentPendingTrades + book.completedTrades;

  const updateParam = (key: string, value: string, replace = false) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.delete('page');
    setSearchParams(params, { replace, state: location.state });
  };
  // Chi tiết giao dịch nhớ URL của tab này (bộ lọc, trang) để breadcrumb "Sổ lệnh" quay lại đúng chỗ.
  const backState = fromListState(location);

  return (
    <article className="ui-card pt-3.5 px-3.5 pb-3 max-[760px]:px-2.5">
      <FilterBar
        className="mb-3"
        search={{
          value: party,
          onSearch: (next) => updateParam('tq', next, true),
          label: 'Tìm giao dịch theo tên',
          placeholder: 'Tìm theo tên người bán, người mua',
        }}
        activeCount={chips.length}
        chips={chips}
        onOpen={filters.resetDraft}
        onApply={() => {
          if (errors.date || errors.amount) return false;
          filters.applyDraft();
          return true;
        }}
        onClearAll={filters.clearAll}
        title="Lọc giao dịch"
      >
        <SelectField
          label="Trạng thái"
          value={isTradeProgress(draft.progress) ? draft.progress : ''}
          allLabel={`Tất cả trạng thái (${total})`}
          options={TRADE_PROGRESSES.map((value) => ({
            value, label: TRADE_PROGRESS_META[value].label, count: progressCount(book, value),
          }))}
          onChange={(value) => filters.setDraft({ progress: value })}
        />
        <DateRangeField
          label="Ngày khớp"
          from={draft.from}
          to={draft.to}
          error={errors.date}
          onChange={(from, to) => filters.setDraft({ from, to })}
        />
        <RangeField
          label="Số tiền (triệu đồng)"
          min={draft.amountMin}
          max={draft.amountMax}
          error={errors.amount}
          onChange={(min, max) => filters.setDraft({ amountMin: min, amountMax: max })}
        />
      </FilterBar>

      {trades.error ? (
        <ErrorNotice error={trades.error} onRetry={trades.refetch} />
      ) : trades.isLoading ? (
        <div className="ui-empty" aria-busy="true">Đang tải giao dịch...</div>
      ) : rows.length === 0 ? (
        <div className="ui-empty">{total === 0 ? 'Chưa có lần khớp nào.' : 'Không có giao dịch nào khớp.'}</div>
      ) : (
        <div className={trades.isFetching ? 'ui-busy' : undefined}>
          <div className="ui-table-wrap">
            <table className="ui-table list [&_td]:px-2 [&_th]:px-2">
              <thead>
                <tr>
                  <th>Thời điểm khớp</th>
                  <th>Hai bên</th>
                  <th className="num">Giá</th>
                  <th className="num">Số tiền</th>
                  <th>Trạng thái</th>
                  <th><span className="ui-sr-only">Thao tác</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((trade) => {
                  const meta = TRADE_PROGRESS_META[trade.progress] ?? { label: trade.progress, tone: 'neutral' as const };
                  const path = tradeDetailPath(book.listingId, trade.tradeReference);
                  return (
                    <tr
                      key={trade.tradeReference}
                      className="clickable"
                      tabIndex={0}
                      onClick={(event) => {
                        if ((event.target as HTMLElement).closest('a')) return;
                        navigate(path, { state: backState });
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && event.target === event.currentTarget) navigate(path, { state: backState });
                      }}
                    >
                      <td>{formatDateTime(trade.executedAt)}</td>
                      <td>
                        <div className="grid gap-0.5 text-[13px]">
                          <span><span className="inline-block w-8.5 text-muted text-[12px]">Bán</span>{trade.sellerName ?? 'Chưa có họ tên'}</span>
                          <span><span className="inline-block w-8.5 text-muted text-[12px]">Mua</span>{trade.buyerName ?? 'Chưa có họ tên'}</span>
                        </div>
                      </td>
                      <td className="num">{formatPrice(trade.pricePercent)}</td>
                      <td className="num">
                        <span className="strong">{formatMoneyVnd(trade.amount)}</span>
                        <span className="ui-sub">{trade.quantity} phần vốn</span>
                      </td>
                      <td><StatusPill tone={meta.tone} dot>{meta.label}</StatusPill></td>
                      <td className="num">
                        <Link className="ui-btn soft" to={path} state={backState}>
                          Chi tiết
                          <Icon name="arrowRight" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pager
            page={page}
            size={MARKET_PAGE_SIZE}
            total={trades.data?.totalElements ?? 0}
            unit="giao dịch"
            disabled={trades.isFetching}
            onPage={(next) => updateParam('page', next > 0 ? String(next + 1) : '')}
          />
        </div>
      )}
    </article>
  );
}
