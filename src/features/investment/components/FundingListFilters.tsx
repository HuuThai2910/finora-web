import { useState, type FormEvent } from 'react';
import { GRADE_OPTIONS } from '../constants';

/**
 * Bộ lọc phụ của bảng. Giữ dạng chuỗi vì đây là state của form; đổi sang số chỉ làm một
 * lần ở nơi gọi API, để ô đang gõ dở không bị ép kiểu sớm.
 */
export interface ListingFilters {
  grade: string;
  /** Lãi suất tối thiểu, người dùng gõ phần trăm (12 nghĩa là 12%/năm). */
  minRate: string;
  maxTermMonths: string;
}

export const EMPTY_FILTERS: ListingFilters = { grade: '', minRate: '', maxTermMonths: '' };

export const isFilterActive = (filters: ListingFilters): boolean =>
  Boolean(filters.grade || filters.minRate || filters.maxTermMonths);

interface Props {
  applied: ListingFilters;
  onApply: (filters: ListingFilters) => void;
}

/**
 * Ba ô tương ứng đúng ba tham số lọc mà `GET /market/listings` nhận, nên không lọc gì ở
 * phía client: bảng luôn là thứ backend trả về, kể cả khi sang trang. Backend không có
 * tham số tìm theo tên nên trang không có ô tìm kiếm.
 */
export function FundingListFilters({ applied, onApply }: Props) {
  // Bản nháp khởi tạo từ URL; trang cha đặt `key` theo bộ lọc đã áp dụng để nạp lại khi URL đổi.
  const [draft, setDraft] = useState<ListingFilters>(applied);
  const update = (patch: Partial<ListingFilters>) => setDraft((current) => ({ ...current, ...patch }));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onApply(draft);
  };

  return (
    <form className="fu-filters" onSubmit={handleSubmit} role="search" aria-label="Lọc khoản vay">
      <label>
        <span className="ui-sr-only">Hạng tín dụng</span>
        <select className="ui-select" value={draft.grade} onChange={(event) => update({ grade: event.target.value })}>
          <option value="">Mọi hạng</option>
          {GRADE_OPTIONS.map((grade) => <option key={grade} value={grade}>Hạng {grade}</option>)}
        </select>
      </label>
      <label>
        <span className="ui-sr-only">Lãi suất từ (%/năm)</span>
        <input
          className="fu-input"
          type="number"
          inputMode="decimal"
          min="0"
          max="100"
          step="0.1"
          placeholder="Lãi từ %"
          value={draft.minRate}
          onChange={(event) => update({ minRate: event.target.value })}
        />
      </label>
      <label>
        <span className="ui-sr-only">Kỳ hạn tối đa (tháng)</span>
        <input
          className="fu-input"
          type="number"
          inputMode="numeric"
          min="1"
          max="60"
          step="1"
          placeholder="Kỳ hạn tối đa"
          value={draft.maxTermMonths}
          onChange={(event) => update({ maxTermMonths: event.target.value })}
        />
      </label>
      <button type="submit" className="ui-btn ghost">Lọc</button>
      {isFilterActive(applied) && (
        <button type="button" className="ui-btn soft" onClick={() => onApply(EMPTY_FILTERS)}>Xóa lọc</button>
      )}
    </form>
  );
}
