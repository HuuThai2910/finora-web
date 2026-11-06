import type { KeyboardEvent } from 'react';

/**
 * Phím mũi tên trái/phải (và Home/End) trong một nhóm `role="tab"`: chọn tab kề bên và đưa focus theo, như mẫu tab của
 * WAI-ARIA. Dùng cùng `tabIndex` lăn (tab đang chọn 0, còn lại -1) để Tab chỉ dừng một lần ở nhóm.
 * Tab trong nhóm phải theo đúng thứ tự `keys`. Bản sao của dashboard/components/tabKeys.ts (feature không import
 * nội bộ của nhau); nên gom về src/lib khi có chỗ dùng thứ ba.
 */
export function handleTabArrows<K>(event: KeyboardEvent<HTMLElement>, keys: readonly K[], current: K, select: (key: K) => void) {
  const last = keys.length - 1;
  const index = keys.indexOf(current);
  const next = event.key === 'ArrowRight' ? (index + 1) % keys.length
    : event.key === 'ArrowLeft' ? (index <= 0 ? last : index - 1)
      : event.key === 'Home' ? 0
        : event.key === 'End' ? last
          : null;
  if (next === null) return;
  event.preventDefault();
  select(keys[next]);
  event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
}
