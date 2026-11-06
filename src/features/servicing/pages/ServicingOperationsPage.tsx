import { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/app/store';
import { Icon } from '@/components/Icon';
import { toast } from '@/lib/toast';
import { usePermission } from '@/features/auth';
import { investmentApi } from '@/lib/api/investmentApi';
import { loanApi } from '@/lib/api/loanApi';
import { paymentApi } from '@/lib/api/paymentApi';
import { formatDateTime } from '@/utils';
import { CollectionCaseDrawer } from '../components/CollectionCaseDrawer';
import { CollectionPanel } from '../components/CollectionPanel';
import { IncidentsPanel } from '../components/IncidentsPanel';
import { OpenCasesCard } from '../components/OpenCasesCard';
import { OverdueByGroupCard } from '../components/OverdueByGroupCard';
import { QuarantinePanel } from '../components/QuarantinePanel';
import { ReconciliationPanel } from '../components/ReconciliationPanel';
import { ReschedulePanel } from '../components/ReschedulePanel';
import { SERVICING_TABS } from '../constant';
import { useServicingCounts } from '../hooks/useServicingCounts';
import { useServicingTab } from '../hooks/useServicingTab';
import type { CollectionCase } from '../types';

/** Lúc tải số liệu, cùng một kiểu ngày giờ với cả web ("08:30 06/10/2026", giờ Việt Nam). */
const updatedLabel = (timestamp: number) => formatDateTime(new Date(timestamp).toISOString());

/**
 * Vận hành khoản vay (WEB-LOAN-003): các hàng đợi thu hồi, cơ cấu, đối soát, sự kiện trả nợ chờ ghép và sự cố
 * giao dịch (R2, gồm hàng đợi của Payment Service).
 *
 * Trang chỉ điều phối: tab và trang trên URL, số đếm, ngăn hồ sơ thu hồi và thông báo. Mỗi hàng đợi tự
 * tải dữ liệu và xử lý thao tác của mình. "Dư nợ quá hạn theo nhóm nợ" chỉ có số hiện tại (summary thống kê
 * không lưu lịch sử 6 tháng như mockup); số hồ sơ chưa liên hệ và lỡ hẹn vẫn ẩn vì cần tải lịch sử từng hồ sơ.
 */
export default function ServicingOperationsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { canView } = usePermission();
  // Nhân viên chỉ thấy nhóm việc có quyền Xem (route đã chặn khi không xem được nhóm nào).
  const tabs = SERVICING_TABS.filter((item) => item.functions.some(canView));
  const { tab, page, stage, setTab, setPage, setStage } = useServicingTab(tabs.map((item) => item.key));
  const counts = useServicingCounts();
  const [openCase, setOpenCase] = useState<CollectionCase | null>(null);
  // Kết quả thao tác báo bằng toast dùng chung (`@/lib/toast`).
  const setToast = useCallback((message: string | null) => { if (message) toast.success(message); }, []);

  // Hàng đợi của Loan dùng chung một tag; sự cố tiền của Payment và lệnh góp vốn của Investment nằm ở slice riêng.
  const refresh = () => {
    dispatch(loanApi.util.invalidateTags(['ServicingOperations']));
    dispatch(paymentApi.util.invalidateTags(['PaymentIncidents']));
    dispatch(investmentApi.util.invalidateTags(['OrderIncidents']));
  };

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title"><h1>Vận hành khoản vay</h1></div>
        <div className="svc-head-actions flex items-center gap-3 max-[760px]:w-full max-[760px]:justify-between">
          {counts.updatedAt != null && (
            <span className="svc-asof text-[12px] text-muted tabular-nums">Cập nhật {updatedLabel(counts.updatedAt)}</span>
          )}
          <button type="button" className="ui-btn ghost" onClick={refresh} disabled={counts.isFetching}>
            <Icon name="refresh" />
            {counts.isFetching ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>
      </header>

      {/* Hai thẻ tổng quan đọc summary thống kê, cần quyền Xem "Tổng quan & thống kê". */}
      {canView('dashboard') && (
        <div className="svc-overview-row grid grid-cols-[minmax(0,1.75fr)_minmax(320px,1fr)] gap-4 max-[1100px]:grid-cols-[minmax(0,1fr)]">
          <OverdueByGroupCard
            summary={counts.summary.data}
            isLoading={counts.summary.isLoading}
            error={counts.summary.error}
            onRetry={counts.summary.refetch}
          />
          <OpenCasesCard
            stages={counts.stages}
            portfolio={counts.summary.data?.portfolio}
            openCases={counts.openCases}
            isLoading={counts.summary.isLoading}
            error={counts.summary.error}
            onRetry={counts.summary.refetch}
            onShowStage={canView('collection') ? setStage : undefined}
          />
        </div>
      )}

      <section className="ui-card svc-list px-3.5 pt-3.5 pb-3" aria-label="Việc vận hành">
        <div className="svc-list-head mb-3">
          <div className="ui-tabs" role="tablist" aria-label="Nhóm việc">
            {tabs.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                id={`svc-tab-${item.key}`}
                aria-controls="svc-panel"
                aria-selected={tab === item.key}
                onClick={() => setTab(item.key)}
              >
                {item.label}
                {counts.tabs[item.key] != null && <span className="n">{counts.tabs[item.key]}</span>}
              </button>
            ))}
          </div>
        </div>

        <div id="svc-panel" role="tabpanel" aria-labelledby={`svc-tab-${tab}`}>
          {tab === 'collection' && (
            <CollectionPanel
              page={page}
              onPage={setPage}
              stage={stage}
              stageCounts={counts.stages}
              onStage={setStage}
              openCaseId={openCase?.caseId ?? null}
              onOpenCase={setOpenCase}
            />
          )}
          {tab === 'reschedule' && <ReschedulePanel page={page} onPage={setPage} onDone={setToast} />}
          {tab === 'reconciliation' && <ReconciliationPanel page={page} onPage={setPage} onDone={setToast} />}
          {tab === 'quarantine' && <QuarantinePanel page={page} onPage={setPage} onDone={setToast} />}
          {tab === 'incidents' && (
            <IncidentsPanel page={page} onPage={setPage} onDone={setToast} nothingOpen={counts.tabs.incidents === 0} />
          )}
        </div>
      </section>

      {openCase && (
        <CollectionCaseDrawer key={openCase.caseId} item={openCase} onClose={() => setOpenCase(null)} onRecorded={setToast} />
      )}
    </section>
  );
}
