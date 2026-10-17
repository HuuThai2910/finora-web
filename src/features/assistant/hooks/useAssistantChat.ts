import { useEffect, useRef, useState } from 'react';
import { sendChat, sendFeedback } from '../api/assistantApi';
import { ASSISTANT_SURFACE, MAX_MESSAGE_CHARS } from '../constants';
import { toAssistantError } from '../mappers/assistantError';
import { buildHistory } from '../mappers/chatHistory';
import type {
  AssistantContext,
  AssistantMessage,
  ChatMessage,
  FeedbackRating,
  UserMessage,
} from '../types';

export interface AssistantChat {
  messages: ChatMessage[];
  pending: boolean;
  send: (text: string, suggestionId?: string | null) => void;
  /** Gửi lại câu hỏi vừa lỗi (chỉ khi tin cuối là lỗi có thể thử lại). */
  retryLast: () => void;
  rate: (messageId: string, rating: FeedbackRating) => void;
  reset: () => void;
}

/**
 * Hội thoại của ngăn chat. Hook chạy trong `AssistantDock`, thứ luôn gắn trong khung trang khi trợ lý
 * bật, nên đóng ngăn hay chuyển trang vẫn giữ cuộc trò chuyện; server không lưu hội thoại (spec mục 11),
 * tải lại trang là mất.
 *
 * - Mỗi lúc chỉ một câu đang chờ: khóa bằng ref (cập nhật ngay, không chờ render) để bấm đúp không
 *   gửi hai lần. Server còn có cache 60 giây chống trùng.
 * - `context` lấy theo trang lúc bấm gửi, nên hỏi ở trang thẩm định thì gửi đúng mã hồ sơ đang xem.
 * - Không tự gửi lại khi lỗi: chỉ hiện nút "Gửi lại" cho lỗi tạm thời (mạng, 429, 5xx).
 */
export function useAssistantChat(context: AssistantContext | null): AssistantChat {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const nextIdRef = useRef(0);

  // Khung trang rời cây (đăng xuất): hủy câu đang chờ để không cập nhật state của phiên cũ.
  useEffect(() => () => controllerRef.current?.abort(), []);

  const newId = () => {
    nextIdRef.current += 1;
    return `m${nextIdRef.current}`;
  };

  const ask = async (question: UserMessage, earlier: readonly ChatMessage[]) => {
    const controller = new AbortController();
    controllerRef.current = controller;
    setPending(true);
    try {
      const response = await sendChat(
        {
          message: question.text,
          history: buildHistory(earlier),
          surface: ASSISTANT_SURFACE,
          context,
          suggestionId: question.suggestionId,
        },
        controller.signal,
      );
      const reply: AssistantMessage = { id: newId(), role: 'assistant', response, rating: null, feedbackFailed: false };
      setMessages((list) => [...list, reply]);
    } catch (error) {
      // Bị hủy do "Cuộc trò chuyện mới" hoặc đăng xuất: không còn ai chờ câu trả lời này.
      if (controller.signal.aborted) return;
      setMessages((list) => [
        ...list.map((item) => (item.role === 'user' && item.id === question.id ? { ...item, failed: true } : item)),
        { id: newId(), role: 'error', error: toAssistantError(error), retryOf: question.id },
      ]);
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setPending(false);
      }
    }
  };

  const send = (rawText: string, suggestionId: string | null = null) => {
    const text = rawText.trim().slice(0, MAX_MESSAGE_CHARS);
    if (!text || controllerRef.current) return;
    const question: UserMessage = { id: newId(), role: 'user', text, suggestionId, failed: false };
    setMessages([...messages, question]);
    void ask(question, messages);
  };

  const retryLast = () => {
    const last = messages[messages.length - 1];
    if (controllerRef.current || !last || last.role !== 'error' || !last.error.retryable) return;
    const index = messages.findIndex((item) => item.id === last.retryOf);
    const question = index >= 0 ? messages[index] : undefined;
    if (!question || question.role !== 'user') return;
    const earlier = messages.slice(0, index);
    const again: UserMessage = { ...question, failed: false };
    setMessages([...earlier, again]);
    void ask(again, earlier);
  };

  const rate = (messageId: string, rating: FeedbackRating) => {
    const target = messages.find((item): item is AssistantMessage => item.role === 'assistant' && item.id === messageId);
    if (!target || target.rating) return;
    const patch = (value: FeedbackRating | null, feedbackFailed: boolean) =>
      setMessages((list) => list.map((item) => (
        item.role === 'assistant' && item.id === messageId ? { ...item, rating: value, feedbackFailed } : item
      )));
    // Hiện lựa chọn ngay; gửi lỗi thì bỏ lựa chọn và báo để người dùng bấm lại.
    patch(rating, false);
    sendFeedback({ turnId: target.response.turnId, rating }).catch(() => patch(null, true));
  };

  const reset = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setPending(false);
    setMessages([]);
  };

  return { messages, pending, send, retryLast, rate, reset };
}
