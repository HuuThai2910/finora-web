import { createContext, useContext } from 'react';
import type { SuggestionItem } from '../types';

export interface AssistantPanel {
  /** `GET /suggestions` trả 200: trợ lý đang bật và tài khoản được dùng trên web. */
  available: boolean;
  isOpen: boolean;
  /** Mở ngăn chat; có `suggestion` thì gửi luôn gợi ý đó (ví dụ "Tóm tắt hồ sơ này"). */
  openAssistant: (suggestion?: SuggestionItem) => void;
  closeAssistant: () => void;
}

/**
 * Giá trị mặc định khi một component nằm ngoài `AssistantProvider` (chưa có nơi nào như vậy): nút
 * trợ lý tự ẩn thay vì làm hỏng trang.
 */
const UNAVAILABLE: AssistantPanel = {
  available: false,
  isOpen: false,
  openAssistant: () => undefined,
  closeAssistant: () => undefined,
};

/**
 * Context nhỏ chỉ để mở/đóng ngăn chat từ ngoài khung trang (nút "Tóm tắt hồ sơ này" ở trang thẩm
 * định). Tin nhắn không nằm ở đây: chúng đổi liên tục và chỉ ngăn chat cần đọc.
 */
export const AssistantPanelContext = createContext<AssistantPanel>(UNAVAILABLE);

export function useAssistantPanel(): AssistantPanel {
  return useContext(AssistantPanelContext);
}
