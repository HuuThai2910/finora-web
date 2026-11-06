import { investmentApi } from '@/lib/api/investmentApi';
import { loanApi } from '@/lib/api/loanApi';
import { BACKGROUND_HEADER } from '@/lib/api/background';
import { apiFetch } from '@/lib/api/httpClient';
import { userServiceApi } from '@/lib/api/userServiceApi';
import type { InvestmentStatisticsSummary, LoanStatisticsSummary } from '@/features/statistics';
import type { UserStats } from '@/features/user';

/** Một tin trong hộp thư của tài khoản đang đăng nhập (`InAppNotificationResponse` của finora-notification). */
export interface InboxNotification {
  id: string;
  type: string;
  category: string | null;
  title: string;
  message: string;
  businessReference: string | null;
  unread: boolean;
  occurredAt: string;
}

/*
 * Endpoint riêng của chuông trên header. Đặt tên khác endpoint của trang (dù cùng URL) để cả lần tải đầu lẫn lượt tự làm
 * mới đều là lượt chạy nền (`background.ts`): không hiện thanh tải toàn trang, Nhật ký hoạt động mặc định ẩn.
 */
const BACKGROUND = { [BACKGROUND_HEADER]: '1' };

async function run<T>(call: () => Promise<T>): Promise<{ data: T } | { error: unknown }> {
  try {
    return { data: await call() };
  } catch (error) {
    return { error };
  }
}

const inbox = userServiceApi.injectEndpoints({
  endpoints: (builder) => ({
    getBellNotifications: builder.query<InboxNotification[], void>({
      queryFn: (_arg, { signal }) =>
        run(() => apiFetch<InboxNotification[]>('/api/v1/notifications?limit=10', { signal, headers: BACKGROUND })),
    }),
    getBellUnreadCount: builder.query<{ count: number }, void>({
      queryFn: (_arg, { signal }) =>
        run(() => apiFetch<{ count: number }>('/api/v1/notifications/unread-count', { signal, headers: BACKGROUND })),
    }),
    getBellUserStats: builder.query<UserStats, void>({
      queryFn: (_arg, { signal }) =>
        run(() => apiFetch<UserStats>('/api/v1/admin/users/stats', { signal, headers: BACKGROUND })),
    }),
    markNotificationRead: builder.mutation<void, string>({
      queryFn: (id) => run(() => apiFetch<void>(`/api/v1/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' })),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        // Chỉ sửa cache khi backend đã ghi nhận; lỗi thì tin vẫn hiện chưa đọc.
        if (!(await queryFulfilled.then(() => true, () => false))) return;
        dispatch(inbox.util.updateQueryData('getBellNotifications', undefined, (list) => {
          list.forEach((item) => { if (item.id === id) item.unread = false; });
        }));
        dispatch(inbox.util.updateQueryData('getBellUnreadCount', undefined, (value) => {
          value.count = Math.max(0, value.count - 1);
        }));
      },
    }),
    markAllNotificationsRead: builder.mutation<{ updated: number }, void>({
      queryFn: () => run(() => apiFetch<{ updated: number }>('/api/v1/notifications/read-all', { method: 'POST' })),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        if (!(await queryFulfilled.then(() => true, () => false))) return;
        dispatch(inbox.util.updateQueryData('getBellNotifications', undefined, (list) => {
          list.forEach((item) => { item.unread = false; });
        }));
        dispatch(inbox.util.updateQueryData('getBellUnreadCount', undefined, (value) => { value.count = 0; }));
      },
    }),
  }),
});

const loanCounts = loanApi.injectEndpoints({
  endpoints: (builder) => ({
    getBellLoanSummary: builder.query<LoanStatisticsSummary, void>({
      query: () => '/admin/loan-statistics/summary',
    }),
  }),
});

const investmentCounts = investmentApi.injectEndpoints({
  endpoints: (builder) => ({
    getBellInvestmentSummary: builder.query<InvestmentStatisticsSummary, void>({
      query: () => '/investments/admin/statistics/summary',
    }),
  }),
});

export const {
  useGetBellNotificationsQuery,
  useGetBellUnreadCountQuery,
  useGetBellUserStatsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = inbox;
export const { useGetBellLoanSummaryQuery } = loanCounts;
export const { useGetBellInvestmentSummaryQuery } = investmentCounts;
