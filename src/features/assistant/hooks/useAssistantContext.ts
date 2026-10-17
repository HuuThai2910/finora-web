import { useLocation } from 'react-router-dom';
import { screenContextFromLocation } from '../mappers/screenContext';
import type { AssistantContext } from '../types';

/**
 * Ngữ cảnh màn hình của câu hỏi, suy ra từ URL hiện tại (spec mục 13.2): `/loans/:applicationNumber/review`
 * → `LoanReview`, `/dashboard` → `Dashboard`, `/loans` → `LoanList`, trang vận hành → `Operations`.
 * Trang khác trả `null`. Không cần trang nào tự khai báo, nên trang mới không phải sửa gì.
 */
export function useAssistantContext(): AssistantContext | null {
  const { pathname, search } = useLocation();
  return screenContextFromLocation(pathname, search);
}
