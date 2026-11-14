import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { Pager } from '@/components/Pager';
import { RowMenu, type RowMenuItem } from '@/components/RowMenu';
import { SearchBox } from '@/components/SearchBox';
import { StatusPill } from '@/components/StatusPill';
import { usePermission } from '@/features/auth';
import { useActorNames } from '@/features/loan/hooks/useActorNames';
import { toast } from '@/lib/toast';
import { EMPTY, formatDate, formatDateTime } from '@/utils';
import { useRescheduleRequestsQuery } from '../api/servicingApi';
import { RESCHEDULE_STATUS, RESCHEDULE_TYPE_LABEL, SERVICING_PAGE_SIZE } from '../constant';
import { rescheduleChangeText } from '../mappers/rescheduleDisplay';
import type {
  RescheduleDecision,
  RescheduleRecoveryAction,
  RescheduleRequest,
  RescheduleStatus,
  RescheduleType,
} from '../types';
import { RescheduleDecisionModal } from '../components/RescheduleDecisionModal';
import { RescheduleRecoveryModal } from '../components/RescheduleRecoveryModal';

type TabKey = 'review' | 'investors' | 'applying' | 'attention' | 'history';

const TABS: ReadonlyArray<{ key: TabKey; label: string; statuses: RescheduleStatus[] }> = [
  { key: 'review', label: 'Chờ thẩm định', statuses: ['PENDING_REVIEW'] },
  { key: 'investors', label: 'Chờ nhà đầu tư', statuses: ['PENDING_INVESTOR_CONSENT'] },
  { key: 'applying', label: 'Đang áp dụng', statuses: ['CREATE_PENDING', 'CREATING', 'APPROVAL_PENDING', 'APPROVING'] },
  { key: 'attention', label: 'Cần xử lý', statuses: ['RECONCILIATION_REQUIRED', 'MANUAL_REVIEW'] },
  { key: 'history', label: 'Đã kết thúc', statuses: ['COMPLETED', 'INVESTOR_REJECTED', 'REJECTED', 'CANCELLED'] },
];

const isTab = (value: string | null): value is TabKey => TABS.some((tab) => tab.key === value);
const isType = (value: string | null): value is RescheduleType =>
  value === 'INSTALLMENT_ADJUSTMENT' || value === 'TERM_EXTENSION';

function readPage(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 1 ? parsed - 1 : 0;
}

