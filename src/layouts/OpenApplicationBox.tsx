import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from '@/features/auth';
import { normalizeApplicationNumber } from './applicationNumber';

/** Dưới 760px header không đủ chỗ cho ô nhập: thu thành nút kính lúp, bấm mới mở ô dưới header. */
const COMPACT_QUERY = '(width < 760px)';

const INPUT =
  'header-find-input w-full h-8 pl-8 pr-7 rounded-md border border-line-strong bg-white text-[13px] text-primary font-[inherit] [font-style:inherit] [font-weight:inherit] leading-[inherit] placeholder:text-muted focus:border-brand focus:shadow-[0_0_0_3px_rgba(29,86,196,0.15)] focus:[outline:0] aria-invalid:border-danger';

function SearchGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

/** Đang gõ trong ô nhập, ô chọn, vùng soạn thảo: phím "/" là ký tự bình thường, không phải phím tắt. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * Ô "Mở hồ sơ theo mã" ở header: thẩm định viên nhận mã LA-… qua điện thoại, chat thì dán vào đây là tới thẳng trang
 * hồ sơ, không phải lọc danh sách. Enter thì chuẩn hóa (in hoa, bỏ khoảng trắng) rồi mở `/loans/<mã>/review`; mã sai
 * dạng thì báo ngay dưới ô. Phím "/" ở bất kỳ đâu đưa focus vào ô (trừ khi đang gõ hoặc đang mở hộp thoại).
 * Chỉ kiểm dạng mã; hồ sơ không tồn tại thì trang chi tiết báo lỗi như khi mở từ danh sách.
 */
export function OpenApplicationBox() {
  const navigate = useNavigate();
  const compact = useMediaQuery(COMPACT_QUERY);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Màn hẹp: ô chỉ hiện sau khi bấm nút kính lúp hoặc phím "/".
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const errorId = useId();
  const showInput = !compact || expanded;

  // Phím tắt "/" toàn trang; gỡ khi rời khung quản trị.
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      event.preventDefault();
      setExpanded(true);
      // Ô ở màn hẹp mới được dựng ở lần render này: đợi một khung hình rồi mới focus.
      window.requestAnimationFrame(() => inputRef.current?.focus());
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const collapse = () => {
    setExpanded(false);
    setError(null);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = normalizeApplicationNumber(value);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setValue('');
    collapse();
    inputRef.current?.blur();
    navigate(`/loans/${encodeURIComponent(result.value)}/review`);
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Escape') return;
    // Esc chỉ đóng ô của mình, không đóng ngăn menu hay thứ khác đang mở.
    event.stopPropagation();
    setValue('');
    collapse();
    event.currentTarget.blur();
  };

  return (
    <div className="header-find relative min-w-0 max-[760px]:static">
      {compact && (
        <button
          type="button"
          className="header-find-toggle grid place-items-center size-8 rounded-sm text-secondary hover:bg-surface-muted hover:text-primary [&_svg]:size-4.5"
          aria-label="Mở hồ sơ theo mã"
          aria-expanded={expanded}
          // Không lấy focus khỏi ô khi bấm: nếu không, ô mất focus tự thu lại rồi lần bấm này lại mở ra.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (expanded) {
              collapse();
              return;
            }
            setExpanded(true);
            window.requestAnimationFrame(() => inputRef.current?.focus());
          }}
        >
          <SearchGlyph />
        </button>
      )}
      {showInput && (
        // Màn hẹp: ô trải ngang ngay dưới header (header là gốc định vị).
        <form
          className="header-find-form relative w-55 max-[1024px]:w-45 max-[760px]:absolute max-[760px]:inset-x-0 max-[760px]:top-full max-[760px]:w-auto max-[760px]:px-4 max-[760px]:pt-1 max-[760px]:pb-2.5 max-[760px]:bg-page max-[760px]:shadow-[0_6px_12px_rgba(10,44,104,0.08)]"
          role="search"
          onSubmit={submit}
        >
          <label htmlFor={inputId} className="ui-sr-only">Mở hồ sơ vay theo mã</label>
          <span className="pointer-events-none absolute top-2 left-2.5 grid text-muted max-[760px]:top-3 max-[760px]:left-6.5 [&_svg]:size-4"><SearchGlyph /></span>
          <input
            ref={inputRef}
            id={inputId}
            className={INPUT}
            value={value}
            placeholder="Mở hồ sơ LA-…"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="go"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => {
              setValue(event.target.value);
              if (error) setError(null);
            }}
            onKeyDown={onInputKeyDown}
            onBlur={() => {
              if (compact && !value) collapse();
            }}
          />
          {/* Gợi ý phím tắt; ẩn khi đang gõ để không đè chữ. */}
          {!value && (
            <kbd className="header-find-kbd pointer-events-none absolute top-1.5 right-1.5 grid place-items-center h-5 min-w-5 px-1 rounded-[5px] border border-line bg-surface-muted font-[inherit] text-[11px] text-muted max-[760px]:hidden" aria-hidden="true">/</kbd>
          )}
          {error && (
            <p
              id={errorId}
              className="header-find-error absolute top-full right-0 left-0 z-1 mt-1 px-2.5 py-1.5 rounded-md bg-card text-[12px] leading-[1.4] text-danger shadow-pop max-[760px]:static max-[760px]:mt-1.5 max-[760px]:shadow-none max-[760px]:bg-transparent max-[760px]:px-0.5 max-[760px]:py-0"
              role="alert"
            >
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
