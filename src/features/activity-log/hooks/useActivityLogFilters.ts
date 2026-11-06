import { useSearchParams } from 'react-router-dom';
import { CLIENT_LABELS, METHOD_OPTIONS, OUTCOME_TABS, RANGE_OPTIONS, SERVICE_LABELS } from '../constants';
import type { ActivityClient, ActivityOutcome, ActivityRange } from '../types';

export interface ActivityLogFilters {
  range: ActivityRange | 'custom';
  outcome: ActivityOutcome | null;
  method: string;
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
  /** Khóa của lượt gọi đang mở ở ngăn chi tiết (`entryKey`). */
  open: string | null;
}

const DEFAULT_RANGE: ActivityRange = '24h';

const pick = <T extends string>(raw: string | null, allowed: readonly T[]): T | null =>
  allowed.find((value) => value === raw) ?? null;

const RANGES = [...RANGE_OPTIONS.map((option) => option.value), 'custom' as const];
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const pickDay = (raw: string | null): string => (raw && DAY.test(raw) ? raw : '');
const OUTCOMES = OUTCOME_TABS.flatMap((tab) => (tab.value ? [tab.value] : []));
const METHODS = METHOD_OPTIONS.map((option) => option.value).filter(Boolean);
const SERVICES = Object.keys(SERVICE_LABELS);
const CLIENTS = Object.keys(CLIENT_LABELS) as ActivityClient[];

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
 * Bộ lọc, trang và lượt gọi đang mở của Nhật ký hoạt động nằm trên URL (`?outcome=SERVER_ERROR&q=admin@finora.vn&page=2`)
 * để gửi đường dẫn đúng kết quả, quay lại không mất bộ lọc, và trang khác link tới bằng `?q=<mã tra cứu|email|đường dẫn>`.
 * Đổi bộ lọc thì về trang đầu và đóng ngăn chi tiết. Mở, đóng ngăn không thêm mục lịch sử: Lùi vẫn về bộ lọc trước.
 * Giá trị lạ trên URL bị bỏ qua.
 */
export function useActivityLogFilters() {
  const [params, setParams] = useSearchParams();
  const filters: ActivityLogFilters = {
    range: pick(params.get('range'), RANGES) ?? DEFAULT_RANGE,
    outcome: pick(params.get('outcome'), OUTCOMES),
    method: pick(params.get('method'), METHODS) ?? '',
    service: pick(params.get('service'), SERVICES) ?? '',
    client: pick(params.get('client'), CLIENTS) ?? '',
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
    update: (patch: Partial<Omit<ActivityLogFilters, 'page' | 'open'>>) => write({ ...filters, ...patch, page: 0, open: null }),
    /** Bỏ mọi bộ lọc, giữ khoảng thời gian đang xem. */
    clear: () => write({
      ...filters, outcome: null, method: '', service: '', client: '', q: '', showBackground: false, page: 0, open: null,
    }),
    setPage: (page: number) => write({ ...filters, page, open: null }),
    openEntry: (key: string) => write({ ...filters, open: key }, true),
    closeEntry: () => write({ ...filters, open: null }, true),
  };
}
