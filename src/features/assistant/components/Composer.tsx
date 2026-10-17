import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Icon } from '@/components/Icon';
import { MAX_MESSAGE_CHARS } from '../constants';

interface ComposerProps {
  pending: boolean;
  onSend: (text: string) => void;
}

/**
 * Ô nhập câu hỏi. Enter gửi, Shift+Enter xuống dòng; đang gõ dấu bằng bộ gõ có khung chọn chữ
 * (`isComposing`) thì Enter là chọn chữ, không gửi. Câu đang chờ trả lời thì giữ nguyên chữ đã gõ.
 */
export function Composer({ pending, onSend }: ComposerProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputId = useId();
  const hintId = useId();

  // Focus ô nhập khi ngăn mở hoặc ngay sau "Đã hiểu". Đặt trong useEffect (chạy sau useLayoutEffect của
  // `useDrawerFocus`) để ngăn kịp ghi nhớ nút đã mở nó, rồi mới chuyển focus vào đây.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    const value = text.trim();
    if (!value || pending) return;
    onSend(value);
    setText('');
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form className="as-composer" onSubmit={onSubmit}>
      <label className="ui-sr-only" htmlFor={inputId}>Câu hỏi cho trợ lý</label>
      <textarea
        id={inputId}
        ref={inputRef}
        rows={2}
        maxLength={MAX_MESSAGE_CHARS}
        value={text}
        placeholder="Hỏi về hồ sơ, hàng đợi, số liệu…"
        aria-describedby={hintId}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <button type="submit" className="ui-btn primary as-send" disabled={pending || !text.trim()} aria-label="Gửi câu hỏi">
        <Icon name="send" />
      </button>
      <p id={hintId} className="as-hint">Enter để gửi, Shift+Enter để xuống dòng. Không nhập CCCD, mật khẩu, PIN, OTP.</p>
    </form>
  );
}
