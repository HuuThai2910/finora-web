import { Icon, type IconName } from '@/components/Icon';
import type { PillTone } from '@/components/StatusPill';
import type { ReasonView } from '../mappers/reasonDisplay';
import { REVIEW_EMPTY_LINE } from './reviewStyles';

/** Dòng lý do; lớp tông (`success`, `warning`, `danger`…) do mapper gắn quyết định màu icon. */
const REASON_ROW =
  'grid grid-cols-[16px_minmax(0,1fr)_auto] gap-2 [align-items:start] py-1.5 border-b border-b-divider text-[13px] leading-normal last:[border-bottom:0] [&_svg]:size-4 [&_svg]:mt-0.5 [&_svg]:text-muted [&.success_svg]:text-success [&.warning_svg]:text-warning [&.danger_svg]:text-danger';

const TONE_ICON: Record<PillTone, IconName> = {
  success: 'checkCircle',
  warning: 'alert',
  danger: 'xCircle',
  info: 'list',
  neutral: 'list',
};

interface ReasonListProps {
  reasons: ReasonView[];
  /** Câu hiện khi không có lý do nào. */
  empty: string;
}

/**
 * Danh sách lý do đã dịch. Mã gốc không hiện cho người duyệt, chỉ để trong `title` (rê chuột) để đối chiếu log
 * backend; mã chưa có trong danh mục hiện "Lý do khác (chưa có mô tả)".
 */
export function ReasonList({ reasons, empty }: ReasonListProps) {
  if (reasons.length === 0) return <p className={REVIEW_EMPTY_LINE}>{empty}</p>;
  return (
    <ul className="ekr-reasons grid">
      {reasons.map((reason) => (
        <li key={reason.code} className={`ekr-reason ${reason.tone} ${REASON_ROW}`} title={reason.detail}>
          <Icon name={TONE_ICON[reason.tone]} />
          <span>{reason.label}</span>
        </li>
      ))}
    </ul>
  );
}
