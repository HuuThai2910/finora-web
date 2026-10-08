import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/Icon';

interface DashCardHeadProps {
  id: string;
  icon: IconName;
  title: string;
  /** Phần bên phải tiêu đề: nhãn viên thuốc ("7 nhóm việc"), ghi chú hoặc link "Xem tất cả". */
  aside?: ReactNode;
}

/** Đầu thẻ của Tổng quan theo mockup: ô icon nhỏ, tiêu đề, phần phụ bên phải. */
export function DashCardHead({ id, icon, title, aside }: DashCardHeadProps) {
  return (
    <div className="ui-card-head dash-card-head">
      <h2 id={id}>
        <span className="ui-ico"><Icon name={icon} /></span>
        {title}
      </h2>
      {aside}
    </div>
  );
}
