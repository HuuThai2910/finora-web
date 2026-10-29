import { Link } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { StatusPill } from '@/components/StatusPill';
import { toUiApiError } from '@/lib/api/errors';
import { EMPTY } from '@/utils';
import { useGetTransferDocumentQuery, useRetryTransferDocumentMutation } from '../api/orderBookApi';
import { useTransferDocumentDownload } from '../hooks/useTransferDocumentDownload';
import type { AdminTrade, TransferDocumentDetail } from '../types';

/** Câu lỗi ngắn cho ô bảng: thông báo của backend kèm mã lỗi để đối chiếu nhật ký. */
function errorText(error: unknown): string {
  const ui = toUiApiError(error);
  return `${ui.message} (${ui.code})`;
}

/** Văn bản đã phát hành: tải PDF đã ký và mở bằng chứng blockchain neo hash của văn bản. */
function IssuedDocument({ doc }: { doc: TransferDocumentDetail }) {
  const { download, downloading, error } = useTransferDocumentDownload();
  const proofLink = `/blockchain/proofs?referenceType=NOTE_TRANSFER_DOCUMENT&referenceId=${encodeURIComponent(doc.tradeReference)}`;

  return (
    <>
      <span className="sm-doc-actions">
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
        <Link className="ui-link" to={proofLink}>Bằng chứng</Link>
      </span>
      <span className="ui-sub ui-mono">{doc.documentNumber}</span>
      {error != null && <span className="sm-err" role="alert">{errorText(error)}</span>}
    </>
  );
}

/** Lập văn bản lỗi: hiện lỗi gần nhất và cho lập lại (chỉ FAILED, backend cũng chặn trạng thái khác). */
function FailedDocument({ doc }: { doc: TransferDocumentDetail }) {
  const [retry, state] = useRetryTransferDocumentMutation();

  return (
    <>
      <span className="sm-doc-actions">
        <StatusPill tone="danger">Lỗi</StatusPill>
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
      </span>
      <span className="sm-err">
        {`${doc.attempts} lần thử${doc.lastError ? `, ${doc.lastError}` : ''}`}
      </span>
      {state.error != null && !state.isLoading && <span className="sm-err" role="alert">{errorText(state.error)}</span>}
    </>
  );
}

/**
 * Ô "Giấy xác nhận" của một lần khớp. Chỉ lần khớp đã thanh toán mới có văn bản, nên chỉ những dòng đó gọi
 * `GET /transfer-documents/{tradeReference}` (tối đa một trang bảng, mỗi dòng một request có cache riêng).
 * 404 là chưa có văn bản; lỗi khác hiện mã lỗi ngay trong ô để không làm hỏng cả bảng.
 */
export function TransferDocumentCell({ trade }: { trade: AdminTrade }) {
  const settled = trade.settlementStatus === 'SETTLED';
  const query = useGetTransferDocumentQuery(trade.tradeReference, { skip: !settled });

  if (!settled) return <span className="ui-sub">{EMPTY}</span>;
  if (query.isLoading) return <span className="ui-sub" aria-busy="true">Đang tải...</span>;
  if (query.error) {
    return toUiApiError(query.error).status === 404
      ? <span className="ui-sub">Chưa có văn bản</span>
      : <span className="sm-err" role="alert">{errorText(query.error)}</span>;
  }

  const doc = query.data;
  if (!doc) return <span className="ui-sub">{EMPTY}</span>;
  if (doc.status === 'ISSUED') return <IssuedDocument doc={doc} />;
  if (doc.status === 'FAILED') return <FailedDocument doc={doc} />;
  if (doc.status === 'PENDING') {
    return (
      <>
        <StatusPill tone="neutral">Đang lập</StatusPill>
        {doc.attempts > 0 && <span className="ui-sub">{doc.attempts} lần thử</span>}
      </>
    );
  }
  // Trạng thái backend bổ sung sau này: hiện nguyên văn thay vì đoán ý nghĩa.
  return <StatusPill tone="neutral">{String(doc.status)}</StatusPill>;
}
