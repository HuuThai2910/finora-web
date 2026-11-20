import { useRef, useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { FilterBar, FilterField, SelectField, type FilterChip } from '@/components/filters';
import { Icon } from '@/components/Icon';
import { Pager } from '@/components/Pager';
import { toast } from '@/lib/toast';
import { saveBlob } from '@/utils/download';
import { downloadActivityLogCsv, useSearchActivityLogsQuery } from '../api/activityLogApi';
import { ActivityLogDetailModal } from '../components/ActivityLogDetailModal';
import { ActivityLogTable } from '../components/ActivityLogTable';
import {
  ACTIVITY_PAGE_SIZE, ACTIVITY_REFRESH_MS, CLIENT_FILTER_OPTIONS, CLIENT_LABELS, KIND_OPTIONS, OUTCOME_OPTIONS, RANGE_OPTIONS,
  SERVICE_LABELS,
} from '../constants';
import { entryKey } from '../format';
import {
  EMPTY_PANEL_FILTERS, useActivityLogFilters, type ActivityPanelFilters,
} from '../hooks/useActivityLogFilters';
import type { ActivityLogPage as ActivityLogPageData, ActivityOutcome, ActivityRange } from '../types';

/** Ngày `YYYY-MM-DD` theo giờ Việt Nam thành đầu/cuối ngày ISO có múi giờ cho backend. */
const dayStart = (day: string) => `${day}T00:00:00+07:00`;
const dayEnd = (day: string) => `${day}T23:59:59+07:00`;

/** Số lượt theo kết quả trong khoảng thời gian đang xem (API đếm không theo bộ lọc khác). */
function outcomeCount(data: ActivityLogPageData | undefined, outcome: ActivityOutcome): number | undefined {
  if (!data) return undefined;
  const errors = data.clientErrors + data.serverErrors;
  return outcome === 'ERROR' ? errors : data.total - errors;
}

const TOGGLE = 'h-8 rounded-md border border-line-strong bg-white text-[13px] font-semibold text-secondary hover:bg-surface-muted '
  + 'aria-pressed:border-brand aria-pressed:bg-brand-50 aria-pressed:text-brand';

/** Hai nút bật/tắt chọn một (bấm lại thì bỏ chọn). */
function ToggleOne<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T | '';
  options: Array<{ value: T; label: string }>;
  onChange: (value: T | '') => void;
}) {
  return (
    <FilterField label={label}>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            className={TOGGLE}
            onClick={() => onChange(value === option.value ? '' : option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </FilterField>
  );
}

/**
 * Nhật ký hoạt động (chỉ ADMIN): mọi lượt gọi API từ web và mobile qua Gateway, kèm người gọi, kết quả, body gửi lên đã
 * che và nội dung lỗi. Dữ liệu đọc từ Azure Log Analytics (lưu 30 ngày, chậm vài phút).
 *
 * Bộ lọc, trang và lượt gọi đang mở nằm trên URL (`useActivityLogFilters`). Trang tự làm mới 30 giây, chỉ ở trang đầu
 * và khi không mở hộp chi tiết: ở trang sau hay đang đọc một lượt gọi mà danh sách tự trôi thì người dùng mất chỗ.
 */
export default function ActivityLogPage() {
  const { filters, filtered, update, clear, setPage, openEntry, closeEntry } = useActivityLogFilters();
  const [draft, setDraft] = useState<ActivityPanelFilters>(EMPTY_PANEL_FILTERS);
  const [exporting, setExporting] = useState(false);
  const listRef = useRef<HTMLElement>(null);
  // Khoảng tự chọn chỉ gửi khi đã đủ hai ngày; đang chọn dở thì vẫn xem theo 24 giờ qua.
  const custom = filters.range === 'custom' && filters.from && filters.to ? { from: filters.from, to: filters.to } : null;
  const polling = filters.page === 0 && !filters.open && !custom;

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
    { ...searchArgs, page: filters.page, size: ACTIVITY_PAGE_SIZE },
    { pollingInterval: polling ? ACTIVITY_REFRESH_MS : 0, skipPollingIfUnfocused: true },
  );
  const data = list.data;
  const entries = data?.content ?? [];
  // Chỉ coi là "đang đổi kết quả" khi tham số đổi (chưa có dữ liệu của tham số mới); tự làm mới thì giữ bảng như cũ.
  const switching = list.isFetching && !list.currentData;
  const open = filters.open ? entries.find((entry) => entryKey(entry) === filters.open) ?? null : null;
  const capped = data != null && data.totalElements > data.maxRows;

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

  // Sang trang thì cuộn về đầu bảng (trừ phần header dính), không để người dùng đứng ở cuối trang mới.
  const goToPage = (page: number) => {
    setPage(page);
    const top = listRef.current?.getBoundingClientRect().top;
    if (top !== undefined && top < 64) window.scrollTo({ top: window.scrollY + top - 64 });
  };

  const outcomeLabel = OUTCOME_OPTIONS.find((option) => option.value === filters.outcome)?.label;
  const kindLabel = KIND_OPTIONS.find((option) => option.value === filters.method)?.label;
  const chips: FilterChip[] = [];
  if (outcomeLabel) chips.push({ key: 'outcome', label: `Kết quả: ${outcomeLabel}`, onRemove: () => update({ outcome: null }) });
  if (kindLabel) chips.push({ key: 'method', label: `Thao tác: ${kindLabel}`, onRemove: () => update({ method: '' }) });
  if (filters.service) {
    chips.push({ key: 'service', label: `Nhóm chức năng: ${SERVICE_LABELS[filters.service]}`, onRemove: () => update({ service: '' }) });
  }
  if (filters.client) chips.push({ key: 'client', label: `Ứng dụng: ${CLIENT_LABELS[filters.client]}`, onRemove: () => update({ client: '' }) });
  if (filters.showBackground) chips.push({ key: 'auto', label: 'Có lượt gọi tự động', onRemove: () => update({ showBackground: false }) });

  const rangePicker = (
    <>
      <label>
        <span className="ui-sr-only">Khoảng thời gian</span>
        <select
          className="ui-select"
          value={filters.range}
          onChange={(event) => update({ range: event.target.value as ActivityRange | 'custom' })}
        >
          {RANGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          <option value="custom">Chọn ngày…</option>
        </select>
      </label>
      {filters.range === 'custom' && (
        <span className="inline-flex items-center gap-1.5 text-muted">
          <input
            type="date"
            className="ui-input w-38"
            aria-label="Từ ngày"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(event) => update({ from: event.target.value })}
          />
          <span aria-hidden="true">–</span>
          <input
            type="date"
            className="ui-input w-38"
            aria-label="Đến ngày"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(event) => update({ to: event.target.value })}
          />
        </span>
      )}
    </>
  );

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title">
          <h1>Nhật ký hoạt động</h1>
          <p>Thao tác trên web và ứng dụng di động trong 30 ngày gần nhất.</p>
        </div>
      </header>

      <section
        ref={listRef}
        className="ui-card pt-3.5 px-3.5 pb-3 max-[760px]:px-2.5 max-[760px]:pb-2.5"
        aria-label="Danh sách lượt gọi API"
      >
        <FilterBar
          className="mb-3"
          search={{
            value: filters.q,
            onSearch: (next) => update({ q: next }, true),
            label: 'Tìm trong nhật ký',
            placeholder: 'Tìm người gọi, thao tác, mã tra cứu',
          }}
          activeCount={chips.length}
          chips={chips}
          onOpen={() => setDraft({
            outcome: filters.outcome, method: filters.method, service: filters.service, client: filters.client,
            showBackground: filters.showBackground,
          })}
          onApply={() => {
            update(draft);
            return true;
          }}
          onClearAll={clear}
          title="Lọc nhật ký"
          leading={rangePicker}
          actions={(
            <>
              <button type="button" className="ui-btn ghost" onClick={() => void exportCsv()} disabled={exporting || !data}>
                <Icon name="download" />
                {exporting ? 'Đang xuất...' : 'Xuất CSV'}
              </button>
              <button type="button" className="ui-btn ghost" onClick={() => void list.refetch()} disabled={list.isFetching}>
                <Icon name="refresh" />
                {list.isFetching ? 'Đang tải...' : 'Làm mới'}
              </button>
            </>
          )}
        >
          <SelectField
            label="Kết quả"
            value={draft.outcome ?? ''}
            allLabel={data ? `Tất cả (${data.total.toLocaleString('vi-VN')})` : 'Tất cả'}
            options={OUTCOME_OPTIONS.map((option) => ({ ...option, count: outcomeCount(data, option.value) }))}
            onChange={(value) => setDraft({ ...draft, outcome: (value || null) as ActivityOutcome | null })}
          />
          <ToggleOne label="Thao tác" value={draft.method} options={KIND_OPTIONS} onChange={(method) => setDraft({ ...draft, method })} />
          <SelectField
            label="Nhóm chức năng"
            value={draft.service}
            allLabel="Tất cả"
            options={Object.entries(SERVICE_LABELS).map(([value, label]) => ({ value, label }))}
            onChange={(service) => setDraft({ ...draft, service })}
          />
          <ToggleOne
            label="Ứng dụng"
            value={draft.client}
            options={CLIENT_FILTER_OPTIONS.map((client) => ({ value: client, label: CLIENT_LABELS[client] }))}
            onChange={(client) => setDraft({ ...draft, client })}
          />
          <FilterField label="Lượt gọi tự động (làm mới thông báo, số dư…)">
            <div className="grid grid-cols-2 gap-1.5">
              {[false, true].map((show) => (
                <button
                  key={String(show)}
                  type="button"
                  aria-pressed={draft.showBackground === show}
                  className={TOGGLE}
                  onClick={() => setDraft({ ...draft, showBackground: show })}
                >
                  {show ? 'Hiện' : 'Ẩn'}
                </button>
              ))}
            </div>
          </FilterField>
        </FilterBar>

        {list.error ? (
          <ErrorNotice error={list.error} onRetry={list.refetch} />
        ) : list.isLoading ? (
          <div className="ui-empty" aria-busy="true">Đang tải nhật ký...</div>
        ) : entries.length === 0 && !switching ? (
          <div className="ui-empty">
            {filtered || chips.length ? 'Không có lượt gọi nào khớp bộ lọc.' : 'Chưa có lượt gọi nào trong khoảng thời gian này.'}
          </div>
        ) : (
          <div className={switching ? 'ui-busy' : undefined} aria-busy={switching || undefined}>
            <ActivityLogTable entries={entries} errorsOnly={filters.outcome === 'ERROR'} onOpen={(entry) => openEntry(entryKey(entry))} />
            {/* Backend chỉ trả tới `maxRows` lượt gần nhất; vượt mức thì dòng phân trang nói rõ là "gần nhất". */}
            <Pager
              page={filters.page}
              size={ACTIVITY_PAGE_SIZE}
              total={Math.min(data?.totalElements ?? 0, data?.maxRows ?? 0)}
              unit={capped ? 'lượt gọi gần nhất' : 'lượt gọi'}
              disabled={switching}
              onPage={goToPage}
            />
          </div>
        )}
      </section>

      {open && (
        <ActivityLogDetailModal
          key={entryKey(open)}
          entry={open}
          onClose={closeEntry}
          onFilterUser={(user) => update({ q: user })}
        />
      )}
    </section>
  );
}
