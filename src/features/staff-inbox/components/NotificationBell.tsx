import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import { Icon } from '@/components/Icon';
import { usePermission, type OpsFunctionCode } from '@/features/auth';
import { toast } from '@/lib/toast';
import { formatDateTime } from '@/utils';
import {
  useGetBellInvestmentSummaryQuery,
  useGetBellLoanSummaryQuery,
  useGetBellNotificationsQuery,
  useGetBellUnreadCountQuery,
  useGetBellUserStatsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '../api/staffInboxApi';

/** Tự làm mới chuông 2 phút một lần; lượt này chạy nền (không hiện thanh tải, nhật ký mặc định ẩn). */
const REFRESH_MS = 120_000;
const SEEN_KEY = 'finora.bell.seen.';

interface WorkItem {
  key: string;
  fn: OpsFunctionCode;
  title: string;
  to: string;
  count: number | undefined;
}

/** Số đã xem lần trước theo tài khoản (trình duyệt này); hỏng hoặc bị chặn lưu trữ thì coi như chưa xem gì. */
function readSeen(userKey: string): Record<string, number> {
  try {
    return JSON.parse(window.localStorage.getItem(SEEN_KEY + userKey) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

function writeSeen(userKey: string, value: Record<string, number>) {
  try {
    window.localStorage.setItem(SEEN_KEY + userKey, JSON.stringify(value));
  } catch {
    // Chế độ riêng tư chặn lưu trữ: chỉ mất phần "đã xem", chuông vẫn chạy.
  }
}

/**
 * Chuông trên header cho nhân viên:
 * - "Việc cần xử lý": số hồ sơ chờ thẩm định, khoản chờ duyệt lên sàn, xác minh chờ duyệt tay… theo quyền Xem. Việc
 *   "mới" là phần tăng thêm so với lần bấm "Đánh dấu đã xem" (lưu theo tài khoản trên trình duyệt này).
 * - "Thông báo": hộp thư của tài khoản ở finora-notification, có đánh dấu đã đọc.
 */
export function NotificationBell() {
  const { canView } = usePermission();
  const userKey = String(useSelector((state: RootState) => state.auth.profile?.id ?? 'anon'));
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<Record<string, number>>(() => readSeen(userKey));
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  const canStats = canView('dashboard');
  const poll = { pollingInterval: REFRESH_MS, skipPollingIfUnfocused: true } as const;
  const loan = useGetBellLoanSummaryQuery(undefined, { ...poll, skip: !canStats });
  const investment = useGetBellInvestmentSummaryQuery(undefined, { ...poll, skip: !canStats });
  const users = useGetBellUserStatsQuery(undefined, { ...poll, skip: !canView('customer') });
  const notifications = useGetBellNotificationsQuery(undefined, { ...poll, skip: !open });
  const unread = useGetBellUnreadCountQuery(undefined, poll);
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, markAllState] = useMarkAllNotificationsReadMutation();

  useEffect(() => setSeen(readSeen(userKey)), [userKey]);

  const work: WorkItem[] = useMemo(() => {
    const byStatus = loan.data?.applications.byStatus;
    return ([
      { key: 'review', fn: 'loan-application', title: 'Hồ sơ chờ thẩm định', to: '/loans?status=PENDING_REVIEW', count: byStatus ? byStatus.PENDING_REVIEW ?? 0 : undefined },
      { key: 'retry', fn: 'loan-application', title: 'Hồ sơ chờ chấm lại điểm', to: '/loans?status=SCORING_RETRY_PENDING', count: byStatus ? byStatus.SCORING_RETRY_PENDING ?? 0 : undefined },
      { key: 'draft', fn: 'funding', title: 'Khoản vay chờ duyệt lên sàn', to: '/investments/funding?tab=DRAFT', count: investment.data ? investment.data.listings.byStatus.DRAFT ?? 0 : undefined },
      { key: 'reschedule', fn: 'reschedule', title: 'Yêu cầu cơ cấu chờ duyệt', to: '/loans?servicing=RESCHEDULE_PENDING', count: loan.data ? loan.data.reschedules.byStatus.PENDING_REVIEW ?? 0 : undefined },
      { key: 'ekyc', fn: 'customer', title: 'Xác minh danh tính chờ duyệt tay', to: '/customers/kyc?ekyc=MANUAL_REVIEW', count: users.data ? users.data.byEkycStatus.MANUAL_REVIEW ?? 0 : undefined },
    ] satisfies WorkItem[]).filter((item) => canView(item.fn) && item.count !== undefined);
  }, [loan.data, investment.data, users.data, canView]);

  const fresh = (item: WorkItem) => Math.max(0, (item.count ?? 0) - (seen[item.key] ?? 0));
  const newWork = work.reduce((sum, item) => sum + fresh(item), 0);
  const unreadCount = unread.data?.count ?? 0;
  const badge = newWork + unreadCount;

  // Đóng khi bấm ra ngoài hoặc nhấn Esc.
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const markAllSeen = async () => {
    const next = Object.fromEntries(work.map((item) => [item.key, item.count ?? 0]));
    setSeen(next);
    writeSeen(userKey, next);
    if (unreadCount > 0) {
      const result = await markAllRead();
      if ('error' in result) {
        toast.error(result.error);
        return;
      }
    }
    toast.success('Đã đánh dấu đã xem mọi thông báo.');
  };

  return (
    <div ref={rootRef} className="header-bell relative">
      <button
        type="button"
        className="header-bell-btn relative grid size-9 cursor-pointer place-items-center rounded-[10px] border-0 bg-transparent text-secondary hover:bg-[rgba(255,255,255,0.7)] aria-expanded:bg-[rgba(255,255,255,0.7)] [&_svg]:size-4.5"
        aria-label={badge > 0 ? `Thông báo, ${badge} mục mới` : 'Thông báo'}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="bell" />
        {badge > 0 && (
          <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white tabular-nums" aria-hidden="true">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Thông báo"
          className="header-bell-panel absolute top-11 right-0 z-80 w-90 max-w-[calc(100vw-24px)] overflow-hidden rounded-lg border border-line bg-white text-left shadow-pop max-[760px]:fixed max-[760px]:top-14 max-[760px]:right-3"
        >
          <div className="flex items-center justify-between gap-2 border-b border-b-line px-3.5 py-2.5">
            <h2 className="text-[14px] font-semibold">Thông báo</h2>
            <button
              type="button"
              className="ui-link text-[12px]"
              onClick={() => void markAllSeen()}
              disabled={markAllState.isLoading || badge === 0}
            >
              Đánh dấu đã xem
            </button>
          </div>
          <div className="max-h-[min(70vh,520px)] overflow-y-auto">
            <section aria-label="Việc cần xử lý" className="px-3.5 py-2.5">
              <h3 className="mb-1.5 text-[12px] font-semibold text-muted">Việc cần xử lý</h3>
              {work.length === 0 ? (
                <p className="text-[13px] text-muted">Không có việc nào đang chờ trong các mục bạn được xem.</p>
              ) : (
                <ul className="grid gap-0.5">
                  {work.map((item) => (
                    <li key={item.key}>
                      <Link
                        to={item.to}
                        className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[13px] text-primary hover:bg-surface-muted"
                        onClick={() => setOpen(false)}
                      >
                        <span>{item.title}</span>
                        <span className="flex items-center gap-1.5 tabular-nums">
                          {fresh(item) > 0 && <span className="ui-pill warning sm">+{fresh(item)} mới</span>}
                          <b className="font-semibold">{item.count}</b>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section aria-label="Tin gửi cho bạn" className="border-t border-t-line px-3.5 py-2.5">
              <h3 className="mb-1.5 text-[12px] font-semibold text-muted">Tin gửi cho bạn</h3>
              {notifications.isLoading ? (
                <p className="text-[13px] text-muted" aria-busy="true">Đang tải...</p>
              ) : notifications.error ? (
                <p className="text-[13px] text-muted">Chưa tải được tin. Thử lại sau.</p>
              ) : (notifications.data ?? []).length === 0 ? (
                <p className="text-[13px] text-muted">Chưa có tin nào.</p>
              ) : (
                <ul className="grid gap-1">
                  {(notifications.data ?? []).map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`w-full cursor-pointer rounded-md border-0 bg-transparent px-2 py-1.5 text-left text-[13px] hover:bg-surface-muted ${item.unread ? 'text-primary' : 'text-secondary'}`}
                        onClick={() => { if (item.unread) void markRead(item.id); }}
                      >
                        <span className={`block ${item.unread ? 'font-semibold' : ''}`}>
                          {item.unread && <span className="mr-1.5 inline-block size-1.5 rounded-full bg-brand align-middle" aria-label="Chưa đọc" />}
                          {item.title}
                        </span>
                        <span className="block text-[12px] text-muted">{item.message}</span>
                        <span className="block text-[11px] text-muted">{formatDateTime(item.occurredAt)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
