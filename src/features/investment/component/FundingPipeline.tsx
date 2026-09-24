import type { StageCounts } from '../hooks/useStageCounts';
import type { ListingStatus } from '../types';

/** Bộ lọc theo chặng: 'ALL' hoặc một trạng thái listing. */
export type StageFilter = 'ALL' | ListingStatus;

interface Props {
  counts: StageCounts;
  active: StageFilter;
  onSelect: (filter: StageFilter) => void;
}

type CountKey = 'all' | 'draft' | 'open' | 'funded';

const STAGE_CARDS: ReadonlyArray<{
  value: StageFilter;
  label: string;
  hint: string;
  countKey: CountKey;
  /** Chặng có việc quản trị phải làm — tô nhấn khi còn khoản tồn. */
  needsAction: boolean;
}> = [
  { value: 'ALL', label: 'Tất cả', hint: 'Mọi khoản trên sàn', countKey: 'all', needsAction: false },
  { value: 'DRAFT', label: 'Chờ duyệt', hint: 'Chốt mệnh giá Note rồi mở gọi vốn', countKey: 'draft', needsAction: true },
  { value: 'OPEN', label: 'Đang gọi vốn', hint: 'Nhà đầu tư đang đặt lệnh', countKey: 'open', needsAction: false },
  { value: 'FULLY_FUNDED', label: 'Đã đủ vốn', hint: 'Khóa vốn rồi phát hành Note', countKey: 'funded', needsAction: true },
];

const ARCHIVE: ReadonlyArray<{ value: StageFilter; label: string }> = [
  { value: 'CLOSED', label: 'Đã đóng' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

/**
 * Dải chặng của sàn gọi vốn — vừa là bảng đếm, vừa là bộ lọc.
 *
 * Thay cho ô chọn trạng thái: quản trị mở trang là thấy ngay còn bao nhiêu khoản chờ
 * mình duyệt và bao nhiêu khoản đủ vốn đang chờ giải ngân, bấm vào là tới đúng danh sách.
 */
export function FundingPipeline({ counts, active, onSelect }: Props) {
  return (
    <div className="inv-pipeline">
      <div className="inv-stage-cards" role="tablist" aria-label="Chặng gọi vốn">
        {STAGE_CARDS.map((card) => {
          const count = counts[card.countKey];
          const pending = card.needsAction && (count ?? 0) > 0;
          const selected = active === card.value;
          return (
            <button
              key={card.value}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`inv-stage-card${selected ? ' is-active' : ''}${pending ? ' needs-action' : ''}`}
              onClick={() => onSelect(card.value)}
            >
              <span className="inv-stage-label">{card.label}</span>
              <span className="inv-stage-count">{count == null ? '\u2026' : count}</span>
              <span className="inv-stage-hint">{pending ? 'Cần xử lý' : card.hint}</span>
            </button>
          );
        })}
      </div>

      <div className="inv-archive" role="tablist" aria-label="Khoản đã kết thúc">
        <span className="inv-archive-label">Đã kết thúc</span>
        {ARCHIVE.map((chip) => (
          <button
            key={chip.value}
            type="button"
            role="tab"
            aria-selected={active === chip.value}
            className={`inv-archive-chip${active === chip.value ? ' is-active' : ''}`}
            onClick={() => onSelect(chip.value)}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
