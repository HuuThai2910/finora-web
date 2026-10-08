import type { UiApiError } from '@/lib/api/errors';

/**
 * Lỗi của một thao tác (đã chuẩn hóa thành `UiApiError`), giữ mã lỗi và traceId để đối chiếu log.
 * Khác `ErrorNotice` ở chỗ nhận lỗi đã chuẩn hóa, vì lỗi nghiệp vụ như lệnh đồng bộ `FAILED` không phải lỗi HTTP.
 */
export function ActionError({ error }: { error: UiApiError }) {
  const detail = [error.code, error.traceId && `mã truy vết ${error.traceId}`].filter(Boolean).join(', ');
  return (
    <div className="ui-alert" role="alert">
      <div>
        {error.message}
        {detail && <small>{detail}</small>}
      </div>
    </div>
  );
}
