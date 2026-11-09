import { useMemo } from 'react';
import { usePermission, type OpsFunctionCode } from '@/features/auth';
import { useGetApplicationNumbersQuery } from '../api/loanReviewApi';
import type { ApplicationReference } from '../types';

/** Quyền đọc hồ sơ vay của Loan: hồ sơ vay hoặc một trong các việc sau giải ngân. */
const APPLICATION_READERS: OpsFunctionCode[] = ['loan-application', 'collection', 'reschedule', 'reconciliation'];

/**
 * Mã hồ sơ (`LA-…` để mở trang, `HS-…` để hiện) cho một trang bảng chỉ có ID số (bảng đối soát của Payment). Gom cả trang
 * thành một request; chưa tải xong hoặc không tra được thì bảng vẫn hiện "Hồ sơ #id" như cũ.
 */
export function useApplicationNumbers(ids: Array<number | null | undefined>): Map<number, ApplicationReference> {
  const { canView } = usePermission();
  // Khớp quyền đọc hồ sơ vay của Loan: hồ sơ vay hoặc một trong các việc sau giải ngân.
  const allowed = APPLICATION_READERS.some((code) => canView(code));
  // Chuỗi ID làm khóa: mảng mới cùng nội dung không tạo tham số mới, nên không gửi lại request.
  const joined = [...new Set(ids.filter((id): id is number => typeof id === 'number'))].sort((a, b) => a - b)
    .slice(0, 100).join(',');
  const key = useMemo(() => (joined ? joined.split(',').map(Number) : []), [joined]);
  const result = useGetApplicationNumbersQuery(key, { skip: key.length === 0 || !allowed });
  return useMemo(
    () => new Map((result.data ?? []).map((row) => [row.id, row])),
    [result.data],
  );
}
