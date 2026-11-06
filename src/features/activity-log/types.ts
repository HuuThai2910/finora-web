/** Khớp `ActivityLogEntryResponse` và `ActivityLogPageResponse` của finora-user (`/api/v1/admin/activity-logs`). */

export type ActivityClient = 'WEB' | 'MOBILE' | 'OTHER';

export interface ActivityLogEntry {
  at: string;
  method: string;
  path: string;
  /** Query đã che tham số nhạy cảm. */
  query: string | null;
  /** Route id của Gateway; `gateway` khi Gateway tự trả lời. */
  service: string;
  status: number;
  durationMs: number;
  user: string | null;
  role: string | null;
  client: ActivityClient | null;
  ip: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  traceId: string | null;
  /** Body gửi lên đã che mật khẩu, PIN, OTP, token, ảnh và cắt ngắn. */
  requestBody: string | null;
}

export interface ActivityLogPage {
  content: ActivityLogEntry[];
  /** Số lượt gọi khớp bộ lọc. */
  totalElements: number;
  page: number;
  size: number;
  /** Số lượt gọi sâu nhất xem được qua phân trang. */
  maxRows: number;
  /** Tổng lượt gọi trong khoảng thời gian (không lọc). */
  total: number;
  clientErrors: number;
  serverErrors: number;
}

export type ActivityRange = '1h' | '24h' | '7d' | '30d';
export type ActivityOutcome = 'SUCCESS' | 'CLIENT_ERROR' | 'SERVER_ERROR';

export interface ActivityLogSearchArgs {
  range: ActivityRange;
  /** Khoảng tự chọn (ISO-8601 có múi giờ); có cả hai thì backend bỏ qua `range`. */
  from?: string;
  to?: string;
  /** `true` thì giữ cả lượt gọi web tự gửi định kỳ (mặc định ẩn). */
  includeBackground?: boolean;
  method?: string;
  outcome?: ActivityOutcome;
  service?: string;
  client?: ActivityClient;
  q?: string;
  page: number;
  size: number;
}
