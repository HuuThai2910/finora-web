import { Icon } from '@/components/Icon';
import { useAssistantPanel } from '../hooks/useAssistantPanel';
import type { SuggestionItem } from '../types';

/**
 * Nút trên một trang để hỏi trợ lý đúng một gợi ý, ví dụ "Tóm tắt hồ sơ này" ở trang thẩm định. Mở
 * ngăn chat và gửi gợi ý kèm ngữ cảnh của trang (mã hồ sơ lấy từ URL). Trợ lý tắt thì nút tự ẩn.
 */
export function AskAssistantButton({ suggestion }: { suggestion: SuggestionItem }) {
  const { available, openAssistant } = useAssistantPanel();
  if (!available) return null;
  return (
    <button type="button" className="ui-btn ghost" aria-haspopup="dialog" onClick={() => openAssistant(suggestion)}>
      <Icon name="chat" />
      {suggestion.label}
    </button>
  );
}
