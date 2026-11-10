import type { ReactNode } from 'react';

/** Màu một đoạn: nhạt (đang góp), đậm (đã ký, đã phát hành), viền (chưa ký). */
export type SegmentTone = 'soft' | 'solid' | 'outline';

const TONE: Record<SegmentTone, string> = {
  soft: 'bg-[#a3bde3]',
  solid: 'bg-brand',
  outline: 'bg-white shadow-[inset_0_0_0_1.5px_#a3bde3]',
};

export interface Segment {
  key: string | number;
  /** Phần trăm bề rộng trên cả thanh (0–100), chỉ để vẽ. */
  width: number;
  tone: SegmentTone;
  title: string;
}

/**
 * Thanh chia đoạn theo nhà đầu tư: mỗi đoạn là phần góp của một người, rê chuột lên một đoạn thì các đoạn khác mờ đi
 * (tên và số tiền ở `title`). Chỉ để nhìn tỷ lệ; con số chính xác nằm ở dải số liệu và bảng ngay bên dưới.
 */
export function SegmentMeter({ segments, label }: { segments: Segment[]; label: string }) {
  return (
    <div
      className="fd-meter group/meter mt-2.5 mb-2 flex h-3.5 gap-0.5 overflow-hidden rounded-full bg-[#eef0f3] p-0.5"
      role="img"
      aria-label={label}
    >
      {segments.map((segment) => (
        <span
          key={segment.key}
          className={`h-full flex-none rounded-full transition-opacity duration-150 group-hover/meter:not-hover:opacity-35 ${TONE[segment.tone]}`}
          style={{ width: `${Math.min(Math.max(segment.width, 0), 100)}%` }}
          title={segment.title}
        />
      ))}
    </div>
  );
}

/** Chú giải dưới thanh: các ô màu bên trái, ghi chú bên phải. */
export function MeterLegend({ items, note, aside }: {
  items?: Array<{ tone: SegmentTone; label: string }>;
  note?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="fd-legend flex flex-wrap gap-x-3.5 gap-y-1 text-muted text-[12px]">
      {items?.map((item) => (
        <span key={item.label}>
          <i className={`mr-1.25 inline-block size-2.5 rounded-[3px] align-[-1px] ${TONE[item.tone]}`} />
          {item.label}
        </span>
      ))}
      {note ? <span>{note}</span> : null}
      {aside ? <span className="ml-auto tabular-nums">{aside}</span> : null}
    </div>
  );
}
