import { formatDate } from '@/utils';
import type { RescheduleRequest } from '../types';

/** Nội dung người vay xin đổi: thêm kỳ, hoặc dời một kỳ sang ngày mới. Dùng ở bảng chờ duyệt và hộp quyết định. */
export function rescheduleChangeText(item: RescheduleRequest): string {
  if (item.extraTerms) return `Thêm ${item.extraTerms} kỳ từ ${formatDate(item.rescheduleFromDate)}`;
  if (item.adjustedDueDate) return `Kỳ ${formatDate(item.rescheduleFromDate)} sang ${formatDate(item.adjustedDueDate)}`;
  return `Từ kỳ ${formatDate(item.rescheduleFromDate)}`;
}
