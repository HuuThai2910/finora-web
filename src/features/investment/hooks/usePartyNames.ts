import { useCallback } from 'react';
import { useActorNames } from '@/features/loan';
import type { ListingInvestor } from '../types';

/**
 * Tên hiển thị của nhà đầu tư trên trang chi tiết gọi vốn.
 *
 * Investment chỉ lưu mã người dùng; họ tên tra từ finora-user (`useActorNames`, cần quyền Xem "Khách hàng"). Giao diện
 * không hiện mã kỹ thuật, nên khi chưa tra được tên thì gọi theo thứ tự đặt lệnh: "Nhà đầu tư 1", "Nhà đầu tư 2"…
 * Hàm `nameOf` giữ tham chiếu theo tập tên đã tra để biểu đồ (dựng option theo hàm này) không vẽ lại thừa.
 */
export function usePartyNames(investors: ListingInvestor[], extraIds: Array<string | null | undefined> = []) {
  const ordered = [...investors].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const ids = Array.from(new Set(ordered.map((item) => item.investorId)));
  const { names, displayName } = useActorNames([...ids, ...extraIds]);
  const key = ids.join(',');

  const nameOf = useCallback((investorId: string): string => {
    const actor = names[investorId];
    if (actor) return actor.fullName ?? actor.email;
    const position = key.split(',').indexOf(investorId);
    return position >= 0 ? `Nhà đầu tư ${position + 1}` : 'Nhà đầu tư';
  }, [names, key]);

  return { nameOf, names, displayName };
}
