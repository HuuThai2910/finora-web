import { toUiApiError } from '@/lib/api/errors';

interface ErrorNoticeProps {
  error: unknown;
  onRetry?: () => void;
}

/** Khối báo lỗi tải dữ liệu, giữ mã lỗi và traceId để đối chiếu log backend. */
export function ErrorNotice({ error, onRetry }: ErrorNoticeProps) {
  const uiError = toUiApiError(error);
  const detail = [uiError.code, uiError.traceId && `mã truy vết ${uiError.traceId}`].filter(Boolean).join(', ');

  return (
    <div className="ui-alert" role="alert">
      <div>
        {uiError.message}
        {detail && <small>{detail}</small>}
      </div>
      {onRetry && (
        <button type="button" className="ui-btn soft" onClick={onRetry}>Thử lại</button>
      )}
    </div>
  );
}
