import type { IconName } from '@/components/Icon';

/** Số đếm từ API: số khi có, `undefined` khi đang tải, `null` khi lỗi. */
export type CountResult = number | null | undefined;

export interface DashboardTodo {
  key: string;
  title: string;
  hint: string;
  to: string;
  /** Icon ở ô tròn đầu dòng (mockup: hồ sơ, eKYC, đồng hồ, cột, cảnh báo). */
  icon: IconName;
  count: CountResult;
  /** Việc báo vấn đề (lỗi thanh toán, nợ xấu): tô đỏ khi số lớn hơn 0. */
  alarming?: boolean;
}

/** Kỳ số liệu của trang Tổng quan. */
export type PeriodDays = 7 | 30 | 90;

/** Bốn ô số liệu theo kỳ, theo thứ tự của mockup. */
export type PeriodKpiKey = 'outstanding' | 'committed' | 'npl' | 'fee';

/** Các biểu đồ trong thẻ biểu đồ có tab. */
export type DashboardChartKey = 'funding' | 'funnel' | 'grades' | 'overdue' | 'market' | 'auto';
