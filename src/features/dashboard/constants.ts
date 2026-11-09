import type { IconName } from '@/components/Icon';
import type { OpsFunctionCode } from '@/features/auth';
import type { DashboardChartKey, PeriodDays } from './types';

export const PERIODS: PeriodDays[] = [7, 30, 90];

export const DEFAULT_PERIOD: PeriodDays = 30;

/**
 * Tab biểu đồ, thứ tự và đường dẫn theo mockup dashboard.html.
 * `view` là chức năng cần quyền Xem để hiện link (nhân viên không xem được trang đích thì không hiện).
 */
export const DASHBOARD_CHARTS: ReadonlyArray<{ key: DashboardChartKey; tab: string; icon: IconName; title: string; link?: { to: string; label: string; view: OpsFunctionCode } }> = [
  { key: 'funding', icon: 'bars', tab: 'Vốn và giải ngân', title: 'Vốn gọi được và giải ngân', link: { to: '/investments/funding', label: 'Gọi vốn', view: 'funding' } },
  { key: 'funnel', icon: 'funnel', tab: 'Hồ sơ qua từng bước', title: 'Hồ sơ vay qua từng bước', link: { to: '/loans', label: 'Quản lý hồ sơ vay', view: 'loan-application' } },
  { key: 'grades', icon: 'shieldCheck', tab: 'Hạng tín dụng', title: 'Dư nợ theo hạng tín dụng', link: { to: '/loans', label: 'Quản lý hồ sơ vay', view: 'loan-application' } },
  { key: 'overdue', icon: 'clock', tab: 'Nợ quá hạn', title: 'Dư nợ quá hạn theo nhóm nợ', link: { to: '/loans?servicing=OVERDUE', label: 'Khoản vay đang quá hạn', view: 'collection' } },
  { key: 'market', icon: 'file', tab: 'Chợ chuyển nhượng', title: 'Giá trị khớp trên chợ chuyển nhượng', link: { to: '/investments/secondary', label: 'Chợ chuyển nhượng', view: 'secondary-market' } },
];
