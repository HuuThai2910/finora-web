import { Icon, type IconName } from '@/components/Icon';
import type { PillTone } from '@/components/StatusPill';
import type { ReasonView } from '../mappers/reasonDisplay';

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
 * Danh sách lý do đã dịch. Mã gốc hiện nhỏ, mờ ở cuối dòng để đối chiếu log backend;
 * mã chưa có trong danh mục thì nhãn chính là mã đó nên không lặp lại.
 */
export function ReasonList({ reasons, empty }: ReasonListProps) {
  if (reasons.length === 0) return <p className="ekr-muted ekr-empty-line">{empty}</p>;
  return (
    <ul className="ekr-reasons">
      {reasons.map((reason) => (
        <li key={reason.code} className={`ekr-reason ${reason.tone}`}>
          <Icon name={TONE_ICON[reason.tone]} />
          <span>{reason.label}</span>
          {reason.label !== reason.code ? <code className="ekr-code">{reason.code}</code> : null}
        </li>
      ))}
    </ul>
  );
}
