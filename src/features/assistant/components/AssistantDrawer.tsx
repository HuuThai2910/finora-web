import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { useGetAssistantSuggestionsQuery } from '../api/assistantQueries';
import type { AssistantChat } from '../hooks/useAssistantChat';
import { useDrawerFocus } from '../hooks/useDrawerFocus';
import { describeScreenContext } from '../mappers/screenContext';
import type { AssistantContext, SuggestionItem } from '../types';
import { AiNotice } from './AiNotice';
import { Composer } from './Composer';
import { MessageList } from './MessageList';
import { SuggestionChips } from './SuggestionChips';
import './AssistantDrawer.css';

interface AssistantDrawerProps {
  chat: AssistantChat;
  context: AssistantContext | null;
  noticeAccepted: boolean;
  onAcceptNotice: () => void;
  onClose: () => void;
}

/**
 * Gợi ý hiện dưới hội thoại: chưa hỏi gì thì lấy gợi ý theo màn từ server; sau mỗi câu trả lời thì
 * dùng gợi ý tiếp theo server gửi kèm. Tin cuối là lỗi thì không gợi ý (nút "Gửi lại" là việc chính).
 */
function nextSuggestions(chat: AssistantChat, screenSuggestions: SuggestionItem[] | undefined): SuggestionItem[] {
  if (chat.messages.length === 0) return screenSuggestions ?? [];
  const last = chat.messages[chat.messages.length - 1];
  return last.role === 'assistant' ? last.response.suggestions : [];
}

/**
 * Ngăn chat trượt bên phải (hộp thoại modal): Esc hoặc bấm nền để đóng, Tab đi vòng trong ngăn, đóng
 * thì trả focus về nút đã mở. Nút điều hướng trong câu trả lời đóng ngăn rồi mở trang, hội thoại vẫn giữ.
 */
export function AssistantDrawer({ chat, context, noticeAccepted, onAcceptNotice, onClose }: AssistantDrawerProps) {
  const titleId = useId();
  const contextId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  useDrawerFocus(panelRef, onClose);

  const screenSuggestions = useGetAssistantSuggestionsQuery(context?.screen ?? null);
  const contextLabel = describeScreenContext(context);
  const chips = noticeAccepted && !chat.pending ? nextSuggestions(chat, screenSuggestions.data) : [];

  const openPath = (path: string) => {
    onClose();
    navigate(path);
  };

  return createPortal(
    <>
      <div className="as-scrim" onMouseDown={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        className="as-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={contextId}
      >
        <header className="as-head">
          <div className="as-head-text">
            <h2 id={titleId}>Trợ lý FINORA</h2>
            <p id={contextId}>
              {contextLabel ? `Đang xem: ${contextLabel}` : 'Hỏi về số liệu, hàng đợi và chính sách quản trị'}
            </p>
          </div>
          <button
            type="button"
            className="ui-btn soft"
            onClick={chat.reset}
            disabled={chat.messages.length === 0}
          >
            Cuộc trò chuyện mới
          </button>
          <button type="button" className="as-close" aria-label="Đóng trợ lý" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>

        <div className="as-body">
          {chat.messages.length === 0 ? (
            <p className="as-intro">
              Trợ lý chỉ đọc số liệu và chỉ đường tới trang quản trị; không duyệt, từ chối hay sửa dữ liệu thay bạn.
              Câu trả lời có thể sai, số liệu chính thức là số trên các trang.
            </p>
          ) : (
            <MessageList
              messages={chat.messages}
              pending={chat.pending}
              onRetry={chat.retryLast}
              onRate={chat.rate}
              onOpenPath={openPath}
            />
          )}
          {chips.length > 0 ? <SuggestionChips items={chips} onPick={(item) => chat.send(item.label, item.id)} /> : null}
        </div>

        <footer className="as-foot">
          {noticeAccepted ? (
            <Composer pending={chat.pending} onSend={(text) => chat.send(text)} />
          ) : (
            <AiNotice onAccept={onAcceptNotice} />
          )}
        </footer>
      </aside>
    </>,
    document.body,
  );
}
