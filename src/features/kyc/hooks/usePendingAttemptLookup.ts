import { useMemo } from 'react';
import { PENDING_ATTEMPT_LOOKUP_SIZE, useGetEkycAttemptsQuery } from '@/features/ekyc-review';

/**
 * Lượt chờ duyệt tay của từng khách, để mở thẳng màn duyệt từ bảng hoặc trang chi tiết khách hàng.
 *
 * API danh sách lượt chưa lọc được theo khách nên tải một trang {@link PENDING_ATTEMPT_LOOKUP_SIZE} lượt rồi tra trong
 * đó; cùng tham số với bộ chuyển lượt ở màn duyệt nên dùng chung cache. `total` là tổng số lượt chờ trên toàn hệ thống
 * (số trên tab "Chờ duyệt tay").
 *
 * @param enabled chỉ tải khi tài khoản có quyền Xem "Duyệt xác minh danh tính".
 */
export function usePendingAttemptLookup(enabled: boolean) {
  const query = useGetEkycAttemptsQuery(
    { status: 'MANUAL_REVIEW', page: 0, size: PENDING_ATTEMPT_LOOKUP_SIZE },
    { skip: !enabled },
  );
  // Mã khách → lượt chờ mới nhất của khách đó (backend xếp lượt gửi sớm trước nên lượt sau ghi đè).
  const byCustomer = useMemo(() => {
    const map = new Map<number, string>();
    for (const attempt of query.data?.content ?? []) map.set(attempt.userProfileId, attempt.attemptId);
    return map;
  }, [query.data]);

  return {
    byCustomer,
    total: query.data?.totalElements,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
