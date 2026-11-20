import { useSearchParams } from 'react-router-dom';
import { CLIENT_FILTER_OPTIONS, KIND_OPTIONS, OUTCOME_OPTIONS, RANGE_OPTIONS, SERVICE_LABELS } from '../constants';
import type { ActivityClient, ActivityKind, ActivityOutcome, ActivityRange } from '../types';

export interface ActivityLogFilters {
  range: ActivityRange | 'custom';
  outcome: ActivityOutcome | null;
  method: ActivityKind | '';
  service: string;
  client: ActivityClient | '';
  q: string;
  /** Khoảng tự chọn theo ngày Việt Nam (`YYYY-MM-DD`); chỉ dùng khi `range` là `custom`. */
  from: string;
  to: string;
  /** Hiện cả lượt gọi tự động (tự làm mới định kỳ của web). */
  showBackground: boolean;
  /** Trang hiện tại, tính từ 0 như backend. */
  page: number;
  /** Khóa của lượt gọi đang mở ở hộp chi tiết (`entryKey`). */
  open: string | null;
}

/** Các mục của bảng lọc (sửa trên bản nháp, bấm Áp dụng mới đổi URL). */
export type ActivityPanelFilters = Pick<ActivityLogFilters, 'outcome' | 'method' | 'service' | 'client' | 'showBackground'>;

export const EMPTY_PANEL_FILTERS: ActivityPanelFilters = {
  outcome: null, method: '', service: '', client: '', showBackground: false,
};

const DEFAULT_RANGE: ActivityRange = '24h';

const pick = <T extends string>(raw: string | null, allowed: readonly T[]): T | null =>
  allowed.find((value) => value === raw) ?? null;

const RANGES = [...RANGE_OPTIONS.map((option) => option.value), 'custom' as const];
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const pickDay = (raw: string | null): string => (raw && DAY.test(raw) ? raw : '');
const OUTCOMES = OUTCOME_OPTIONS.map((option) => option.value);
const KINDS = KIND_OPTIONS.map((option) => option.value);
const SERVICES = Object.keys(SERVICE_LABELS);

/** Số trang trên URL tính từ 1; giá trị lạ coi như trang đầu. */
function readPage(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 1 ? parsed - 1 : 0;
}

function toQuery(filters: ActivityLogFilters): Record<string, string> {
  const query: Record<string, string> = {};
  if (filters.range !== DEFAULT_RANGE) query.range = filters.range;
  if (filters.outcome) query.outcome = filters.outcome;
  if (filters.method) query.method = filters.method;
  if (filters.service) query.service = filters.service;
  if (filters.client) query.client = filters.client;
  if (filters.q) query.q = filters.q;
  if (filters.range === 'custom') {
    if (filters.from) query.from = filters.from;
    if (filters.to) query.to = filters.to;
  }
  if (filters.showBackground) query.auto = '1';
  if (filters.page > 0) query.page = String(filters.page + 1);
  if (filters.open) query.open = filters.open;
  return query;
}

/**
 * Bộ lọc, trang và lượt gọi đang mở của Nhật ký hoạt động nằm trên URL (`?outcome=ERROR&q=admin@finora.vn&page=2`)
 * để gửi đường dẫn đúng kết quả, quay lại không mất bộ lọc, và trang khác link tới bằng `?q=<mã tra cứu|email|đường dẫn>`.
 * Đổi bộ lọc thì về trang đầu và đóng hộp chi tiết. Mở, đóng hộp không thêm mục lịch sử: Lùi vẫn về bộ lọc trước.
 * Giá trị lạ trên URL (kể cả `outcome=SERVER_ERROR` của link cũ) bị bỏ qua.
 */
export function useActivityLogFilters() {
  const [params, setParams] = useSearchParams();
  const filters: ActivityLogFilters = {
    range: pick(params.get('range'), RANGES) ?? DEFAULT_RANGE,
    outcome: pick(params.get('outcome'), OUTCOMES),
    method: pick(params.get('method'), KINDS) ?? '',
    service: pick(params.get('service'), SERVICES) ?? '',
    client: pick(params.get('client'), CLIENT_FILTER_OPTIONS) ?? '',
    q: params.get('q')?.trim() ?? '',
    from: pickDay(params.get('from')),
    to: pickDay(params.get('to')),
    showBackground: params.get('auto') === '1',
    page: readPage(params.get('page')),
    open: params.get('open'),
  };

  const write = (next: ActivityLogFilters, replace = false) => setParams(toQuery(next), { replace });

  return {
    filters,
    /** Có lọc gì ngoài khoảng thời gian. */
    filtered: Boolean(filters.outcome || filters.method || filters.service || filters.client || filters.q),
    update: (patch: Partial<Omit<ActivityLogFilters, 'page' | 'open'>>, replace = false) =>
      write({ ...filters, ...patch, page: 0, open: null }, replace),
    /** Bỏ mọi mục của bảng lọc, giữ khoảng thời gian và ô tìm như các trang danh sách khác. */
    clear: () => write({ ...filters, ...EMPTY_PANEL_FILTERS, page: 0, open: null }),
    setPage: (page: number) => write({ ...filters, page, open: null }),
    openEntry: (key: string) => write({ ...filters, open: key }, true),
    closeEntry: () => write({ ...filters, open: null }, true),
  };
}
