import { apiFetch, apiFetchBlob } from '@/lib/api/httpClient';
import { BACKGROUND_HEADER, isBackgroundRequest } from '@/lib/api/background';
import { userServiceApi } from '@/lib/api/userServiceApi';
import type { ActivityLogPage, ActivityLogSearchArgs } from '../types';

function queryString(args: Partial<ActivityLogSearchArgs>): string {
  const params = new URLSearchParams();
  Object.entries(args).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== false) params.set(key, String(value));
  });
  return params.toString();
}

function searchPath(args: ActivityLogSearchArgs): string {
  return `/api/v1/admin/activity-logs?${queryString(args)}`;
}

/** Tải CSV theo đúng bộ lọc đang xem (không phân trang; backend giới hạn số dòng như trang). */
export function downloadActivityLogCsv(args: Omit<ActivityLogSearchArgs, 'page' | 'size'>): Promise<Blob> {
  return apiFetchBlob(`/api/v1/admin/activity-logs/export?${queryString(args)}`);
}

/**
 * Nhật ký hoạt động do finora-user đọc từ Azure Log Analytics (chỉ ADMIN). Gọi qua `apiFetch` như các endpoint
 * finora-user khác để dùng chung cơ chế làm mới phiên; lỗi giữ dạng `ApiError` cho `toUiApiError`.
 */
const activityLogApi = userServiceApi.injectEndpoints({
  endpoints: (builder) => ({
    searchActivityLogs: builder.query<ActivityLogPage, ActivityLogSearchArgs>({
      queryFn: async (args, { signal, forced }) => {
        try {
          // Lượt tự làm mới 30 giây gửi kèm header chạy nền (Gateway ghi cờ, nhật ký mặc định ẩn).
          const headers = isBackgroundRequest('searchActivityLogs', forced) ? { [BACKGROUND_HEADER]: '1' } : undefined;
          return { data: await apiFetch<ActivityLogPage>(searchPath(args), { signal, headers }) };
        } catch (error) {
          return { error };
        }
      },
    }),
  }),
});

export const { useSearchActivityLogsQuery } = activityLogApi;
