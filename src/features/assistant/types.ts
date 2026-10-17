/*
 * Kiểu của Trợ lý FINORA trên web quản trị (AI-CHAT-001).
 *
 * Nhóm đầu khớp đúng JSON camelCase của finora-ai (`app/schemas/assistant.py`, spec mục 5). Nhóm sau
 * là kiểu riêng của giao diện: tin nhắn trong ngăn chat và lỗi đã dịch sang lời cho người dùng.
 */

export type AssistantSurface = 'mobile' | 'web';

export interface AssistantContext {
  screen?: string;
  params?: Record<string, string>;
  lastErrorCode?: string | null;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequestBody {
  message: string;
  history: ChatTurn[];
  surface: AssistantSurface;
  context?: AssistantContext | null;
  suggestionId?: string | null;
}

export interface CardItem {
  label: string;
  value: string;
}

/** Thẻ số liệu. Mọi chuỗi đã được server định dạng; web chỉ hiển thị, không tính lại. */
export interface AssistantCard {
  kind: 'kv' | 'table' | 'progress';
  title: string;
  items: CardItem[];
  columns: string[];
  rows: string[][];
  value: number | null;
  max: number | null;
  label: string | null;
}

/** Đích điều hướng: web dùng `path`, mobile dùng `screen` + `params`. */
export interface ActionTarget {
  screen: string | null;
  params: Record<string, string>;
  path: string | null;
}

export interface AssistantAction {
  key: string;
  label: string;
  target: ActionTarget;
}

export interface AssistantCitation {
  id: string;
  kind: 'LUAT' | 'CHINH_SACH' | 'CHUA_XAC_MINH' | 'HUONG_DAN';
  label: string;
  url: string | null;
  checkedAt: string;
}

export interface SuggestionItem {
  id: string;
  label: string;
}

export interface ChatResponseBody {
  turnId: string;
  answer: string;
  cards: AssistantCard[];
  actions: AssistantAction[];
  citations: AssistantCitation[];
  suggestions: SuggestionItem[];
  mode: 'template' | 'llm' | 'fallback';
  disclaimer: string | null;
}

export type FeedbackRating = 'up' | 'down';

export interface FeedbackRequestBody {
  turnId: string;
  rating: FeedbackRating;
}

/** Màn quản trị có ngữ cảnh, đúng tên màn finora-ai dùng cho gợi ý và `ADMIN_SCREEN_TOOLS` (Task 11, 21). */
export type AdminScreen = 'Dashboard' | 'LoanList' | 'LoanReview' | 'Operations';

/** Lỗi đã dịch sang lời cho người dùng; giữ mã để đối chiếu log của finora-ai. */
export interface AssistantUiError {
  status?: number | string;
  code: string;
  message: string;
  /** Gửi lại đúng câu đó có ích không (mạng, hỏi quá nhanh, server lỗi tạm thời). */
  retryable: boolean;
}

export interface UserMessage {
  id: string;
  role: 'user';
  text: string;
  suggestionId: string | null;
  /** Câu chưa có trả lời (lỗi): không đưa vào `history` của lượt sau. */
  failed: boolean;
}

export interface AssistantMessage {
  id: string;
  role: 'assistant';
  response: ChatResponseBody;
  rating: FeedbackRating | null;
  feedbackFailed: boolean;
}

export interface ErrorMessage {
  id: string;
  role: 'error';
  error: AssistantUiError;
  /** Id câu hỏi bị lỗi, để nút "Gửi lại" gửi đúng câu đó. */
  retryOf: string;
}

export type ChatMessage = UserMessage | AssistantMessage | ErrorMessage;
