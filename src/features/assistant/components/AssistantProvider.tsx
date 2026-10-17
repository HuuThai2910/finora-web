import { useCallback, useMemo, useState, type PropsWithChildren } from 'react';
import { useGetAssistantSuggestionsQuery } from '../api/assistantQueries';
import { AssistantPanelContext, type AssistantPanel } from '../hooks/useAssistantPanel';
import type { SuggestionItem } from '../types';
import { AssistantDock } from './AssistantDock';

/**
 * Bọc khung trang quản trị: quyết định có hiện trợ lý không và giữ trạng thái mở/đóng ngăn chat.
 *
 * - Công tắc là `GET /suggestions` không theo màn: 200 thì hiện mọi lối vào; 503 (`ASSISTANT_DISABLED`),
 *   403 hay lỗi mạng thì ẩn, trang quản trị chạy như chưa có trợ lý.
 * - Gợi ý do trang gửi tới (nút "Tóm tắt hồ sơ này") nằm trong `queued` tới khi `AssistantDock` gửi đi.
 * - Hội thoại không nằm ở đây mà ở `AssistantDock`, để mỗi tin nhắn mới không làm các nút ở trang
 *   (đọc context này) render lại. `useMemo`/`useCallback` giữ giá trị context ổn định vì `AdminLayout`
 *   render lại sau mỗi lần chuyển trang.
 */
export function AssistantProvider({ children }: PropsWithChildren) {
  const availability = useGetAssistantSuggestionsQuery(null);
  const available = availability.isSuccess;
  const [isOpen, setIsOpen] = useState(false);
  const [queued, setQueued] = useState<SuggestionItem | null>(null);

  const openAssistant = useCallback((suggestion?: SuggestionItem) => {
    if (suggestion) setQueued(suggestion);
    setIsOpen(true);
  }, []);
  const closeAssistant = useCallback(() => setIsOpen(false), []);
  const clearQueued = useCallback(() => setQueued(null), []);

  const panel = useMemo<AssistantPanel>(
    () => ({ available, isOpen, openAssistant, closeAssistant }),
    [available, isOpen, openAssistant, closeAssistant],
  );

  return (
    <AssistantPanelContext.Provider value={panel}>
      {children}
      {available ? (
        <AssistantDock open={isOpen} queued={queued} onQueuedSent={clearQueued} onClose={closeAssistant} />
      ) : null}
    </AssistantPanelContext.Provider>
  );
}
