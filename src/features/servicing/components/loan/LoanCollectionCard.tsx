import { ErrorNotice } from '@/components/ErrorNotice';
import { formatDate } from '@/utils';
import { useCollectionCasesQuery } from '../../api/servicingApi';
import { COLLECTION_CASE_STATUS_LABEL, LOAN_SCOPED_SIZE, stageInfo } from '../../constant';
import { CollectionCaseDetail } from '../CollectionCaseDetail';
import { NothingOpen, ServicingCard } from '../ServicingCard';

interface Props {
  loanNumber: string;
  onDone: (message: string) => void;
}

/**
 * Thu hồi nợ của khoản vay: hồ sơ đang mở hiện đầy đủ (mức quá hạn, ghi nhận, leo thang, lịch sử) ngay trong thẻ; các
 * đợt thu hồi đã đóng chỉ còn một dòng tóm tắt. Khoản vay chưa từng quá hạn thì một dòng "Không có".
 */
export function LoanCollectionCard({ loanNumber, onDone }: Props) {
  const query = useCollectionCasesQuery({ loanNumber, page: 0, size: LOAN_SCOPED_SIZE });
  const cases = query.data?.data ?? [];
  const open = cases.find((item) => item.status === 'OPEN') ?? null;
  const closed = cases.filter((item) => item.status !== 'OPEN');

  return (
    <ServicingCard title="Thu hồi nợ" aside={open ? `Quá hạn ${open.daysPastDue} ngày` : undefined}>
      {query.error ? (
        <ErrorNotice error={query.error} onRetry={query.refetch} />
      ) : query.isLoading ? (
        <p className="text-[13px] text-muted" aria-busy="true">Đang tải hồ sơ thu hồi...</p>
      ) : (
        <div className={query.isFetching ? 'ui-busy grid gap-3' : 'grid gap-3'}>
          {open ? (
            <CollectionCaseDetail key={open.caseId} item={open} onRecorded={onDone} />
          ) : (
            <NothingOpen text="Khoản vay không quá hạn, không có hồ sơ thu hồi đang mở." />
          )}
          {closed.length > 0 && (
            <div className="border-t border-t-divider pt-3">
              <h3 className="mb-1.5 text-[13px] font-semibold text-secondary">Các đợt thu hồi đã đóng</h3>
              <ul className="grid gap-1 text-[13px] text-secondary">
                {closed.map((item) => (
                  <li key={item.caseId} className="flex flex-wrap gap-x-2">
                    <span className="text-primary">{stageInfo(item.stage).label}</span>
                    <span className="tabular-nums">{formatDate(item.openedAt)} đến {formatDate(item.closedAt)}</span>
                    <span>{COLLECTION_CASE_STATUS_LABEL[item.status] ?? item.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </ServicingCard>
  );
}
