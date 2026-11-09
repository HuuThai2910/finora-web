import { useCallback } from 'react';
import { usePermission, type OpsFunctionCode } from '@/features/auth';
import { toast } from '@/lib/toast';
import { NothingOpen, ServicingCard } from '../ServicingCard';
import { LoanCollectionCard } from './LoanCollectionCard';
import { LoanReconciliationCard } from './LoanReconciliationCard';
import { LoanRescheduleCard } from './LoanRescheduleCard';
import { LoanTransactionIncidentsCard } from './LoanTransactionIncidentsCard';

/** Chức năng có việc trong tab "Sau giải ngân"; nhân viên Xem được một trong số đó mới thấy tab. */
export const LOAN_SERVICING_FUNCTIONS: OpsFunctionCode[] = ['collection', 'reschedule', 'reconciliation'];

interface Props {
  /** ID số của hồ sơ vay (sự cố giải ngân, trả nợ lọc theo ID này). */
  applicationId: number;
  /** Mã khoản vay `LN-…`; `null` khi tiền đã đi nhưng khoản vay chưa được kích hoạt (đang giải ngân). */
  loanNumber: string | null;
}

/**
 * Tab "Sau giải ngân" của trang hồ sơ vay: việc vận hành của đúng khoản vay thuộc hồ sơ, mỗi nhóm một thẻ.
 *
 * - Thu hồi nợ (quyền Xem "Thu hồi nợ"), Yêu cầu cơ cấu ("Cơ cấu nợ") và Đối soát ("Đối soát & sự cố") chỉ có khi
 *   khoản vay đã kích hoạt.
 * - Sự cố giải ngân và trả nợ ("Đối soát & sự cố") có cả lúc đang giải ngân.
 * Nút thao tác trong từng thẻ theo quyền Thao tác của chức năng đó, như hàng đợi cũ của trang Vận hành khoản vay.
 */
export function LoanServicingTab({ applicationId, loanNumber }: Props) {
  const { canView } = usePermission();
  // Kết quả thao tác báo bằng toast dùng chung; hộp "ghi lại" của Payment có thể đã tự báo cảnh báo và gửi chuỗi rỗng.
  const onDone = useCallback((message: string) => { if (message) toast.success(message); }, []);

  return (
    <div className="svc-loan-tab grid gap-4 min-w-0">
      {loanNumber == null && (
        <ServicingCard title="Khoản vay">
          <NothingOpen text="Khoản vay đang giải ngân, chưa được kích hoạt nên chưa có thu hồi, cơ cấu hay đối soát." />
        </ServicingCard>
      )}
      {loanNumber && canView('collection') && <LoanCollectionCard loanNumber={loanNumber} onDone={onDone} />}
      {loanNumber && canView('reschedule') && <LoanRescheduleCard loanNumber={loanNumber} onDone={onDone} />}
      {loanNumber && canView('reconciliation') && <LoanReconciliationCard loanNumber={loanNumber} onDone={onDone} />}
      {canView('reconciliation') && <LoanTransactionIncidentsCard applicationId={applicationId} onDone={onDone} />}
    </div>
  );
}
