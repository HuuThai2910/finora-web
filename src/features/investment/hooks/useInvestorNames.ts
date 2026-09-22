import { useEffect, useState } from 'react';
import { userApi } from '@/features/user/api/userApi';

/**
 * Tra tên nhà đầu tư từ danh sách mã.
 *
 * Investment Service cố ý không lưu tên — hồ sơ người dùng thuộc finora-user, và niêm yết
 * trên sàn không mang dữ liệu cá nhân. Việc ghép tên vào làm ở tầng giao diện, nơi quản
 * trị viên đã có quyền đọc hồ sơ người dùng.
 *
 * Gọi một lần lấy cả trang người dùng rồi tra cục bộ, thay vì gọi từng mã: một khoản vay
 * có thể có hàng chục nhà đầu tư, gọi riêng lẻ sẽ thành N+1 request.
 */
export function useInvestorNames(investorIds: string[]): {
  names: Record<string, string>;
  isLoading: boolean;
} {
  const [names, setNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Khoá phụ thuộc là chuỗi đã sắp xếp: mảng mới mỗi lần render sẽ làm effect chạy lại
  // vô hạn nếu so sánh bằng tham chiếu.
  const key = [...new Set(investorIds)].sort().join(',');

  useEffect(() => {
    if (key === '') {
      setNames({});
      return undefined;
    }

    let cancelled = false;
    setIsLoading(true);

    userApi
      .getUsers(0, 200)
      .then((page) => {
        if (cancelled) return;
        const map: Record<string, string> = {};
        for (const user of page.content ?? []) {
          if (user.fullName) map[String(user.id)] = user.fullName;
        }
        setNames(map);
      })
      .catch(() => {
        // Không tra được tên thì bảng vẫn hiển thị mã — mất tên là bất tiện, không phải lỗi
        // chặn luồng, nên không ném ra ngoài.
        if (!cancelled) setNames({});
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

  return { names, isLoading };
}
