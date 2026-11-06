import { useState, type FormEvent } from 'react';
import { GRADE_OPTIONS } from '../constants';
import { INPUT } from '../styles';

/** Hẹp màn hình (dưới 760px) thì ba ô chia đều cả hàng. */
const FIELD = 'max-[760px]:flex-[1_1_120px]';
const FILTER_INPUT = `fu-input ${INPUT} w-32 h-8.5 max-[760px]:w-full`;

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
 * phía client: bảng luôn là thứ backend trả về, kể cả khi sang trang. Ô tìm theo mã và kiểu
 * sắp xếp nằm ở trang (tham số `q`, `sort`).
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
    <form className="fu-filters flex items-center gap-2 flex-wrap max-[760px]:w-full" onSubmit={handleSubmit} role="search" aria-label="Lọc khoản vay">
      <label className={FIELD}>
        <span className="ui-sr-only">Hạng tín dụng</span>
        <select className="ui-select max-[760px]:w-full" value={draft.grade} onChange={(event) => update({ grade: event.target.value })}>
          <option value="">Mọi hạng</option>
          {GRADE_OPTIONS.map((grade) => <option key={grade} value={grade}>Hạng {grade}</option>)}
        </select>
      </label>
      {/* Hậu tố "%" nằm trong ô để rõ đơn vị: gõ 12 là từ 12%/năm (trần lãi suất của sàn là 20%). */}
      <label className={`fu-rate-field relative ${FIELD}`}>
        <span className="ui-sr-only">Lãi suất từ (%/năm)</span>
        <input
          className={`${FILTER_INPUT} pr-7`}
          type="number"
          inputMode="decimal"
          min="0"
          max="20"
          step="0.1"
          placeholder="Lãi từ"
          value={draft.minRate}
          onChange={(event) => update({ minRate: event.target.value })}
        />
        <span className="absolute right-2.5 top-[50%] transform-[translateY(-50%)] text-muted text-[13px] pointer-events-none" aria-hidden="true">%</span>
      </label>
      <label className={FIELD}>
        <span className="ui-sr-only">Kỳ hạn tối đa (tháng)</span>
        <input
          className={FILTER_INPUT}
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
