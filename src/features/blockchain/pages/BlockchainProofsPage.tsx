import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/app/store';
import { ErrorNotice } from '@/components/ErrorNotice';
import {
  DateRangeField,
  FilterBar,
  SelectField,
  rangeChipLabel,
  rangeError,
  shortDate,
  useUrlFilters,
  type FilterChip,
} from '@/components/filters';
import { Icon } from '@/components/Icon';
import { Pager } from '@/components/Pager';
import { toast } from '@/lib/toast';
import { usePermission } from '@/features/auth';
import { blockchainApi } from '@/lib/api/blockchainApi';
import { useSearchProofsQuery } from '../api/proofApi';
import { ProofDrawer } from '../components/ProofDrawer';
import { ProofTable } from '../components/ProofTable';
import { PROOF_PAGE_SIZE, PROOF_TYPE_LABEL, PROVIDER_LABEL, REFERENCE_TYPES, STATUS_INFO } from '../constants';
import { useLoanReferenceResolver } from '../hooks/useLoanReferenceResolver';
import { isReferenceType, useProofFilters, type ProofFilters } from '../hooks/useProofFilters';
import { useProofRetry } from '../hooks/useProofRetry';
import { referenceNoun } from '../mappers/proofDisplay';
import { validateReference } from '../schemas/proofInputs';
import type { Proof, ProofProvider, ProofReferenceType, ProofStatus, ProofType } from '../types';

/**
 * Tham số của bảng lọc trên URL (trạng thái giữ tên `status` để link Tổng quan `?status=DEAD_LETTER` mở đúng);
 * `referenceType` là loại tham chiếu mà ô tìm tra theo.
 */
const FILTER_KEYS = ['referenceType', 'status', 'proofType', 'provider', 'createdFrom', 'createdTo'] as const;

const STATUSES = Object.keys(STATUS_INFO) as ProofStatus[];
const PROOF_TYPES = Object.keys(PROOF_TYPE_LABEL) as ProofType[];
const PROVIDERS = Object.keys(PROVIDER_LABEL) as ProofProvider[];
const PROVIDER_SHORT: Record<ProofProvider, string> = { MOCK: 'Bản demo (MOCK)', HYPERLEDGER_FABRIC: 'Hyperledger Fabric' };

/** Câu báo khi danh sách rỗng, theo đúng bộ lọc đang áp dụng. */
function emptyText(filters: ProofFilters, filtered: boolean): string {
  if (filters.reference && !filtered) {
    return `Chưa có bằng chứng nào cho ${referenceNoun(filters.reference.type)} ${filters.reference.id}. `
      + 'Bằng chứng chỉ được tạo sau khi mốc nghiệp vụ hoàn tất (hợp đồng đủ chữ ký, giải ngân, trả nợ, phần vốn, giấy xác nhận chuyển nhượng).';
  }
  return filtered || filters.reference ? 'Không có bằng chứng nào khớp bộ lọc.' : 'Chưa có bằng chứng nào.';
}

/**
 * Kiểm toán (WEB-BLOCKCHAIN-001, R6/W3D): explorer bằng chứng cho quản trị viên. Ô tìm tra theo tham chiếu nghiệp vụ
 * (mã hồ sơ HS-/LA-, hợp đồng HĐ-/LC-, mã giao dịch…), bảng lọc theo trạng thái ghi sổ, loại bằng chứng, sổ cái và
 * thời gian; mở ngăn chi tiết để kiểm toàn vẹn, đưa proof dừng gửi về hàng đợi.
 *
 * Bộ lọc và proof đang mở nằm trên URL (`useProofFilters`), thao tác đưa lại hàng đợi dùng chung cho bảng và ngăn chi
 * tiết (`useProofRetry`). Biên nhận MOCK luôn có nhãn cảnh báo demo, không trình bày như bằng chứng trên Fabric.
 */
