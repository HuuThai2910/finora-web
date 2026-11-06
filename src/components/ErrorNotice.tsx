import { toUiApiError } from '@/lib/api/errors';

interface ErrorNoticeProps {
  error: unknown;
  onRetry?: () => void;
}

/**
 * Khối báo lỗi tải dữ liệu. Người dùng chỉ cần câu báo và mã tra cứu (traceId) để gửi bộ phận kỹ thuật đối chiếu log;
 * mã lỗi nội bộ (INTERNAL_ERROR…) không hiện trên giao diện.
 */
export function ErrorNotice({ error, onRetry }: ErrorNoticeProps) {
  const uiError = toUiApiError(error);
  const detail = uiError.traceId ? `Mã tra cứu ${uiError.traceId}` : '';

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
