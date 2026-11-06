import { useMemo } from 'react';
import { usePermission } from '@/features/auth';
import { useGetApplicationNumbersQuery } from '../api/loanReviewApi';

/**
 * Mã hồ sơ `LA-…` cho một trang bảng chỉ có ID số (bảng đối soát của Payment). Gom cả trang thành một request; chưa tải
 * xong hoặc không tra được thì bảng vẫn hiện "Hồ sơ #id" như cũ.
 */
export function useApplicationNumbers(ids: Array<number | null | undefined>): Map<number, string> {
  const { canView } = usePermission();
  const allowed = canView('loan-application') || canView('reconciliation');
  // Chuỗi ID làm khóa: mảng mới cùng nội dung không tạo tham số mới, nên không gửi lại request.
  const joined = [...new Set(ids.filter((id): id is number => typeof id === 'number'))].sort((a, b) => a - b)
    .slice(0, 100).join(',');
  const key = useMemo(() => (joined ? joined.split(',').map(Number) : []), [joined]);
  const result = useGetApplicationNumbersQuery(key, { skip: key.length === 0 || !allowed });
  return useMemo(
    () => new Map((result.data ?? []).map((row) => [row.id, row.applicationNumber])),
    [result.data],
  );
}
