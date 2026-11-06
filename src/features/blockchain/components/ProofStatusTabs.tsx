import { STATUS_TABS } from '../constants';
import type { ProofStatus } from '../types';

interface Props {
  /** Tab đang chọn; `undefined` khi đang tra theo tham chiếu (kết quả gồm mọi trạng thái, không tab nào chọn). */
  active: ProofStatus | null | undefined;
  /** Số proof dừng gửi, luôn hiện để vận hành thấy việc cần xử lý; chưa tải xong thì ẩn. */
  deadLetterCount: number | undefined;
  onSelect: (status: ProofStatus | null) => void;
}

/** Tab viên thuốc lọc proof theo trạng thái gửi lên sổ cái. Chọn tab khi đang tra theo tham chiếu sẽ bỏ tra cứu. */
export function ProofStatusTabs({ active, deadLetterCount, onSelect }: Props) {
  return (
    <div className="ui-tabs" role="tablist" aria-label="Lọc theo trạng thái gửi">
      {STATUS_TABS.map((tab) => (
        <button
          key={tab.value ?? 'ALL'}
          type="button"
          role="tab"
          aria-selected={active === tab.value}
          onClick={() => onSelect(tab.value)}
        >
          {tab.label}
          {/* Có proof dừng gửi thì số đỏ, đậm (trắng khi tab đang chọn) để vận hành thấy việc cần xử lý. */}
          {tab.value === 'DEAD_LETTER' && deadLetterCount != null && (
            <span
              className={deadLetterCount > 0
                ? 'n bc-hot font-bold text-danger opacity-100 in-[button[aria-selected=true]]:text-white'
                : 'n'}
            >
              {deadLetterCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
