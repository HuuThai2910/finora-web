import { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/app/store';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { Pager } from '@/components/Pager';
import { Toast } from '@/components/Toast';
import { blockchainApi } from '@/lib/api/blockchainApi';
import { useSearchProofsQuery } from '../api/proofApi';
import { ProofDrawer } from '../components/ProofDrawer';
import { ProofSearchForm } from '../components/ProofSearchForm';
import { ProofStatusTabs } from '../components/ProofStatusTabs';
import { ProofTable } from '../components/ProofTable';
import { PROOF_LEGAL_NOTE, PROOF_PAGE_SIZE } from '../constants';
import { useProofFilters, type ProofFilters } from '../hooks/useProofFilters';
import { useProofRetry } from '../hooks/useProofRetry';
import { referenceNoun, statusInfo } from '../mappers/proofDisplay';
import './BlockchainProofsPage.css';

/** Câu báo khi danh sách rỗng, theo đúng bộ lọc đang áp dụng. */
function emptyText(filters: ProofFilters): string {
  if (filters.reference) {
    return `Chưa có proof nào cho ${referenceNoun(filters.reference.type)} ${filters.reference.id}. `
      + 'Proof chỉ được tạo sau khi mốc nghiệp vụ hoàn tất (hợp đồng đủ chữ ký, giải ngân, trả nợ, Note).';
  }
  if (filters.status) return `Không có proof nào ở trạng thái "${statusInfo(filters.status).label}".`;
  return 'Chưa có proof nào.';
}

/**
 * Bằng chứng blockchain (WEB-BLOCKCHAIN-001, R6/W3D): explorer proof cho quản trị viên. Tra theo tham chiếu nghiệp vụ
 * hoặc lọc trạng thái gửi, mở ngăn chi tiết để kiểm toàn vẹn, đưa proof dừng gửi về hàng đợi.
 *
 * Trang chỉ điều phối: bộ lọc và proof đang mở nằm trên URL (`useProofFilters`), mỗi phần tự tải dữ liệu của mình,
 * thao tác đưa lại hàng đợi dùng chung cho bảng và ngăn chi tiết (`useProofRetry`). Biên nhận MOCK luôn có nhãn cảnh
 * báo demo, không trình bày như bằng chứng trên Hyperledger Fabric.
 */
export default function BlockchainProofsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { filters, search, clearSearch, setStatus, setPage, openProof, closeProof } = useProofFilters();
  const [toast, setToast] = useState('');
  // Tham chiếu ổn định: Toast đặt lại giờ ẩn mỗi khi `onDismiss` đổi.
  const dismissToast = useCallback(() => setToast(''), []);
  const { retry, runningId, failure } = useProofRetry(setToast);

  const list = useSearchProofsQuery({
    referenceType: filters.reference?.type,
    referenceId: filters.reference?.id,
    status: filters.status ?? undefined,
    page: filters.page,
    size: PROOF_PAGE_SIZE,
  });
  // Số proof dừng gửi luôn hiện trên tab để vận hành thấy việc cần xử lý, kể cả khi đang xem tab khác.
  const deadLetters = useSearchProofsQuery({ status: 'DEAD_LETTER', page: 0, size: 1 });
  const proofs = list.data?.content ?? [];

  // Làm mới bảng, số đếm và proof đang mở trong một lần: mọi query của explorer cùng tag `BlockchainProofs`.
  const refresh = () => dispatch(blockchainApi.util.invalidateTags(['BlockchainProofs']));

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title">
          <h1>Bằng chứng blockchain</h1>
          <p>Dấu vân tay SHA-256 của bốn mốc: hợp đồng đủ chữ ký, giải ngân, trả nợ, phát hành và chuyển nhượng Note.</p>
        </div>
        <button type="button" className="ui-btn ghost" onClick={refresh} disabled={list.isFetching}>
          <Icon name="refresh" />
          {list.isFetching ? 'Đang tải...' : 'Làm mới'}
        </button>
      </header>

      <p className="bc-note" role="note">{PROOF_LEGAL_NOTE}</p>

      <section className="ui-card bc-list" aria-label="Danh sách bằng chứng">
        <div className="bc-list-bar">
          <ProofStatusTabs
            active={filters.reference ? undefined : filters.status}
            deadLetterCount={deadLetters.data?.totalElements}
            onSelect={setStatus}
          />
          <ProofSearchForm
            key={filters.reference ? `${filters.reference.type}:${filters.reference.id}` : 'none'}
            applied={filters.reference}
            onSearch={search}
            onClear={clearSearch}
          />
        </div>

        {filters.reference && (
          <p className="bc-scope">
            Đang tra theo {referenceNoun(filters.reference.type)}{' '}
            <span className="ui-mono">{filters.reference.id}</span>: gồm mọi trạng thái, cũ nhất trước. Chọn một trạng
            thái ở trên sẽ bỏ tra cứu.
          </p>
        )}
        {/* Lỗi đưa lại hàng đợi của proof đang mở đã hiện trong ngăn chi tiết; ở đây chỉ hiện lỗi bấm từ menu dòng. */}
        {failure && failure.proofId !== filters.proofId && (
          <div className="bc-gap"><ErrorNotice error={failure.error} /></div>
        )}

        {list.error ? (
          <ErrorNotice error={list.error} onRetry={list.refetch} />
        ) : list.isLoading ? (
          <div className="ui-empty" aria-busy="true">Đang tải bằng chứng...</div>
        ) : proofs.length === 0 ? (
          <div className="ui-empty">{emptyText(filters)}</div>
        ) : (
          <div className={list.isFetching ? 'ui-busy' : undefined}>
            <ProofTable
              proofs={proofs}
              openProofId={filters.proofId}
              runningId={runningId}
              onOpen={(proof) => openProof(proof.proofId)}
              onRetry={(proof) => void retry(proof)}
            />
            <Pager
              page={filters.page}
              size={PROOF_PAGE_SIZE}
              total={list.data?.totalElements ?? 0}
              unit="proof"
              disabled={list.isFetching}
              onPage={setPage}
            />
          </div>
        )}
      </section>

      {filters.proofId && (
        <ProofDrawer
          key={filters.proofId}
          proofId={filters.proofId}
          runningId={runningId}
          retryFailure={failure}
          onRetry={(proof) => void retry(proof)}
          onClose={closeProof}
        />
      )}
      {toast && <Toast message={toast} onDismiss={dismissToast} />}
    </section>
  );
}
