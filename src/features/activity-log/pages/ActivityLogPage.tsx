import { useRef, useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { Pager } from '@/components/Pager';
import { toast } from '@/lib/toast';
import { saveBlob } from '@/utils/download';
import { downloadActivityLogCsv, useSearchActivityLogsQuery } from '../api/activityLogApi';
import { ActivityLogDrawer } from '../components/ActivityLogDrawer';
import { ActivityLogFilterBar } from '../components/ActivityLogFilterBar';
import { ActivityLogTable } from '../components/ActivityLogTable';
import { ACTIVITY_PAGE_SIZE, ACTIVITY_REFRESH_MS, RANGE_OPTIONS } from '../constants';
import { entryKey } from '../format';
import { useActivityLogFilters } from '../hooks/useActivityLogFilters';

/** Ô tổng quan trên đầu trang: số lớn, nhãn phụ bên dưới. */
const STAT = 'grid gap-0.5 rounded-lg border border-line bg-card px-3.5 py-3';
const STAT_N = 'text-[20px] font-bold tabular-nums';

const count = (value: number) => value.toLocaleString('vi-VN');

/** Ngày `YYYY-MM-DD` theo giờ Việt Nam thành đầu/cuối ngày ISO có múi giờ cho backend. */
const dayStart = (day: string) => `${day}T00:00:00+07:00`;
const dayEnd = (day: string) => `${day}T23:59:59+07:00`;
const dayLabel = (day: string) => day.split('-').reverse().join('/');

/**
 * Nhật ký hoạt động (chỉ ADMIN): mọi lượt gọi API từ web và mobile qua Gateway, kèm người gọi, nhóm chức năng trả lời,
 * mã trạng thái, body gửi lên đã che và nội dung lỗi. Dữ liệu đọc từ Azure Log Analytics (lưu 30 ngày, chậm vài phút).
 *
 * Bộ lọc, trang và lượt gọi đang mở nằm trên URL (`useActivityLogFilters`). Tự làm mới 30 giây chỉ chạy ở trang đầu
 * và khi không mở ngăn chi tiết: ở trang sau hay đang đọc một lượt gọi mà danh sách tự trôi thì người dùng mất chỗ.
 */
export default function ActivityLogPage() {
  const { filters, filtered, update, clear, setPage, openEntry, closeEntry } = useActivityLogFilters();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [exporting, setExporting] = useState(false);
  const listRef = useRef<HTMLElement>(null);
  // Khoảng tự chọn chỉ gửi khi đã đủ hai ngày; đang chọn dở thì vẫn xem theo 24 giờ qua.
  const custom = filters.range === 'custom' && filters.from && filters.to ? { from: filters.from, to: filters.to } : null;
  const polling = autoRefresh && filters.page === 0 && !filters.open && !custom;

  const searchArgs = {
    range: filters.range === 'custom' ? '24h' as const : filters.range,
    from: custom ? dayStart(custom.from) : undefined,
    to: custom ? dayEnd(custom.to) : undefined,
    includeBackground: filters.showBackground || undefined,
    outcome: filters.outcome ?? undefined,
    method: filters.method || undefined,
    service: filters.service || undefined,
    client: filters.client || undefined,
    q: filters.q || undefined,
  };

  const list = useSearchActivityLogsQuery(
    {
      ...searchArgs,
      page: filters.page,
      size: ACTIVITY_PAGE_SIZE,
    },
    { pollingInterval: polling ? ACTIVITY_REFRESH_MS : 0, skipPollingIfUnfocused: true },
  );
  const data = list.data;
  const entries = data?.content ?? [];
  // Chỉ coi là "đang đổi kết quả" khi tham số đổi (chưa có dữ liệu của tham số mới); tự làm mới thì giữ bảng như cũ.
  const switching = list.isFetching && !list.currentData;
  const open = filters.open ? entries.find((entry) => entryKey(entry) === filters.open) ?? null : null;
  const rangeLabel = custom
    ? `từ ${dayLabel(custom.from)} đến ${dayLabel(custom.to)}`
    : RANGE_OPTIONS.find((option) => option.value === filters.range)?.label.toLowerCase();

  const exportCsv = async () => {
    setExporting(true);
    try {
      saveBlob(await downloadActivityLogCsv(searchArgs), 'nhat-ky-hoat-dong.csv');
      toast.success('Đã tải tệp CSV nhật ký theo bộ lọc đang xem.');
    } catch (error) {
      toast.error(error);
    } finally {
      setExporting(false);
    }
  };
  const capped = data != null && data.totalElements > data.maxRows;

  // Sang trang thì cuộn về đầu bảng (trừ phần header dính), không để người dùng đứng ở cuối trang mới.
  const goToPage = (page: number) => {
    setPage(page);
    const top = listRef.current?.getBoundingClientRect().top;
    if (top !== undefined && top < 64) window.scrollTo({ top: window.scrollY + top - 64 });
  };

  const filterByUser = (user: string) => update({ q: user });

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title">
          <h1>Nhật ký hoạt động</h1>
          <p>Mọi thao tác từ web và ứng dụng di động: gọi API nào, ai gọi, kết quả ra sao và lỗi trả về là gì.</p>
          <p className="act-retention text-[12px] text-muted">Lưu 30 ngày; lượt gọi mới hiện sau khoảng 2-5 phút.</p>
        </div>
        <div className="act-actions flex flex-wrap items-center gap-2">
          <label className="act-toggle inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-secondary">
            <input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} />
            Tự làm mới 30 giây
            {autoRefresh && filters.page > 0 && <span className="act-paused text-muted">(tạm dừng ở trang sau)</span>}
          </label>
          <label className="act-toggle inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-secondary">
            <input
              type="checkbox"
              checked={filters.showBackground}
              onChange={(event) => update({ showBackground: event.target.checked })}
            />
            Hiện lượt gọi tự động
          </label>
          <button type="button" className="ui-btn ghost act-export" onClick={() => void exportCsv()} disabled={exporting || !data}>
            <Icon name="download" />
            {exporting ? 'Đang xuất...' : 'Xuất CSV'}
          </button>
          <button type="button" className="ui-btn ghost" onClick={() => void list.refetch()} disabled={list.isFetching}>
            <Icon name="refresh" />
            {list.isFetching ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>
      </header>

      {data && (
        <div className="act-stats grid grid-cols-3 gap-3" aria-label="Tổng quan nhật ký">
          <div className={STAT}><span className={`act-stat-n ${STAT_N} text-primary`}>{count(data.total)}</span><span className="ui-sub">lượt gọi trong {rangeLabel}</span></div>
          <div className={STAT}><span className={`act-stat-n warn ${STAT_N} text-warning`}>{count(data.clientErrors)}</span><span className="ui-sub">lỗi yêu cầu (4xx)</span></div>
          <div className={STAT}><span className={`act-stat-n bad ${STAT_N} text-danger`}>{count(data.serverErrors)}</span><span className="ui-sub">lỗi hệ thống (5xx)</span></div>
        </div>
      )}

      <section ref={listRef} className="ui-card act-list px-3.5 pt-3.5 pb-3" aria-label="Danh sách lượt gọi API">
        <ActivityLogFilterBar filters={filters} filtered={filtered} onChange={update} onClear={clear} />

        {list.error ? (
          <ErrorNotice error={list.error} onRetry={list.refetch} />
        ) : list.isLoading ? (
          <div className="ui-empty" aria-busy="true">Đang tải nhật ký...</div>
        ) : entries.length === 0 && !switching ? (
          <div className="ui-empty">
            {filtered ? 'Không có lượt gọi nào khớp bộ lọc.' : `Chưa có lượt gọi nào trong ${rangeLabel}.`}
          </div>
        ) : (
          <div className={switching ? 'ui-busy' : undefined} aria-busy={switching || undefined}>
            <ActivityLogTable entries={entries} openKey={filters.open} onOpen={(entry) => openEntry(entryKey(entry))} />
            {capped && (
              <p className="act-capped mt-2.5 text-[12px] text-muted">
                Chỉ xem được {count(data.maxRows)} lượt gần nhất, thu hẹp bộ lọc để xem cũ hơn.
              </p>
            )}
            <Pager
              page={filters.page}
              size={ACTIVITY_PAGE_SIZE}
              total={Math.min(data?.totalElements ?? 0, data?.maxRows ?? 0)}
              unit="lượt gọi"
              disabled={switching}
              onPage={goToPage}
            />
          </div>
        )}
      </section>

      {open && (
        <ActivityLogDrawer
          key={entryKey(open)}
          entry={open}
          onClose={closeEntry}
          onFilterUser={filterByUser}
          onCopied={(message) => toast.success(message)}
        />
      )}
    </section>
  );
}
