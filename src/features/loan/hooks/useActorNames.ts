import { useEffect, useState } from 'react';
import { userApi } from '@/features/user/api/userApi';

/** Tên hiển thị của một người thao tác, tra từ finora-user. */
export interface ActorName {
  fullName: string | null;
  email: string;
}

/**
 * Bộ nhớ đệm dùng chung cho cả trang.
 *
 * Danh sách hồ sơ và màn chi tiết cùng hỏi tên của một nhóm người dùng nhỏ, nên cache
 * ở mức module giúp mỗi ID chỉ gọi API một lần cho tới khi tải lại trang. Họ tên gần
 * như không đổi trong một phiên làm việc nên không cần đặt thời hạn.
 */
const cache = new Map<string, ActorName | null>();

/** Lời gọi đang chạy, để hai component cùng hỏi một ID không tạo hai request. */
const inFlight = new Map<string, Promise<ActorName | null>>();

async function fetchActor(actorId: string): Promise<ActorName | null> {
  const cached = cache.get(actorId);
  if (cached !== undefined) return cached;

  const running = inFlight.get(actorId);
  if (running) return running;

  const request = userApi
    .getUserById(actorId)
    .then((user) => {
      const actor: ActorName = { fullName: user.fullName, email: user.email };
      cache.set(actorId, actor);
      return actor;
    })
    .catch(() => {
      // Không tra được tên thì hiển thị mã số thay vì chặn cả màn hình: dấu vết
      // kiểm toán vẫn đọc được, chỉ kém thân thiện hơn. Hồ sơ cũ mang ID mặc định
      // kiểu BORROWER-001 cũng rơi vào nhánh này. Ghi null để khỏi gọi lại.
      cache.set(actorId, null);
      return null;
    })
    .finally(() => {
      inFlight.delete(actorId);
    });

  inFlight.set(actorId, request);
  return request;
}

/**
 * Tra họ tên người dùng theo ID — dùng cho cả người vay lẫn quản trị viên đã xử lý hồ sơ.
 *
 * Loan Service chỉ lưu ID chứ không lưu tên, tránh nhân bản dữ liệu người dùng sang
 * service khác. Màn quản trị vì vậy phải tự đổi ID thành tên khi hiển thị.
 *
 * @param actorIds ID cần tra; giá trị trùng nhau và rỗng được bỏ qua.
 */
export function useActorNames(actorIds: readonly (string | null | undefined)[]): {
  names: Record<string, ActorName>;
  /** Đổi một ID thành chuỗi hiển thị, tự lùi về mã số khi chưa tra được. */
  displayName: (actorId: string | null | undefined) => string;
} {
  const [names, setNames] = useState<Record<string, ActorName>>({});

  // Chuỗi khoá ổn định để effect không chạy lại khi mảng được tạo mới mỗi lần render.
  const key = actorIds.filter(Boolean).join(',');

  useEffect(() => {
    const ids = Array.from(new Set(key.split(',').filter(Boolean)));
    if (ids.length === 0) return;

    let alive = true;

    void Promise.all(ids.map(async (id) => [id, await fetchActor(id)] as const)).then(
      (entries) => {
        if (!alive) return;

        const resolved: Record<string, ActorName> = {};
        for (const [id, actor] of entries) {
          if (actor) resolved[id] = actor;
        }
        setNames((prev) => ({ ...prev, ...resolved }));
      },
    );

    return () => {
      alive = false;
    };
  }, [key]);

  const displayName = (actorId: string | null | undefined): string => {
    if (!actorId) return 'Không rõ';

    const actor = names[actorId];
    if (!actor) return `#${actorId}`;

    // Hồ sơ chưa quét eKYC thì chưa có họ tên; email là thứ duy nhất còn lại để
    // phân biệt người này với người kia.
    return actor.fullName ?? actor.email;
  };

  return { names, displayName };
}
