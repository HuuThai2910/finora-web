import { MAX_HISTORY_CONTENT_CHARS, MAX_HISTORY_TURNS } from '../constants';
import type { ChatMessage, ChatTurn } from '../types';

/**
 * Dựng `history` cho lượt hỏi kế tiếp từ các tin nhắn trước đó: tối đa 6 lượt gần nhất, mỗi lượt cắt
 * còn 2.000 ký tự (giới hạn `ChatRequest` của finora-ai; vượt thì 422 cả lượt).
 *
 * Bỏ câu hỏi chưa có trả lời (`failed`) và thông báo lỗi: chúng không phải hội thoại thật, gửi lên chỉ
 * làm model tưởng người dùng hỏi hai lần liên tiếp. Server chỉ coi history là ngữ cảnh, không coi là dữ kiện.
 */
export function buildHistory(messages: readonly ChatMessage[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const message of messages) {
    if (message.role === 'user' && !message.failed) {
      turns.push({ role: 'user', content: message.text.slice(0, MAX_HISTORY_CONTENT_CHARS) });
    } else if (message.role === 'assistant') {
      turns.push({ role: 'assistant', content: message.response.answer.slice(0, MAX_HISTORY_CONTENT_CHARS) });
    }
  }
  return turns.slice(-MAX_HISTORY_TURNS);
}
