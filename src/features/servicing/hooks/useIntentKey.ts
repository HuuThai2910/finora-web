import { useRef } from 'react';
import { createIdempotencyKey } from '@/lib/api/idempotency';

/**
 * Idempotency key cho **một ý định** của người dùng.
 *
 * Key sinh lần đầu khi gửi và được giữ nguyên khi gửi lại cùng nội dung (bấm thử lại sau lỗi mạng),
 * để backend nhận ra là cùng một yêu cầu thay vì ghi hai lần. Đổi nội dung (`fingerprint` khác) là ý
 * định mới nên sinh key mới: Loan Service so băm nội dung và từ chối key cũ đi kèm nội dung khác
 * (`IDEMPOTENCY_KEY_REUSED`). Thành công thì gọi `reset` để lần gửi sau là ý định mới.
 *
 * @param prefix tiền tố giúp đọc log, ví dụ `collection-action`.
 */
export function useIntentKey(prefix: string) {
  const current = useRef<{ fingerprint: string; key: string } | null>(null);

  return {
    keyFor(fingerprint: string): string {
      if (current.current?.fingerprint !== fingerprint) {
        current.current = { fingerprint, key: createIdempotencyKey(prefix) };
      }
      return current.current.key;
    },
    reset() {
      current.current = null;
    },
  };
}
