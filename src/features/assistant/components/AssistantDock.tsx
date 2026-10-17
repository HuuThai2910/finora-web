import { useEffect } from 'react';
import { useAiNoticeConsent } from '../hooks/useAiNoticeConsent';
import { useAssistantChat } from '../hooks/useAssistantChat';
import { useAssistantContext } from '../hooks/useAssistantContext';
import type { SuggestionItem } from '../types';
import { AssistantDrawer } from './AssistantDrawer';

interface AssistantDockProps {
  open: boolean;
  /** Gợi ý do một trang yêu cầu gửi (nút "Tóm tắt hồ sơ này"), chờ tới lúc gửi được. */
  queued: SuggestionItem | null;
  onQueuedSent: () => void;
  onClose: () => void;
}

/**
 * Luôn gắn trong khung trang khi trợ lý bật, kể cả lúc ngăn đóng: giữ hội thoại và thông báo AI, chỉ
 * dựng ngăn chat khi `open`. Câu đang chờ vẫn chạy tiếp khi ngăn đóng; mở lại là thấy câu trả lời.
 */
export function AssistantDock({ open, queued, onQueuedSent, onClose }: AssistantDockProps) {
  const context = useAssistantContext();
  const chat = useAssistantChat(context);
  const notice = useAiNoticeConsent();
  const { send, pending } = chat;

  // Gợi ý từ trang chỉ được gửi sau khi người dùng đã đọc thông báo AI (không câu nào rời trình duyệt
  // trước đó) và khi không còn câu nào đang chờ (hook chỉ cho một câu chạy một lúc). Chưa đủ điều kiện
  // thì giữ nguyên trong hàng chờ; effect chạy lại khi bấm "Đã hiểu" hoặc câu trước trả về.
  useEffect(() => {
    if (!queued || !notice.accepted || pending) return;
    send(queued.label, queued.id);
    onQueuedSent();
  }, [queued, notice.accepted, pending, send, onQueuedSent]);

  if (!open) return null;
  return (
    <AssistantDrawer
      chat={chat}
      context={context}
      noticeAccepted={notice.accepted}
      onAcceptNotice={notice.accept}
      onClose={onClose}
    />
  );
}
