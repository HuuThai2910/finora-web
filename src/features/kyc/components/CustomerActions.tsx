import { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import { MoreIcon } from '@/components/Icon';
import { RowMenu, type RowMenuItem } from '@/components/RowMenu';
import { usePermission } from '@/features/auth';
import { ekycReviewDetailPath } from '@/features/ekyc-review';
import { ChangeRoleModal, LockUserModal, type UserItem } from '@/features/user';
import { usePendingAttemptLookup } from '../hooks/usePendingAttemptLookup';

type OpenModal = 'lock' | 'role' | null;

interface CustomerActionsProps {
  customer: UserItem;
}

/** Mục "Duyệt xác minh": mở thẳng lượt chờ của khách; chưa tìm thấy lượt thì khóa kèm lý do. */
function reviewItem(attemptId: string | undefined, isLoading: boolean): RowMenuItem {
  if (attemptId) return { key: 'review', label: 'Duyệt xác minh', icon: 'userCheck', to: ekycReviewDetailPath(attemptId) };
  return {
    key: 'review',
    label: 'Duyệt xác minh',
    icon: 'userCheck',
    onSelect: () => undefined,
    disabled: true,
    disabledReason: isLoading ? 'Đang tải lượt chờ duyệt...' : 'Không tìm thấy lượt chờ duyệt của khách này',
  };
}

/**
 * Menu "⋯" ở đầu trang chi tiết khách hàng: duyệt xác minh (khi khách có lượt chờ), nhật ký hoạt động, đổi vai trò và
 * khóa/mở khóa, theo đúng quyền như ở bảng Phân quyền (backend vẫn kiểm từng API). Không có mục nào thì không hiện nút.
 */
export function CustomerActions({ customer }: CustomerActionsProps) {
  const { canAct, canView, isAdmin } = usePermission();
  const currentId = useSelector((state: RootState) => state.auth.profile?.id ?? null);
  const [open, setOpen] = useState<OpenModal>(null);
  const isSelf = currentId != null && currentId === customer.id;
  const waitingReview = customer.ekycStatus === 'MANUAL_REVIEW' && canView('ekyc');
  const lookup = usePendingAttemptLookup(waitingReview);

  const items: RowMenuItem[] = [];
  if (waitingReview) items.push(reviewItem(lookup.byCustomer.get(customer.id), lookup.isFetching));
  if (isAdmin) {
    items.push({
      key: 'activity',
      label: 'Nhật ký hoạt động',
      icon: 'list',
      to: `/system/activity-logs?q=${encodeURIComponent(customer.email)}`,
    });
    // Không tự đổi vai trò của chính mình (backend cũng chặn); với chính mình thì ẩn hẳn thay vì để mục khóa.
    if (!isSelf) items.push({ key: 'role', label: 'Đổi vai trò', icon: 'userCheck', onSelect: () => setOpen('role') });
  }
  // Chỉ khi đã đọc được trạng thái khóa: không biết đang khóa hay mở thì không biết mục này sẽ làm gì.
  if (canAct('customer') && customer.locked != null) {
    const locked = customer.locked;
    items.push({
      key: 'lock',
      label: locked ? 'Mở khóa tài khoản' : 'Khóa tài khoản',
      icon: locked ? 'unlock' : 'lock',
      danger: !locked,
      separatorBefore: items.length > 0,
      onSelect: () => setOpen('lock'),
      disabled: isSelf,
      disabledReason: 'Không thể tự khóa tài khoản của chính bạn',
    });
  }

  if (items.length === 0) return null;
  // Hộp thoại tự báo kết quả bằng toast; ở đây chỉ đóng hộp.
  const finish = () => setOpen(null);

  return (
    <>
      <RowMenu
        label={`Thao tác với ${customer.fullName || customer.email}`}
        items={items}
        buttonClassName="ui-btn ghost cust-more w-8 px-0 [&_svg]:size-4.5"
        buttonContent={<MoreIcon />}
      />
      {open === 'lock' && <LockUserModal user={customer} onClose={() => setOpen(null)} onDone={finish} />}
      {open === 'role' && <ChangeRoleModal user={customer} onClose={() => setOpen(null)} onDone={finish} />}
    </>
  );
}
