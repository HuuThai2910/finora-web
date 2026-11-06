import { useEffect, useState, type FormEvent } from 'react';
import { CLIENT_LABELS, METHOD_OPTIONS, OUTCOME_TABS, RANGE_OPTIONS, SERVICE_LABELS } from '../constants';
import type { ActivityLogFilters } from '../hooks/useActivityLogFilters';
import type { ActivityClient, ActivityRange } from '../types';
import { handleTabArrows } from './tabKeys';

type FilterPatch = Partial<Omit<ActivityLogFilters, 'page' | 'open'>>;

interface Props {
  filters: ActivityLogFilters;
  filtered: boolean;
  onChange: (patch: FilterPatch) => void;
  onClear: () => void;
}

const OUTCOME_VALUES = OUTCOME_TABS.map((tab) => tab.value);

/** Thanh lọc của Nhật ký hoạt động: tab kết quả, khoảng thời gian, thao tác, nhóm chức năng, ứng dụng và ô tìm. */
export function ActivityLogFilterBar({ filters, filtered, onChange, onClear }: Props) {
  // Ô tìm chỉ áp dụng khi bấm Tìm/Enter; theo kịp `q` trên URL khi nó đổi từ nơi khác (link, "Lọc theo người này").
  const [search, setSearch] = useState(filters.q);
  useEffect(() => setSearch(filters.q), [filters.q]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    onChange({ q: search.trim() });
  };

  return (
    <div className="act-bar mb-3 grid gap-2.5">
      <div
        className="ui-tabs"
        role="tablist"
        aria-label="Lọc theo kết quả"
        onKeyDown={(event) => handleTabArrows(event, OUTCOME_VALUES, filters.outcome, (outcome) => onChange({ outcome }))}
      >
        {OUTCOME_TABS.map((tab) => (
          <button
            key={tab.value ?? 'ALL'}
            type="button"
            role="tab"
            aria-selected={filters.outcome === tab.value}
            tabIndex={filters.outcome === tab.value ? 0 : -1}
            onClick={() => onChange({ outcome: tab.value })}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="act-filters flex flex-wrap items-center gap-2">
        <label>
          <span className="ui-sr-only">Khoảng thời gian</span>
          <select
            className="ui-select"
            value={filters.range}
            onChange={(event) => onChange({ range: event.target.value as ActivityRange | 'custom' })}
          >
            {RANGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            <option value="custom">Chọn ngày...</option>
          </select>
        </label>
        {filters.range === 'custom' && (
          <span className="act-custom-range inline-flex flex-wrap items-center gap-1.5 text-[13px] text-secondary">
            <label className="inline-flex items-center gap-1">
              Từ
              <input
                type="date"
                className="ui-input act-date w-38"
                value={filters.from}
                max={filters.to || undefined}
                onChange={(event) => onChange({ from: event.target.value })}
              />
            </label>
            <label className="inline-flex items-center gap-1">
              đến
              <input
                type="date"
                className="ui-input act-date w-38"
                value={filters.to}
                min={filters.from || undefined}
                onChange={(event) => onChange({ to: event.target.value })}
              />
            </label>
          </span>
        )}
        <label>
          <span className="ui-sr-only">Thao tác</span>
          <select className="ui-select" value={filters.method} onChange={(event) => onChange({ method: event.target.value })}>
            {METHOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>
          <span className="ui-sr-only">Nhóm chức năng</span>
          <select className="ui-select" value={filters.service} onChange={(event) => onChange({ service: event.target.value })}>
            <option value="">Mọi nhóm chức năng</option>
            {Object.entries(SERVICE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          <span className="ui-sr-only">Ứng dụng</span>
          <select
            className="ui-select"
            value={filters.client}
            onChange={(event) => onChange({ client: event.target.value as ActivityClient | '' })}
          >
            <option value="">Web và mobile</option>
            {(Object.keys(CLIENT_LABELS) as ActivityClient[]).map((client) => (
              <option key={client} value={client}>{CLIENT_LABELS[client]}</option>
            ))}
          </select>
        </label>
        <form className="act-search flex flex-wrap items-center gap-2" role="search" onSubmit={submitSearch}>
          <label>
            <span className="ui-sr-only">Tìm theo đường dẫn, người gọi, lỗi hoặc mã tra cứu</span>
            {/* Cùng cỡ với ô chọn bên cạnh (.ui-select). Ô nhập không tự kế thừa font của trang; ghi từng phần
                vì [font:inherit] được Tailwind xếp sau text-[14px] và sẽ đè mất cỡ chữ. */}
            <input
              className="act-input h-8.5 w-60 rounded-md border border-line-strong bg-white px-2.5 text-[14px] text-primary font-[inherit] [font-style:inherit] [font-weight:inherit] leading-[inherit] focus:border-brand focus:shadow-[0_0_0_3px_rgba(29,86,196,0.15)] focus:[outline:0] max-[900px]:w-full"
              value={search}
              placeholder="Đường dẫn, người gọi, lỗi..."
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <button type="submit" className="ui-btn ghost">Tìm</button>
          {filtered && (
            <button
              type="button"
              className="ui-btn soft"
              onClick={() => {
                setSearch('');
                onClear();
              }}
            >
              Bỏ lọc
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
