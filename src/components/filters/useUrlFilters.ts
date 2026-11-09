import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatNumber } from '@/utils';

export type FilterValues<K extends string> = Record<K, string>;

/**
 * Bộ lọc nằm trên URL (giữ khi tải lại, chia sẻ được, nút Quay lại đi về bộ lọc trước) và bản nháp cho bảng lọc.
 *
 * Mỗi khóa là một tham số query; rỗng là không lọc. Áp dụng/bỏ lọc giữ các tham số khác (`q`…) và về trang đầu
 * (bỏ `page`). Giá trị nhiều lựa chọn ghi dạng `A,B`.
 */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const [params, setParams] = useSearchParams();
  const applied = useMemo(
    () => Object.fromEntries(keys.map((key) => [key, params.get(key) ?? ''])) as FilterValues<K>,
    // `keys` là hằng của trang; chỉ URL đổi mới đọc lại.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params],
  );
  const [draft, setDraft] = useState<FilterValues<K>>(applied);

  const write = (next: FilterValues<K>) => {
    const updated = new URLSearchParams(params);
    keys.forEach((key) => {
      if (next[key]) updated.set(key, next[key]);
      else updated.delete(key);
    });
    updated.delete('page');
    setParams(updated);
  };

  return {
    applied,
    draft,
    /** Mở bảng lọc: bản nháp bắt đầu từ bộ lọc đang áp dụng. */
    resetDraft: () => setDraft(applied),
    setDraft: (patch: Partial<FilterValues<K>>) => setDraft((current) => ({ ...current, ...patch })),
    applyDraft: () => write(draft),
    /** Bỏ một hoặc vài khóa (chip ✕). */
    remove: (...removed: K[]) => write({ ...applied, ...Object.fromEntries(removed.map((key) => [key, ''])) }),
    clearAll: () => write(Object.fromEntries(keys.map((key) => [key, ''])) as FilterValues<K>),
  };
}

/** Lỗi khoảng: cả hai đầu có giá trị mà "từ" lớn hơn "đến". Ngày `YYYY-MM-DD` so như chuỗi. */
export function rangeError(min: string, max: string, numeric = true): string | null {
  if (!min || !max) return null;
  const reversed = numeric ? Number(min) > Number(max) : min > max;
  return reversed ? 'Giá trị "từ" phải nhỏ hơn hoặc bằng giá trị "đến".' : null;
}

/** Chữ của chip khoảng: "Nhãn: a – b", "Nhãn: từ a", "Nhãn: đến b". */
export function rangeChipLabel(label: string, min: string, max: string, format: (value: string) => string): string {
  if (min && max) return `${label}: ${format(min)} – ${format(max)}`;
  if (min) return `${label}: từ ${format(min)}`;
  return `${label}: đến ${format(max)}`;
}

/** Số tiền gọn cho chip: 10 triệu, 1,5 tỷ, 500.000 đ. */
export function compactMoney(raw: string): string {
  const value = Number(raw);
  const short = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
  if (value >= 1_000_000_000) return `${short.format(value / 1_000_000_000)} tỷ`;
  if (value >= 1_000_000) return `${short.format(value / 1_000_000)} triệu`;
  return `${formatNumber(value)} đ`;
}

/** Ngày `YYYY-MM-DD` thành `dd/MM/yyyy` cho chip. */
export function shortDate(raw: string): string {
  const [year, month, day] = raw.split('-');
  return year && month && day ? `${day}/${month}/${year}` : raw;
}

/** Danh sách nhiều lựa chọn trên URL (`A,B`). */
export const splitList = (raw: string): string[] => (raw ? raw.split(',').filter(Boolean) : []);
