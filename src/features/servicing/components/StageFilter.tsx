import { COLLECTION_STAGES } from '../constant';
import type { StageCount } from '../hooks/useServicingCounts';
import type { CollectionStage } from '../types';

interface Props {
  value: CollectionStage | null;
  counts: StageCount[] | undefined;
  onChange: (stage: CollectionStage | null) => void;
}

const CHIP = 'svc-stage-chip inline-flex h-7 items-center gap-1.5 rounded-[999px] border border-line-strong bg-white px-3 '
  + 'text-[12px] font-medium text-secondary hover:text-primary '
  + 'aria-pressed:border-brand aria-pressed:bg-brand-50 aria-pressed:text-brand';

/**
 * Chip lọc hàng đợi thu hồi theo mức độ. Viền mảnh và nhỏ hơn tab nhóm việc phía trên để không lẫn hai tầng điều hướng;
 * số cạnh nhãn lấy từ summary thống kê (chỉ hiện khi tài khoản xem được thống kê).
 */
export function StageFilter({ value, counts, onChange }: Props) {
  const countOf = (stage: CollectionStage) => counts?.find((item) => item.stage === stage)?.count;
  const options: Array<{ stage: CollectionStage | null; label: string; count: number | undefined }> = [
    { stage: null, label: 'Tất cả mức độ', count: undefined },
    ...COLLECTION_STAGES.map((item) => ({ stage: item.stage, label: item.label, count: countOf(item.stage) })),
  ];

  return (
    <div className="svc-stage-filter mx-0.5 mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Lọc theo mức độ">
      {options.map((option) => (
        <button
          key={option.stage ?? 'all'}
          type="button"
          className={CHIP}
          aria-pressed={value === option.stage}
          onClick={() => onChange(option.stage)}
        >
          {option.label}
          {option.count != null && <span className="tabular-nums opacity-80">{option.count}</span>}
        </button>
      ))}
    </div>
  );
}
