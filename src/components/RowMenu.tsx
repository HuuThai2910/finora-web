import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Icon, MoreIcon, type IconName } from './Icon';

interface RowMenuItemBase {
  key: string;
  label: string;
  icon: IconName;
  /** Thao tác nguy hiểm (khóa, xóa): chữ đỏ, nên đặt cuối và có vạch ngăn phía trên. */
  danger?: boolean;
  /** Vẽ vạch ngang ngăn với nhóm phía trên. */
  separatorBefore?: boolean;
}

export type RowMenuItem = RowMenuItemBase & (
  | { to: string }
  | { onSelect: () => void; disabled?: boolean; disabledReason?: string }
);

interface RowMenuProps {
  /** Tên đọc cho trình đọc màn hình, ví dụ "Thao tác với Nguyễn Văn An". */
  label: string;
  items: RowMenuItem[];
  /** Lớp của nút mở thay cho nút "⋯" mặc định, ví dụ menu người dùng ở header. */
  buttonClassName?: string;
  /** Nội dung nút mở thay cho icon "⋯". */
  buttonContent?: ReactNode;
}

const MENU_GAP = 4;
const VIEWPORT_MARGIN = 8;

/**
 * Nút "⋯" của một dòng bảng, mở danh sách thao tác.
 *
 * Danh sách vẽ qua portal với `position: fixed` để khung bảng (`overflow-x: auto`) không cắt mất.
 * Vì vị trí tính theo nút lúc mở, menu tự đóng khi cuộn hoặc đổi kích thước cửa sổ thay vì trôi lệch.
 */
export function RowMenu({ label, items, buttonClassName = 'ui-rowmenu-btn', buttonContent }: RowMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<CSSProperties>({ visibility: 'hidden' });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Mở bằng bàn phím thì đưa focus vào mục đầu; mở bằng chuột thì không.
  const focusFirstRef = useRef(false);

  const close = (restoreFocus: boolean) => {
    setOpen(false);
    setPosition({ visibility: 'hidden' });
    if (restoreFocus) buttonRef.current?.focus();
  };

  // Đo kích thước thật của danh sách rồi mới đặt chỗ: mở xuống dưới nút, sát đáy màn hình thì lật lên trên.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current || !listRef.current) return;
    const anchor = buttonRef.current.getBoundingClientRect();
    const { offsetWidth: width, offsetHeight: height } = listRef.current;
    const left = Math.max(VIEWPORT_MARGIN, Math.min(anchor.right - width, window.innerWidth - width - VIEWPORT_MARGIN));
    let top = anchor.bottom + MENU_GAP;
    if (top + height > window.innerHeight - VIEWPORT_MARGIN) {
      top = Math.max(VIEWPORT_MARGIN, anchor.top - height - MENU_GAP);
    }
    setPosition({ left, top });
    if (focusFirstRef.current) {
      listRef.current.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus({ preventScroll: true });
    }
  }, [open]);

  // Lắng nghe toàn trang chỉ khi menu đang mở; gỡ ngay khi đóng hoặc dòng bị vẽ lại.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (listRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      close(false);
    };
    const onDismiss = () => close(false);
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('scroll', onDismiss, true);
    window.addEventListener('resize', onDismiss);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', onDismiss, true);
      window.removeEventListener('resize', onDismiss);
    };
  }, [open]);

  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    if (event.key === 'Tab') {
      close(false);
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const enabled = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? [],
    );
    if (enabled.length === 0) return;
    const index = enabled.indexOf(document.activeElement as HTMLElement);
    const next = event.key === 'ArrowDown'
      ? (index + 1) % enabled.length
      : (index <= 0 ? enabled.length - 1 : index - 1);
    enabled[next].focus();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={buttonClassName}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          if (open) {
            close(false);
            return;
          }
          // event.detail = 0 nghĩa là bấm bằng Enter/Space chứ không phải chuột.
          focusFirstRef.current = event.detail === 0;
          setOpen(true);
        }}
      >
        {buttonContent ?? <MoreIcon />}
      </button>
      {open && createPortal(
        <div ref={listRef} className="ui-rowmenu-list" role="menu" aria-label={label} style={position} onKeyDown={onListKeyDown}>
          {items.map((item) => (
            <MenuEntry key={item.key} item={item} onDone={() => close(false)} />
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}

function MenuEntry({ item, onDone }: { item: RowMenuItem; onDone: () => void }) {
  const className = item.danger ? 'danger' : undefined;
  const body = (
    <>
      <Icon name={item.icon} />
      {item.label}
    </>
  );

  return (
    <>
      {item.separatorBefore && <hr />}
      {'to' in item ? (
        <Link role="menuitem" to={item.to} className={className} onClick={onDone}>{body}</Link>
      ) : (
        <button
          type="button"
          role="menuitem"
          className={className}
          disabled={item.disabled}
          title={item.disabled ? item.disabledReason : undefined}
          onClick={() => {
            onDone();
            item.onSelect();
          }}
        >
          {body}
        </button>
      )}
    </>
  );
}
