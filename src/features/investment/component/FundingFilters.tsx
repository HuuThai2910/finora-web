import type { FormEvent } from 'react';

/**
 * Giá trị của thanh lọc. Giữ mọi thứ dạng chuỗi vì đây là state của form —
 * việc đổi sang số chỉ làm một lần ở nơi gọi API, để ô đang gõ dở không bị ép kiểu sớm.
 *
 * Trạng thái không nằm ở đây: nó là dải chặng phía trên, bấm là lọc ngay.
 */
export interface ListingFilters {
  grade: string;
  minRate: string;
  maxTermMonths: string;
}

export const EMPTY_FILTERS: ListingFilters = { grade: '', minRate: '', maxTermMonths: '' };

export const isFilterActive = (filters: ListingFilters): boolean =>
  Boolean(filters.grade || filters.minRate || filters.maxTermMonths);

interface Props {
  filters: ListingFilters;
  isFiltered: boolean;
  onChange: (filters: ListingFilters) => void;
  onSubmit: () => void;
  onReset: () => void;
}

const GRADE_OPTIONS = ['A', 'B', 'C', 'D', 'E'];

/**
 * Thanh lọc phụ của sàn gọi vốn.
 *
 * Ba ô tương ứng đúng ba tham số còn lại mà `GET /market/listings` nhận, nên không có ô
 * nào lọc ở phía client — kết quả trên bảng luôn là thứ backend trả về, kể cả khi sang trang.
 */
export function FundingFilters({ filters, isFiltered, onChange, onSubmit, onReset }: Props) {
  const update = (patch: Partial<ListingFilters>) => onChange({ ...filters, ...patch });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form className="inv-filters" onSubmit={handleSubmit} role="search" aria-label="Lọc khoản vay">
      <div className="inv-filter-field">
        <label className="inv-field-label" htmlFor="funding-filter-grade">Hạng tín dụng</label>
        <select
          id="funding-filter-grade"
          className="inv-input"
          value={filters.grade}
          onChange={(event) => update({ grade: event.target.value })}
        >
          <option value="">Mọi hạng</option>
          {GRADE_OPTIONS.map((grade) => (
            <option key={grade} value={grade}>Hạng {grade}</option>
          ))}
        </select>
      </div>

      <div className="inv-filter-field">
        <label className="inv-field-label" htmlFor="funding-filter-rate">Lãi suất từ (%/năm)</label>
        <input
          id="funding-filter-rate"
          className="inv-input"
          type="number"
          inputMode="decimal"
          min="0"
          max="100"
          step="0.1"
          placeholder="ví dụ 12"
          value={filters.minRate}
          onChange={(event) => update({ minRate: event.target.value })}
        />
      </div>

      <div className="inv-filter-field">
        <label className="inv-field-label" htmlFor="funding-filter-term">Kỳ hạn tối đa (tháng)</label>
        <input
          id="funding-filter-term"
          className="inv-input"
          type="number"
          inputMode="numeric"
          min="1"
          max="60"
          step="1"
          placeholder="ví dụ 24"
          value={filters.maxTermMonths}
          onChange={(event) => update({ maxTermMonths: event.target.value })}
        />
      </div>

      <div className="inv-filter-actions">
        <button type="submit" className="inv-btn inv-btn-brand">Lọc</button>
        <button type="button" className="inv-btn inv-btn-ghost" disabled={!isFiltered} onClick={onReset}>
          Xóa lọc
        </button>
      </div>
    </form>
  );
}
