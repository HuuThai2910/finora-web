import { Icon } from '@/components/Icon';

export interface FilterChip {
  key: string;
  /** Chữ trên chip, ví dụ "Số tiền: 10 – 50 triệu". */
  label: string;
  onRemove: () => void;
}

interface ActiveFilterChipsProps {
  chips: FilterChip[];
  onClearAll: () => void;
}

/** Hàng chip của bộ lọc đang áp dụng: ✕ bỏ từng cái, "Xóa tất cả" bỏ hết. Không có bộ lọc thì không vẽ gì. */
export function ActiveFilterChips({ chips, onClearAll }: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;
  return (
    <ul className="ui-filter-chips flex flex-wrap items-center gap-1.5" aria-label="Bộ lọc đang áp dụng">
      {chips.map((chip) => (
        <li key={chip.key}>
          <span className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-full border border-[#c9d7f0] bg-brand-50 text-brand text-[12.5px]">
            {chip.label}
            <button
              type="button"
              className="grid place-items-center size-5 rounded-full hover:bg-[#d3dff4] [&_svg]:size-3"
              aria-label={`Bỏ bộ lọc ${chip.label}`}
              onClick={chip.onRemove}
            >
              <Icon name="close" />
            </button>
          </span>
        </li>
      ))}
      <li>
        <button type="button" className="ui-link px-1 text-[12.5px]" onClick={onClearAll}>Xóa tất cả</button>
      </li>
    </ul>
  );
}
