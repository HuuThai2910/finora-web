import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/Icon';

interface DashCardHeadProps {
  id: string;
  icon: IconName;
  title: string;
  /** Phần bên phải tiêu đề: nhãn viên thuốc ("7 nhóm việc"), ghi chú hoặc link "Xem tất cả". */
  aside?: ReactNode;
  /** Utility riêng của từng thẻ cho đầu thẻ (khoảng cách dưới, vị trí trong lưới). */
  className?: string;
}

/** Đầu thẻ của Tổng quan theo mockup: ô icon nhỏ, tiêu đề, phần phụ bên phải. */
export function DashCardHead({ id, icon, title, aside, className }: DashCardHeadProps) {
  return (
    <div className={className ? `ui-card-head dash-card-head ${className}` : 'ui-card-head dash-card-head'}>
      <h2 id={id} className="leading-[1.4]">
        <span className="ui-ico"><Icon name={icon} /></span>
        {title}
      </h2>
      {aside}
    </div>
  );
}
