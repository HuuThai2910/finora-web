import { Drawer } from '@/components/Drawer';
import { ErrorNotice } from '@/components/ErrorNotice';
import { StatusPill } from '@/components/StatusPill';
import { usePermission } from '@/features/auth';
import { toUiApiError } from '@/lib/api/errors';
import { useGetProofQuery } from '../api/proofApi';
import type { ProofRetryFailure } from '../hooks/useProofRetry';
import { proofTypeLabel, statusInfo } from '../mappers/proofDisplay';
import { BC_DETAILS, BC_DETAILS_SUMMARY, BC_MUTED } from '../styles';
import type { Proof } from '../types';
import { ProofFacts } from './ProofFacts';
import { ProofSummary } from './ProofSummary';
import { TransferDocumentPanel } from './TransferDocumentPanel';
import { VerifyPanel } from './VerifyPanel';

interface Props {
  proofId: string;
  runningId: string | null;
  retryFailure: ProofRetryFailure | null;
  /** Bỏ trống khi không có quyền Thao tác "Bằng chứng blockchain": ngăn không hiện mục đưa lại hàng đợi. */
  onRetry?: (proof: Proof) => void;
  onClose: () => void;
}

/** Đưa proof dừng gửi về hàng đợi; chỉ hiện với DEAD_LETTER (W3D mục 7). */
function RetrySection({ proof, running, busy, onRetry }: {
  proof: Proof;
  running: boolean;
  busy: boolean;
  onRetry: (proof: Proof) => void;
}) {
  return (
    <section aria-labelledby="bc-retry-title">
      <h3 id="bc-retry-title">Đưa lại hàng đợi gửi</h3>
      <p className={BC_MUTED}>
        Bằng chứng đã hết lượt gửi tự động. Chỉ đưa lại sau khi đã xử lý nguyên nhân ở lỗi gần nhất (trong chi tiết kỹ
        thuật); số lần gửi được đếm lại từ đầu, lỗi cuối vẫn được giữ để đối chiếu.
      </p>
      <button type="button" className="ui-btn primary" disabled={busy} onClick={() => onRetry(proof)}>
        {running ? 'Đang đưa lại...' : 'Đưa lại hàng đợi gửi'}
      </button>
    </section>
  );
}

/**
 * Ngăn chi tiết một proof, mở theo `?proof=` trên URL nên tải lại đúng proof qua `GET /proofs/{proofId}`. Proof MOCK
 * có cảnh báo sổ cái giả lập ngay trong phần tóm tắt đầu ngăn; phần kiểm toàn vẹn và đưa lại hàng đợi nằm bên dưới.
 */
export function ProofDrawer({ proofId, runningId, onRetry, onClose }: Props) {
  const detail = useGetProofQuery(proofId);
  const proof = detail.data;
  const status = proof ? statusInfo(proof.status) : null;
  const notFound = toUiApiError(detail.error).status === 404;
  // Văn bản chuyển nhượng đọc API của Chợ thứ cấp; thiếu quyền Xem chức năng đó thì không hiện phần tải/xác minh tệp.
  const canViewDocument = usePermission().canView('secondary-market');

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
          ? <div className="ui-alert" role="alert">Không tìm thấy bằng chứng này.</div>
          : <ErrorNotice error={detail.error} onRetry={detail.refetch} />
      ) : !proof ? (
        <div className="ui-empty" aria-busy="true">Đang tải bằng chứng...</div>
      ) : (
        <>
          {/* Bằng chứng MOCK: phần tóm tắt đã nói rõ là sổ cái giả lập (một lần, bằng tiếng Việt). */}
          <ProofSummary proof={proof} />
          {/* Proof của giấy xác nhận chuyển nhượng neo hash tệp PDF: thêm tải tệp và xác minh chính tệp đó. */}
          {proof.proofType === 'NOTE_TRANSFER_DOCUMENT' && canViewDocument && (
            <section aria-labelledby="bc-document-title">
              <h3 id="bc-document-title">Văn bản</h3>
              <TransferDocumentPanel key={proof.proofId} proofId={proof.proofId} tradeReference={proof.aggregateId} />
            </section>
          )}
          <section aria-labelledby="bc-verify-title">
            <h3 id="bc-verify-title">Xác minh dữ liệu</h3>
            <VerifyPanel key={proof.proofId} proof={proof} />
          </section>
          <details className={`bc-technical ${BC_DETAILS}`}>
            <summary className={BC_DETAILS_SUMMARY}>Xem chi tiết kỹ thuật và nguồn dữ liệu</summary>
            <div className="bc-technical-body p-3"><ProofFacts proof={proof} /></div>
          </details>
          {proof.status === 'DEAD_LETTER' && onRetry && (
            <RetrySection
              proof={proof}
              running={runningId === proof.proofId}
              busy={runningId != null}
              onRetry={onRetry}
            />
          )}
        </>
      )}
    </Drawer>
  );
}
