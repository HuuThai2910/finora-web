import { Icon } from '@/components/Icon';
import type { AssistantMessage, FeedbackRating } from '../types';
import { ActionLinks } from './ActionLinks';
import { CardView } from './CardView';
import { CitationList } from './CitationList';

interface AssistantReplyProps {
  message: AssistantMessage;
  onRate: (messageId: string, rating: FeedbackRating) => void;
  onOpenPath: (path: string) => void;
}

/**
 * Một câu trả lời: lời giải thích, thẻ số liệu, nút mở trang, căn cứ, câu miễn trừ và nút đánh giá.
 * Lời giải thích là chữ thuần (giữ xuống dòng bằng CSS), không dựng HTML từ nội dung của model.
 */
export function AssistantReply({ message, onRate, onOpenPath }: AssistantReplyProps) {
  const { response, rating, feedbackFailed } = message;
  return (
    <article className="as-msg as-bot" aria-label="Câu trả lời của trợ lý">
      {response.mode === 'fallback' ? (
        <p className="as-mode">Trợ lý đang ở chế độ rút gọn: câu trả lời dựng thẳng từ dữ liệu, chưa qua AI.</p>
      ) : null}
      <p className="as-answer">{response.answer}</p>
      {response.cards.map((card, index) => (
        <CardView key={`${card.title}-${index}`} card={card} />
      ))}
      <ActionLinks actions={response.actions} onOpenPath={onOpenPath} />
      <CitationList citations={response.citations} />
      {response.disclaimer ? <p className="as-disclaimer">{response.disclaimer}</p> : null}

      <div className="as-feedback" role="group" aria-label="Đánh giá câu trả lời">
        <button
          type="button"
          aria-label="Câu trả lời hữu ích"
          aria-pressed={rating === 'up'}
          disabled={rating !== null}
          onClick={() => onRate(message.id, 'up')}
        >
          <Icon name="thumbUp" />
        </button>
        <button
          type="button"
          aria-label="Câu trả lời chưa đúng"
          aria-pressed={rating === 'down'}
          disabled={rating !== null}
          onClick={() => onRate(message.id, 'down')}
        >
          <Icon name="thumbDown" />
        </button>
        {rating ? <span>Đã ghi nhận đánh giá.</span> : null}
        {feedbackFailed ? <span className="as-feedback-error">Chưa gửi được đánh giá, bấm lại.</span> : null}
      </div>
    </article>
  );
}
