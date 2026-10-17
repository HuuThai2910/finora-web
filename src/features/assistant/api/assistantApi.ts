import { apiFetch } from '@/lib/api/httpClient';
import { ASSISTANT_API_BASE, ASSISTANT_SURFACE } from '../constants';
import type { ChatRequestBody, ChatResponseBody, FeedbackRequestBody, SuggestionItem } from '../types';

/*
 * Ba endpoint của Trợ lý FINORA (finora-ai, spec mục 5). Đi qua `apiFetch` nên kèm cookie
 * `access_token`; gặp 401 (cookie hết hạn sau 5 phút, hoặc token còn dưới 60 giây) thì làm mới phiên
 * một lần rồi gửi lại, dùng chung khóa single-flight với mọi request khác của web. Lỗi HTTP giữ dạng
 * `ApiError` để `toAssistantError` dịch theo mã.
 */

/** Một lượt hỏi. Có thể mất tới 40 giây (LLM + gọi service), nên nhận `signal` để hủy khi bỏ cuộc trò chuyện. */
export function sendChat(body: ChatRequestBody, signal?: AbortSignal): Promise<ChatResponseBody> {
  return apiFetch<ChatResponseBody>(`${ASSISTANT_API_BASE}/chat`, {
    method: 'POST',
    body: JSON.stringify(body),
    signal,
  });
}

/** Gợi ý theo vai trò và màn (tối đa 4). Không có màn thì bỏ tham số `screen` để nhận gợi ý chung. */
export function getSuggestions(screen: string | null, signal?: AbortSignal): Promise<SuggestionItem[]> {
  const query = new URLSearchParams({ surface: ASSISTANT_SURFACE });
  if (screen) query.set('screen', screen);
  return apiFetch<SuggestionItem[]>(`${ASSISTANT_API_BASE}/suggestions?${query.toString()}`, { signal });
}

/** Đánh giá một câu trả lời. Server trả 204 và chỉ ghi log siêu dữ liệu, không lưu nội dung. */
export async function sendFeedback(body: FeedbackRequestBody): Promise<void> {
  await apiFetch<unknown>(`${ASSISTANT_API_BASE}/feedback`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
