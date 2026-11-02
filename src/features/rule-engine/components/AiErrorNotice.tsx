import { toAiUiError } from '../mappers/aiApiError';

interface AiErrorNoticeProps {
  error: unknown;
  onRetry?: () => void;
}

/**
 * Khối báo lỗi cho lời gọi finora-ai. Cùng giao diện với `ErrorNotice` dùng chung,
 * nhưng đọc được `detail` kiểu FastAPI (xem `toAiUiError`).
 */
export function AiErrorNotice({ error, onRetry }: AiErrorNoticeProps) {
  const uiError = toAiUiError(error);
  // Lỗi 4xx là câu kiểm tra dữ liệu viết cho quản trị viên: không kèm mã kỹ thuật. Lỗi hệ thống mới cần mã để tra cứu.
  const systemError = typeof uiError.status !== 'number' || uiError.status >= 500;
  const status = typeof uiError.status === 'number' ? `HTTP ${uiError.status}` : undefined;
  const detail = systemError
    ? [status, uiError.code, uiError.traceId && `mã truy vết ${uiError.traceId}`].filter(Boolean).join(', ')
    : '';

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
