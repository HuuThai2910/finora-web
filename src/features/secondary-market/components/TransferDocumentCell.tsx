import { Link } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { StatusPill } from '@/components/StatusPill';
import { usePermission } from '@/features/auth';
import { toUiApiError } from '@/lib/api/errors';
import { EMPTY } from '@/utils';
import { useGetTransferDocumentQuery, useRetryTransferDocumentMutation } from '../api/orderBookApi';
import { useTransferDocumentDownload } from '../hooks/useTransferDocumentDownload';
import { documentErrorLabel } from '../constant';
import { ERROR_LINE } from '../styles';
import type { TransferDocument } from '../types';

const DOC_ACTIONS = 'sm-doc-actions inline-flex items-center flex-wrap gap-2';
const DOC_ERROR = `sm-err ${ERROR_LINE}`;

/** Câu lỗi ngắn cho ô bảng: thông báo của backend kèm mã lỗi để đối chiếu nhật ký. */
function errorText(error: unknown): string {
  const ui = toUiApiError(error);
  return `${ui.message} (${ui.code})`;
}

/** Văn bản đã phát hành: tải PDF đã ký và mở bằng chứng blockchain neo hash của văn bản. */
function IssuedDocument({ doc }: { doc: TransferDocument }) {
  const { download, downloading, error } = useTransferDocumentDownload();
  const canViewProofs = usePermission().canView('blockchain');
  const proofLink = `/blockchain/proofs?referenceType=NOTE_TRANSFER_DOCUMENT&referenceId=${encodeURIComponent(doc.tradeReference)}`;

  return (
    <>
      <span className={DOC_ACTIONS}>
        <button
          type="button"
          className="ui-btn soft"
          disabled={downloading}
          aria-label={`Tải PDF giấy xác nhận ${doc.documentNumber}`}
          onClick={() => void download(doc.tradeReference, doc.documentNumber)}
        >
          <Icon name="file" />
          {downloading ? 'Đang tải...' : 'Tải PDF'}
        </button>
        {canViewProofs && <Link className="ui-link" to={proofLink}>Bằng chứng</Link>}
      </span>
      <span className="ui-sub ui-mono">{doc.documentNumber}</span>
      {error != null && <span className={DOC_ERROR} role="alert">{errorText(error)}</span>}
    </>
  );
}

/** Lập văn bản lỗi: hiện lỗi gần nhất và cho lập lại (chỉ FAILED, backend cũng chặn trạng thái khác). */
function FailedDocument({ doc }: { doc: TransferDocument }) {
  const [retry, state] = useRetryTransferDocumentMutation();
  // Lập lại văn bản cần quyền Thao tác "Chợ thứ cấp"; chỉ có quyền Xem thì chỉ thấy trạng thái lỗi.
  const canRetry = usePermission().canAct('secondary-market');

  return (
    <>
      <span className={DOC_ACTIONS}>
        <StatusPill tone="danger">Lỗi</StatusPill>
        {canRetry && (
          <button
            type="button"
            className="ui-btn soft"
            disabled={state.isLoading}
            aria-label={`Lập lại giấy xác nhận của lần khớp ${doc.tradeReference}`}
            onClick={() => void retry(doc.tradeReference)}
          >
            <Icon name="repeat" />
            {state.isLoading ? 'Đang gửi...' : 'Thử lại'}
          </button>
        )}
      </span>
      <span className={DOC_ERROR}>
        {`${doc.attempts} lần thử${doc.lastError ? `, ${documentErrorLabel(doc.lastError)}` : ''}`}
      </span>
      {state.error != null && !state.isLoading && <span className={DOC_ERROR} role="alert">{errorText(state.error)}</span>}
    </>
  );
}

interface Props {
  tradeReference: string;
  /** Lần khớp đã thanh toán xong; chưa thanh toán thì chưa có văn bản. */
  settled: boolean;
  /** Văn bản đã có sẵn từ API danh sách: dùng luôn, không gọi API chi tiết. */
  doc?: TransferDocument;
}

/**
 * Ô "Giấy xác nhận" của một lần khớp, dùng ở bảng giao dịch và bảng giấy xác nhận. Bảng giao dịch không có văn bản sẵn
 * nên chỉ dòng đã thanh toán gọi `GET /transfer-documents/{tradeReference}` (tối đa một trang bảng, mỗi dòng một
 * request có cache riêng); bảng giấy xác nhận truyền `doc` từ danh sách. 404 là chưa có văn bản; lỗi khác hiện mã lỗi
 * ngay trong ô để không làm hỏng cả bảng.
 */
export function TransferDocumentCell({ tradeReference, settled, doc: listed }: Props) {
  const query = useGetTransferDocumentQuery(tradeReference, { skip: !settled || listed != null });

  if (!settled) return <span className="ui-sub">{EMPTY}</span>;
  if (!listed && query.isLoading) return <span className="ui-sub" aria-busy="true">Đang tải...</span>;
  if (!listed && query.error) {
    return toUiApiError(query.error).status === 404
      ? <span className="ui-sub">Chưa có văn bản</span>
      : <span className={DOC_ERROR} role="alert">{errorText(query.error)}</span>;
  }

  const doc = listed ?? query.data;
  if (!doc) return <span className="ui-sub">{EMPTY}</span>;
  if (doc.status === 'ISSUED') return <IssuedDocument doc={doc} />;
  if (doc.status === 'FAILED') return <FailedDocument doc={doc} />;
  if (doc.status === 'PENDING') {
    return (
      <>
        <StatusPill tone="neutral">Đang lập</StatusPill>
        {/* Đang lập lại sau lỗi tạm thời: ghi số lần thử và lỗi gần nhất để biết vì sao chưa xong. */}
        {doc.attempts > 0 && (
          <span className="ui-sub whitespace-normal">
            {doc.attempts} lần thử{doc.lastError ? `, ${documentErrorLabel(doc.lastError)}` : ''}
          </span>
        )}
      </>
    );
  }
  // Trạng thái backend bổ sung sau này: hiện nguyên văn thay vì đoán ý nghĩa.
  return <StatusPill tone="neutral">{String(doc.status)}</StatusPill>;
}
