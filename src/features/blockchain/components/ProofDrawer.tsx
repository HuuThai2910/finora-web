import { Drawer } from '@/components/Drawer';
import { ErrorNotice } from '@/components/ErrorNotice';
import { StatusPill } from '@/components/StatusPill';
import { toUiApiError } from '@/lib/api/errors';
import { useGetProofQuery } from '../api/proofApi';
import { MOCK_LEDGER_NOTICE } from '../constants';
import type { ProofRetryFailure } from '../hooks/useProofRetry';
import { proofTypeLabel, statusInfo } from '../mappers/proofDisplay';
import type { Proof } from '../types';
import { ProofFacts } from './ProofFacts';
import { ProofSummary } from './ProofSummary';
import { TransferDocumentPanel } from './TransferDocumentPanel';
import { VerifyPanel } from './VerifyPanel';

interface Props {
  proofId: string;
  runningId: string | null;
  retryFailure: ProofRetryFailure | null;
  onRetry: (proof: Proof) => void;
  onClose: () => void;
}

/** Đưa proof dừng gửi về hàng đợi; chỉ hiện với DEAD_LETTER (W3D mục 7). */
function RetrySection({ proof, running, busy, failure, onRetry }: {
  proof: Proof;
  running: boolean;
  busy: boolean;
  failure: unknown;
  onRetry: (proof: Proof) => void;
}) {
  return (
    <section aria-labelledby="bc-retry-title">
      <h3 id="bc-retry-title">Đưa lại hàng đợi gửi</h3>
      <p className="bc-muted">
        Proof đã hết lượt gửi tự động (DEAD_LETTER). Chỉ đưa lại sau khi đã xử lý nguyên nhân ở lỗi gần nhất; số lần gửi
        được đếm lại từ đầu, lỗi cuối vẫn được giữ để đối chiếu.
      </p>
      {failure != null && <div className="bc-gap"><ErrorNotice error={failure} /></div>}
      <button type="button" className="ui-btn primary" disabled={busy} onClick={() => onRetry(proof)}>
        {running ? 'Đang đưa lại...' : 'Đưa lại hàng đợi gửi'}
      </button>
    </section>
  );
}

/**
 * Ngăn chi tiết một proof, mở theo `?proof=` trên URL nên tải lại đúng proof qua `GET /proofs/{proofId}`. Proof MOCK
 * luôn có cảnh báo demo ở đầu ngăn; phần kiểm toàn vẹn và đưa lại hàng đợi nằm ngay bên dưới thông tin.
 */
export function ProofDrawer({ proofId, runningId, retryFailure, onRetry, onClose }: Props) {
  const detail = useGetProofQuery(proofId);
  const proof = detail.data;
  const status = proof ? statusInfo(proof.status) : null;
  const notFound = toUiApiError(detail.error).status === 404;

  return (
    <Drawer
      title={(
        <>
          <h2>{proof ? proofTypeLabel(proof.proofType) : 'Kết quả xác minh'}</h2>
          {status && <StatusPill tone={status.tone}>{status.label}</StatusPill>}
        </>
      )}
      subtitle={proof ? `Bằng chứng cho ${proof.aggregateId}` : 'Đang tải thông tin bằng chứng'}
      onClose={onClose}
    >
      {detail.error ? (
        notFound
          ? <div className="ui-alert" role="alert">Không tìm thấy proof {proofId}.</div>
          : <ErrorNotice error={detail.error} onRetry={detail.refetch} />
      ) : !proof ? (
        <div className="ui-empty" aria-busy="true">Đang tải proof...</div>
      ) : (
        <>
          {proof.provider === 'MOCK' && (
            <p className="bc-callout warning" role="note">{proof.receipt?.notice ?? MOCK_LEDGER_NOTICE}</p>
          )}
          <ProofSummary proof={proof} />
          {/* Proof của giấy xác nhận chuyển nhượng neo hash tệp PDF: thêm tải tệp và xác minh chính tệp đó. */}
          {proof.proofType === 'NOTE_TRANSFER_DOCUMENT' && (
            <section aria-labelledby="bc-document-title">
              <h3 id="bc-document-title">Văn bản</h3>
              <TransferDocumentPanel key={proof.proofId} proofId={proof.proofId} tradeReference={proof.aggregateId} />
            </section>
          )}
          <section aria-labelledby="bc-verify-title">
            <h3 id="bc-verify-title">Xác minh dữ liệu</h3>
            <VerifyPanel key={proof.proofId} proofId={proof.proofId} />
          </section>
          <details className="bc-technical">
            <summary>Xem chi tiết kỹ thuật và nguồn dữ liệu</summary>
            <div className="bc-technical-body"><ProofFacts proof={proof} /></div>
          </details>
          {proof.status === 'DEAD_LETTER' && (
            <RetrySection
              proof={proof}
              running={runningId === proof.proofId}
              busy={runningId != null}
              failure={retryFailure?.proofId === proof.proofId ? retryFailure.error : null}
              onRetry={onRetry}
            />
          )}
        </>
      )}
    </Drawer>
  );
}
