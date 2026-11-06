import type { PermissionSummary } from './accountSummary';

interface AccountMenuHeaderProps {
  name: string;
  email: string | null;
  roleLabel: string;
  /** Quyền của nhân viên; `null` với quản trị viên (mọi quyền). */
  permissions: PermissionSummary | null;
}

const LINE = 'text-[12px] leading-[1.45] text-secondary';

/**
 * Khối đầu menu tài khoản: ai đang đăng nhập, vai trò gì, nhân viên được Xem/Thao tác chức năng nào. Giúp nhân viên tự
 * biết vì sao không thấy một mục menu hay nút thao tác trước khi hỏi quản trị viên.
 */
export function AccountMenuHeader({ name, email, roleLabel, permissions }: AccountMenuHeaderProps) {
  return (
    <div className="header-account w-68 max-w-[calc(100vw-32px)] mb-1 px-2.5 pt-1.5 pb-2.5 border-b border-b-divider whitespace-normal">
      <p className="text-[13px] font-semibold text-primary wrap-anywhere">{name}</p>
      {email && <p className={`${LINE} wrap-anywhere`}>{email}</p>}
      <p className={`${LINE} mt-1`}>
        Vai trò: <span className="font-semibold text-primary">{roleLabel}</span>
      </p>
      {permissions ? (
        <>
          <p className={`header-account-view ${LINE} mt-1`}>
            <span className="font-semibold text-primary">Xem: </span>
            {permissions.view.length ? permissions.view.join(', ') : 'chưa có chức năng nào'}
          </p>
          <p className={`header-account-act ${LINE} mt-0.5`}>
            <span className="font-semibold text-primary">Thao tác: </span>
            {permissions.action.length ? permissions.action.join(', ') : 'chưa có chức năng nào'}
          </p>
        </>
      ) : (
        <p className={`${LINE} mt-0.5`}>Có mọi quyền Xem và Thao tác.</p>
      )}
    </div>
  );
}