export default function BlockchainProofsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { filters, search, clearSearch, setPage, openProof, closeProof } = useProofFilters();
  const url = useUrlFilters(FILTER_KEYS);
  const { applied, draft } = url;
  const { resolve, resolving } = useLoanReferenceResolver();
  // Kết quả thao tác báo bằng toast dùng chung (`@/lib/toast`).
  const setToast = useCallback((message: string | null) => { if (message) toast.success(message); }, []);
  const { retry, runningId, failure } = useProofRetry(setToast);
  // Đưa proof dừng gửi về hàng đợi cần quyền Thao tác "Bằng chứng blockchain"; chỉ có quyền Xem thì chỉ tra cứu.
  const onRetry = usePermission().canAct('blockchain') ? (proof: Proof) => void retry(proof) : undefined;
  const searchType: ProofReferenceType = filters.reference?.type
    ?? (isReferenceType(applied.referenceType) ? applied.referenceType : 'LOAN_APPLICATION');
  const searchTypeInfo = REFERENCE_TYPES.find((item) => item.value === searchType);

  const list = useSearchProofsQuery({
    referenceType: filters.reference?.type,
    referenceId: filters.reference?.id,
    status: filters.status ?? undefined,
    proofType: filters.proofType ?? undefined,
    provider: filters.provider ?? undefined,
    createdFrom: filters.createdFrom || undefined,
    createdTo: filters.createdTo || undefined,
    page: filters.page,
    size: PROOF_PAGE_SIZE,
  });
  // Số proof dừng gửi hiện trong ô chọn trạng thái để vận hành thấy việc cần xử lý.
  const deadLetters = useSearchProofsQuery({ status: 'DEAD_LETTER', page: 0, size: 1 });
  const proofs = list.data?.content ?? [];

  // Ô tìm: kiểm dạng mã, đổi mã hiển thị HS-/HĐ- sang tham chiếu tra được rồi mới ghi lên URL.
  const onSearch = async (raw: string) => {
    if (!raw) {
      clearSearch();
      return;
    }
    const problem = validateReference(searchType, raw);
    if (problem) {
      toast.warning(problem);
      return;
    }
    const result = await resolve({ type: searchType, id: raw });
    if (result.ok) search(result.reference);
    else toast.warning(result.message);
  };

  const createdError = rangeError(draft.createdFrom, draft.createdTo, false);
  const chips: FilterChip[] = [];
  if (filters.reference) {
    chips.push({
      key: 'reference',
      label: `${REFERENCE_TYPES.find((item) => item.value === filters.reference?.type)?.label ?? 'Tham chiếu'}: ${filters.reference.id}`,
      onRemove: clearSearch,
    });
  }
  if (filters.status) chips.push({ key: 'status', label: `Trạng thái: ${STATUS_INFO[filters.status].label}`, onRemove: () => url.remove('status') });
  if (filters.proofType) chips.push({ key: 'type', label: `Loại: ${PROOF_TYPE_LABEL[filters.proofType]}`, onRemove: () => url.remove('proofType') });
  if (filters.provider) chips.push({ key: 'provider', label: `Sổ cái: ${PROVIDER_SHORT[filters.provider]}`, onRemove: () => url.remove('provider') });
  if (filters.createdFrom || filters.createdTo) {
    chips.push({
      key: 'created',
      label: rangeChipLabel('Thời gian', filters.createdFrom, filters.createdTo, shortDate),
      onRemove: () => url.remove('createdFrom', 'createdTo'),
    });
  }
  const filtered = Boolean(filters.status || filters.proofType || filters.provider || filters.createdFrom || filters.createdTo);

  // Làm mới bảng, số đếm và proof đang mở trong một lần: mọi query của explorer cùng tag `BlockchainProofs`.
  const refresh = () => dispatch(blockchainApi.util.invalidateTags(['BlockchainProofs']));

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title">
          <h1>Kiểm toán</h1>
          <p>Kiểm tra dữ liệu hợp đồng, giải ngân, trả nợ và khoản đầu tư có còn nguyên vẹn hay không.</p>
        </div>
        <button type="button" className="ui-btn ghost" onClick={refresh} disabled={list.isFetching}>
          <Icon name="refresh" />
          {list.isFetching ? 'Đang tải...' : 'Làm mới'}
        </button>
      </header>

      <section className="ui-card bc-list px-3.5 pt-3.5 pb-3" aria-label="Danh sách bằng chứng">
        <FilterBar
          className="mb-3"
          search={{
            value: filters.reference?.id ?? '',
            onSearch: (next) => void onSearch(next),
            label: `Tra bằng chứng theo ${searchTypeInfo?.noun ?? 'tham chiếu'}`,
            placeholder: resolving ? 'Đang tìm hồ sơ...' : `${searchTypeInfo?.label ?? 'Tra cứu'}: ${searchTypeInfo?.placeholder ?? ''}`,
          }}
          activeCount={chips.length}
          chips={chips}
          onOpen={url.resetDraft}
          onApply={() => {
            if (createdError) return false;
            url.applyDraft();
            return true;
          }}
          onClearAll={() => {
            url.clearAll();
            clearSearch();
          }}
          total={list.data?.totalElements}
          unit="bằng chứng"
          title="Lọc bằng chứng"
        >
          <SelectField
            label="Ô tìm tra theo"
            value={isReferenceType(draft.referenceType) && draft.referenceType !== 'LOAN_APPLICATION' ? draft.referenceType : ''}
            allLabel="Hồ sơ vay (mặc định)"
            options={REFERENCE_TYPES.filter((item) => item.value !== 'LOAN_APPLICATION')
              .map((item) => ({ value: item.value, label: item.label }))}
            onChange={(value) => url.setDraft({ referenceType: value })}
          />
          <SelectField
            label="Trạng thái ghi sổ"
            value={draft.status}
            allLabel="Tất cả trạng thái"
            options={STATUSES.map((value) => ({
              value,
              label: STATUS_INFO[value].label,
              count: value === 'DEAD_LETTER' ? deadLetters.data?.totalElements : undefined,
            }))}
            onChange={(value) => url.setDraft({ status: value })}
          />
          <SelectField
            label="Loại bằng chứng"
            value={draft.proofType}
            allLabel="Tất cả loại"
            options={PROOF_TYPES.map((value) => ({ value, label: PROOF_TYPE_LABEL[value] }))}
            onChange={(value) => url.setDraft({ proofType: value })}
          />
          <SelectField
            label="Sổ cái"
            value={draft.provider}
            allLabel="Tất cả"
            options={PROVIDERS.map((value) => ({ value, label: PROVIDER_SHORT[value] }))}
            onChange={(value) => url.setDraft({ provider: value })}
          />
          <DateRangeField
            label="Thời gian ghi nhận"
            from={draft.createdFrom}
            to={draft.createdTo}
            error={createdError}
            onChange={(from, to) => url.setDraft({ createdFrom: from, createdTo: to })}
          />
        </FilterBar>

        {list.error ? (
          <ErrorNotice error={list.error} onRetry={list.refetch} />
        ) : list.isLoading ? (
          <div className="ui-empty" aria-busy="true">Đang tải bằng chứng...</div>
        ) : proofs.length === 0 ? (
          <div className="ui-empty">{emptyText(filters, filtered)}</div>
        ) : (
          <div className={list.isFetching ? 'ui-busy' : undefined}>
            <ProofTable
              proofs={proofs}
              openProofId={filters.proofId}
              runningId={runningId}
              onOpen={(proof) => openProof(proof.proofId)}
              onRetry={onRetry}
            />
            <Pager
              page={filters.page}
              size={PROOF_PAGE_SIZE}
              total={list.data?.totalElements ?? 0}
              unit="bằng chứng"
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
          onRetry={onRetry}
          onClose={closeProof}
        />
      )}
    </section>
  );
}
