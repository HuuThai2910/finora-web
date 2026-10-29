import { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/app/store';
import { Icon } from '@/components/Icon';
import { Toast } from '@/components/Toast';
import { usePermission } from '@/features/auth';
import { investmentApi } from '@/lib/api/investmentApi';
import { loanApi } from '@/lib/api/loanApi';
import { paymentApi } from '@/lib/api/paymentApi';
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
import './ServicingOperationsPage.css';

const UPDATED_AT = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
});

/** "08:30, 06/10/2026" theo giờ máy người xem. */
function updatedLabel(timestamp: number): string {
  const parts = Object.fromEntries(UPDATED_AT.formatToParts(new Date(timestamp)).map((part) => [part.type, part.value]));
  return `${parts.hour}:${parts.minute}, ${parts.day}/${parts.month}/${parts.year}`;
}

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
  const { tab, page, setTab, setPage } = useServicingTab(tabs.map((item) => item.key));
  const counts = useServicingCounts();
  const [openCase, setOpenCase] = useState<CollectionCase | null>(null);
  const [toast, setToast] = useState('');
  const dismissToast = useCallback(() => setToast(''), []);

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
        <div className="svc-head-actions">
          {counts.updatedAt != null && <span className="svc-asof">Cập nhật {updatedLabel(counts.updatedAt)}</span>}
          <button type="button" className="ui-btn ghost" onClick={refresh} disabled={counts.isFetching}>
            <Icon name="refresh" />
            {counts.isFetching ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>
      </header>

      {/* Hai thẻ tổng quan đọc summary thống kê, cần quyền Xem "Tổng quan & thống kê". */}
      {canView('dashboard') && (
        <div className="svc-overview-row">
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
            onShowCollection={canView('collection') ? () => setTab('collection') : undefined}
          />
        </div>
      )}

      <section className="ui-card svc-list" aria-label="Việc vận hành">
        <div className="svc-list-head">
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
            <CollectionPanel page={page} onPage={setPage} openCaseId={openCase?.caseId ?? null} onOpenCase={setOpenCase} />
          )}
          {tab === 'reschedule' && <ReschedulePanel page={page} onPage={setPage} onDone={setToast} />}
          {tab === 'reconciliation' && <ReconciliationPanel page={page} onPage={setPage} onDone={setToast} />}
          {tab === 'quarantine' && <QuarantinePanel page={page} onPage={setPage} onDone={setToast} />}
          {tab === 'incidents' && <IncidentsPanel page={page} onPage={setPage} onDone={setToast} />}
        </div>
      </section>

      {openCase && (
        <CollectionCaseDrawer item={openCase} onClose={() => setOpenCase(null)} onRecorded={setToast} />
      )}
      {toast && <Toast message={toast} onDismiss={dismissToast} />}
    </section>
  );
}
