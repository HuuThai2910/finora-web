import { useEffect, useRef } from 'react';
import { Icon } from '@/components/Icon';
import type { ChatMessage, FeedbackRating } from '../types';
import { AssistantReply } from './AssistantReply';

interface MessageListProps {
  messages: ChatMessage[];
  pending: boolean;
  onRetry: () => void;
  onRate: (messageId: string, rating: FeedbackRating) => void;
  onOpenPath: (path: string) => void;
}

/**
 * Hội thoại theo thứ tự thời gian. `role="log"` để trình đọc màn hình đọc tin mới mà không đọc lại cả
 * danh sách. Lỗi hiện ngay dưới câu hỏi hỏng, kèm mã lỗi để đối chiếu log finora-ai.
 */
export function MessageList({ messages, pending, onRetry, onRate, onOpenPath }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const last = messages[messages.length - 1];

  // Tin mới (câu hỏi, câu trả lời, lỗi, dòng "đang soạn") luôn ở cuối: cuộn xuống để thấy ngay.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, pending]);

  return (
    <div className="as-log" role="log" aria-live="polite" aria-label="Hội thoại với trợ lý">
      {messages.map((message) => {
        if (message.role === 'user') {
          return (
            <p key={message.id} className={message.failed ? 'as-msg as-user failed' : 'as-msg as-user'}>
              {message.text}
            </p>
          );
        }
        if (message.role === 'assistant') {
          return <AssistantReply key={message.id} message={message} onRate={onRate} onOpenPath={onOpenPath} />;
        }
        const canRetry = message.error.retryable && message === last && !pending;
        return (
          <div key={message.id} className="ui-alert as-error">
            <span>
              {message.error.message}
              <small>Mã lỗi: {message.error.code}</small>
            </span>
            {canRetry ? (
              <button type="button" className="ui-btn soft" onClick={onRetry}>
                <Icon name="refresh" />
                Gửi lại
              </button>
            ) : null}
          </div>
        );
      })}
      {pending ? (
        <p className="as-typing" role="status">
          <span className="as-dots" aria-hidden="true"><i /><i /><i /></span>
          Trợ lý đang lấy dữ liệu và soạn câu trả lời…
        </p>
      ) : null}
      <div ref={endRef} />
    </div>
  );
}
