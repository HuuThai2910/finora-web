import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';

interface SearchBoxProps {
  /** Giá trị đang áp dụng (thường đọc từ URL). */
  value: string;
  /** Gọi sau khi người dùng ngừng gõ `delay` ms, hoặc ngay khi bấm Enter / xoá. */
  onSearch: (value: string) => void;
  placeholder: string;
  /** Nhãn cho trình đọc màn hình. */
  label: string;
  delay?: number;
  className?: string;
}

/**
 * Ô tìm có debounce: gõ tới đâu giữ trong state riêng, ngừng gõ mới báo ra ngoài để không gửi request theo từng phím.
 * Giá trị ngoài đổi (ví dụ bấm Quay lại trên trình duyệt) thì ô cập nhật theo.
 */
export function SearchBox({ value, onSearch, placeholder, label, delay = 350, className }: SearchBoxProps) {
  const [draft, setDraft] = useState(value);
  const lastSent = useRef(value);
  // Giữ hàm mới nhất trong ref: trang truyền hàm viết tại chỗ mà hẹn giờ không bị đặt lại sau mỗi lần vẽ.
  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  });

  useEffect(() => {
    setDraft(value);
    lastSent.current = value;
  }, [value]);

  useEffect(() => {
    const trimmed = draft.trim();
    if (trimmed === lastSent.current) return undefined;
    const timer = window.setTimeout(() => {
      lastSent.current = trimmed;
      onSearchRef.current(trimmed);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [draft, delay]);

  const sendNow = (next: string) => {
    lastSent.current = next;
    onSearchRef.current(next);
  };

  return (
    <div
      className={`ui-search relative flex items-center ${className ?? ''}`}
      role="search"
    >
      <span className="pointer-events-none absolute left-2.5 flex text-muted [&_svg]:size-3.75" aria-hidden="true">
        <Icon name="search" />
      </span>
      <input
        type="search"
        className="ui-input h-9 w-full pr-8 pl-8"
        value={draft}
        placeholder={placeholder}
        aria-label={label}
        maxLength={100}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') sendNow(draft.trim());
          if (event.key === 'Escape' && draft) {
            event.stopPropagation();
            setDraft('');
            sendNow('');
          }
        }}
      />
      {draft && (
        <button
          type="button"
          className="absolute right-1.5 flex size-6 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent text-muted hover:bg-fill hover:text-primary [&_svg]:size-3.5"
          aria-label="Xoá nội dung tìm"
          onClick={() => {
            setDraft('');
            sendNow('');
          }}
        >
          <Icon name="close" />
        </button>
      )}
    </div>
  );
}