/** Hàng đợi cơ cấu toàn hệ thống; card trong hồ sơ vay vẫn giữ để xử lý theo từng khoản vay. */
export default function RescheduleRequestsPage() {
  const [params, setParams] = useSearchParams();
  const { canAct } = usePermission();
  const requestedTab = params.get('tab');
  const tabKey: TabKey = isTab(requestedTab) ? requestedTab : 'review';
  const tab = TABS.find((item) => item.key === tabKey)!;
  const page = readPage(params.get('page'));
  const q = (params.get('q') ?? '').trim();
  const requestedType = params.get('type');
  const requestType = isType(requestedType) ? requestedType : undefined;
  const query = useRescheduleRequestsQuery({
    statuses: tab.statuses,
    requestType,
    q: q || undefined,
    page,
    size: SERVICING_PAGE_SIZE,
  });
  const rows = query.data?.data ?? [];
  const { displayName } = useActorNames(rows.map((item) => item.borrowerId));
  const [decision, setDecision] = useState<{ request: RescheduleRequest; action: RescheduleDecision } | null>(null);
  const [recovery, setRecovery] = useState<{ request: RescheduleRequest; action: RescheduleRecoveryAction } | null>(null);

  const writeParams = (updates: Record<string, string | null>, replace = false) => {
    const next = new URLSearchParams(params);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setParams(next, { replace });
  };

  const actionsOf = (item: RescheduleRequest): RowMenuItem[] => {
    const actions: RowMenuItem[] = [];
    if (item.applicationNumber) {
      actions.push({
        key: 'open',
        label: 'Mở hồ sơ vay',
        icon: 'file',
        to: `/loans/${encodeURIComponent(item.applicationNumber)}/review?tab=servicing`,
      });
    }
    if (!canAct('reschedule')) return actions;
    if (item.status === 'PENDING_REVIEW') {
      actions.push(
        { key: 'approve', label: 'Thẩm định đạt', icon: 'checkCircle', onSelect: () => setDecision({ request: item, action: 'approve' }) },
        { key: 'reject', label: 'Từ chối', icon: 'xCircle', danger: true, separatorBefore: true, onSelect: () => setDecision({ request: item, action: 'reject' }) },
      );
    }
    if (item.status === 'MANUAL_REVIEW') {
      actions.push(
        { key: 'retry', label: 'Chạy lại', icon: 'refresh', onSelect: () => setRecovery({ request: item, action: 'retry' }) },
        { key: 'cancel', label: 'Đóng và dùng lịch cũ', icon: 'xCircle', danger: true, separatorBefore: true, onSelect: () => setRecovery({ request: item, action: 'cancel' }) },
      );
    }
    return actions;
  };

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title">
          <h1>Cơ cấu khoản vay</h1>
          <p>Thẩm định đề nghị của người vay, theo dõi nhà đầu tư đồng ý và xử lý yêu cầu chưa áp dụng được vào lịch trả nợ.</p>
        </div>
        <button type="button" className="ui-btn ghost" onClick={() => query.refetch()} disabled={query.isFetching}>
          <Icon name="refresh" />
          {query.isFetching ? 'Đang tải...' : 'Làm mới'}
        </button>
      </header>

      <section className="ui-card p-3.5 max-[760px]:p-2.5" aria-label="Danh sách yêu cầu cơ cấu khoản vay">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div className="ui-tabs" role="tablist" aria-label="Giai đoạn xử lý cơ cấu">
            {TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={tabKey === item.key}
                onClick={() => writeParams({ tab: item.key === 'review' ? null : item.key, page: null })}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 max-[760px]:w-full">
            <select
              className="ui-select h-9 min-w-45 max-[760px]:min-w-0 max-[760px]:flex-1"
              aria-label="Lọc loại cơ cấu"
              value={requestType ?? ''}
              onChange={(event) => writeParams({ type: event.target.value || null, page: null })}
            >
              <option value="">Tất cả hình thức</option>
              <option value="INSTALLMENT_ADJUSTMENT">Dời ngày trả một kỳ</option>
              <option value="TERM_EXTENSION">Gia hạn thêm kỳ</option>
            </select>
            <SearchBox
              className="w-75 max-[760px]:flex-1"
              value={q}
              onSearch={(value) => writeParams({ q: value || null, page: null }, true)}
              label="Tìm yêu cầu cơ cấu"
              placeholder="Mã khoản vay, hồ sơ, hợp đồng"
            />
          </div>
        </div>

        {query.error ? (
          <ErrorNotice error={query.error} onRetry={query.refetch} />
        ) : query.isLoading ? (
          <div className="ui-empty" aria-busy="true">Đang tải yêu cầu cơ cấu...</div>
        ) : rows.length === 0 ? (
          <div className="ui-empty">Không có yêu cầu nào trong nhóm này.</div>
        ) : (
          <div className={query.isFetching ? 'ui-busy' : undefined}>
            <div className="ui-table-wrap">
              <table className="ui-table list min-w-240">
                <thead>
                  <tr>
                    <th>Hồ sơ / khoản vay</th>
                    <th>Người vay</th>
                    <th>Đề nghị</th>
                    <th>Đáo hạn dự kiến</th>
                    <th>Tình trạng</th>
                    <th>Cập nhật</th>
                    <th className="act"><span className="ui-sr-only">Thao tác</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => {
                    const status = RESCHEDULE_STATUS[item.status] ?? { label: item.status, tone: 'neutral' as const };
                    const actions = actionsOf(item);
                    return (
                      <tr key={item.requestId}>
                        <td>
                          {item.applicationNumber ? (
                            <Link className="ui-link font-semibold" to={`/loans/${encodeURIComponent(item.applicationNumber)}/review?tab=servicing`}>
                              {item.applicationNumber}
                            </Link>
                          ) : <span>{EMPTY}</span>}
                          <span className="ui-sub">Khoản vay {item.loanNumber}</span>
                        </td>
                        <td>
                          {displayName(item.borrowerId)}
                          {item.borrowerId && <span className="ui-sub">#{item.borrowerId}</span>}
                        </td>
                        <td>
                          {RESCHEDULE_TYPE_LABEL[item.requestType] ?? item.requestType}
                          <span className="ui-sub">{rescheduleChangeText(item)}</span>
                        </td>
                        <td>
                          {item.newMaturityDate ? formatDate(item.newMaturityDate) : EMPTY}
                          <span className="ui-sub">Hiện tại {formatDate(item.originalMaturityDate)}</span>
                        </td>
                        <td><StatusPill tone={status.tone}>{status.label}</StatusPill></td>
                        <td>{formatDateTime(item.updatedAt)}</td>
                        <td className="act">{actions.length > 0 && <RowMenu label={`Thao tác với ${item.loanNumber}`} items={actions} />}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pager
              page={page}
              size={SERVICING_PAGE_SIZE}
              total={query.data?.totalElements ?? 0}
              unit="yêu cầu"
              disabled={query.isFetching}
              onPage={(next) => writeParams({ page: next > 0 ? String(next + 1) : null })}
            />
          </div>
        )}
      </section>

      {decision && (
        <RescheduleDecisionModal
          request={decision.request}
          decision={decision.action}
          onClose={() => setDecision(null)}
          onDone={(message) => { setDecision(null); toast.success(message); }}
        />
      )}
      {recovery && (
        <RescheduleRecoveryModal
          request={recovery.request}
          action={recovery.action}
          onClose={() => setRecovery(null)}
          onDone={(message) => { setRecovery(null); toast.success(message); }}
        />
      )}
    </section>
  );
}
