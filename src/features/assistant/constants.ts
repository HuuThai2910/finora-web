import type { AssistantCitation, SuggestionItem } from './types';

/**
 * Đường tương đối cố định, cùng origin với web: khi dev đi qua proxy Vite `/api/v1/ai` (vite.config.ts),
 * khi deploy đi qua rewrite Vercel `/api/v1/:path*` → Caddy → Gateway (route `/api/v1/ai/**`).
 * Cố ý không đọc `VITE_AI_API_URL`: trợ lý bắt buộc cookie `access_token`, nên chỉ chấp nhận cùng origin;
 * một giá trị env trỏ thẳng cổng 8000 (như `.env` trước AI-CHAT-001) sẽ làm trình duyệt không gửi cookie.
 */
export const ASSISTANT_API_BASE = '/api/v1/ai/assistant';

/** Web chỉ dành cho quản trị: server mở bộ công cụ ADMIN khi `surface = web` (spec mục 5). */
export const ASSISTANT_SURFACE = 'web' as const;

/** Giới hạn khớp `ChatRequest` của finora-ai; vượt thì server trả 422 cho cả lượt. */
export const MAX_MESSAGE_CHARS = 1000;
export const MAX_HISTORY_TURNS = 6;
export const MAX_HISTORY_CONTENT_CHARS = 2000;

/** Gợi ý "Tóm tắt hồ sơ này" (`ADMIN_SUGGESTIONS` của finora-ai, Task 11), mở từ trang thẩm định. */
export const REVIEW_SUMMARY_SUGGESTION: SuggestionItem = {
  id: 'admin.review.summary',
  label: 'Tóm tắt hồ sơ này',
};

/**
 * Ba tab trạng thái mà trang Quản lý hồ sơ vay thật sự lọc theo URL (`?status=`). Giá trị khác trên URL
 * bị trang bỏ qua (hiện "Tất cả"), nên trợ lý cũng không gửi, để câu trả lời khớp đúng bảng đang thấy.
 */
export const LOAN_LIST_STATUS_TABS: readonly string[] = ['PENDING_REVIEW', 'APPROVED', 'REJECTED'];

/** Cờ "đã xem thông báo AI" theo trình duyệt; đổi hậu tố khi nội dung thông báo đổi để hiện lại. */
export const AI_NOTICE_STORAGE_KEY = 'finora.assistant.aiNoticeSeen.v1';

/**
 * Bên nhận dữ liệu ở nước ngoài, khớp danh sách nhà cung cấp mặc định của finora-ai (spec mục 7.1).
 * Gemini chỉ nhận câu hỏi chung không có dữ liệu cá nhân (làn PUBLIC).
 */
export const AI_PROVIDER_NOTICE =
  'Cloudflare Workers AI, Groq và OpenRouter (Mỹ); câu hỏi chung không chứa dữ liệu cá nhân có thể đi qua Google Gemini';

/** Nhãn bốn loại căn cứ (spec mục 2): luật, chính sách FINORA, chưa xác minh nguồn, hướng dẫn sử dụng. */
export const CITATION_KIND_LABELS: Record<AssistantCitation['kind'], string> = {
  LUAT: 'Quy định pháp luật',
  CHINH_SACH: 'Chính sách FINORA',
  CHUA_XAC_MINH: 'Chưa xác minh nguồn',
  HUONG_DAN: 'Hướng dẫn',
};
