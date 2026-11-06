import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Modal } from '@/components/Modal';
import { toast } from '@/lib/toast';
import { useAssignUserRoleMutation, useGetStaffRolesQuery } from '../api/userQueries';
import { ASSIGNABLE_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from '../constant';
import type { RoleType, UserItem } from '../types';
import { RoleChangeSummary } from './RoleChangeSummary';

interface ChangeRoleModalProps {
  user: UserItem;
  onClose: () => void;
  /** Gọi sau khi đổi thành công; câu báo kết quả đã hiện bằng toast. */
  onDone: () => void;
}

/** Thẻ lựa chọn vai trò; thẻ đang chọn (`selected`) viền và nền xanh, kể cả khi rê chuột. */
const OPTION = 'user-role-option flex items-start gap-2.5 py-2.5 px-3 border border-line-strong rounded-md bg-white cursor-pointer'
  + ' hover:bg-surface-muted [&.selected]:border-brand [&.selected]:bg-brand-50';
const HINT = 'user-staff-hint text-muted text-[13px] leading-4.5';

/**
 * Hộp thoại đổi vai trò. Chọn "Nhân viên" thì phải chọn thêm vai trò nhân viên (bộ quyền trên web quản trị).
 * Kết quả (thành công hoặc lỗi) báo bằng toast; lỗi thì hộp vẫn mở để sửa và thử lại.
 */
export function ChangeRoleModal({ user, onClose, onDone }: ChangeRoleModalProps) {
  const [role, setRole] = useState<RoleType>(user.role);
  const [staffRoleCode, setStaffRoleCode] = useState(user.staffRoleCode ?? '');
  const [assignRole, { isLoading }] = useAssignUserRoleMutation();
  const staffRoles = useGetStaffRolesQuery(undefined, { skip: role !== 'STAFF' });

  const isStaff = role === 'STAFF';
  const unchanged = role === user.role && (!isStaff || staffRoleCode === (user.staffRoleCode ?? ''));
  const missingStaffRole = isStaff && !staffRoleCode;
  const selectedStaffRole = isStaff ? staffRoles.data?.find((item) => item.code === staffRoleCode) ?? null : null;

  const save = async () => {
    if (missingStaffRole) return;
    const result = await assignRole(isStaff ? { id: user.id, role, staffRoleCode } : { id: user.id, role });
    if ('error' in result) {
      toast.error(result.error);
      return;
    }
    const staffName = staffRoles.data?.find((item) => item.code === staffRoleCode)?.name;
    const label = isStaff && staffName ? `${ROLE_LABELS[role]} (${staffName})` : ROLE_LABELS[role];
    toast.success(`Đã đổi vai trò của ${user.fullName || user.email} thành ${label}.`);
    onDone();
  };

  return (
    <Modal
      title="Đổi vai trò"
      subtitle={user.fullName ? `${user.fullName}, ${user.email}` : user.email}
      onClose={onClose}
      busy={isLoading}
      dismissOnBackdrop={false}
      footer={(
        <>
          <button type="button" className="ui-btn ghost" onClick={onClose} disabled={isLoading}>Hủy</button>
          <button type="button" className="ui-btn primary" onClick={save} disabled={isLoading || unchanged || missingStaffRole}>
            {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </>
      )}
    >
      <p className="user-modal-lead mb-3">Chọn vai trò mới cho tài khoản.</p>
      <div className="user-role-options grid gap-2" role="radiogroup" aria-label="Vai trò">
        {ASSIGNABLE_ROLES.map((option) => (
          <label key={option} className={role === option ? `${OPTION} selected` : OPTION}>
            <input
              className="mt-1 accent-brand"
              type="radio"
              name="userRole"
              value={option}
              checked={role === option}
              onChange={() => setRole(option)}
              disabled={isLoading}
            />
            <span>
              <strong className="block text-primary text-[14px] font-medium">{ROLE_LABELS[option]}</strong>
              <span className="block text-muted text-[13px] leading-4.5">{ROLE_DESCRIPTIONS[option]}</span>
            </span>
          </label>
        ))}
      </div>

      {isStaff && (
        <div className="user-staff-role grid gap-1.5 mt-3">
          <label className="text-secondary text-[13px] font-medium" htmlFor="userStaffRole">
            Vai trò nhân viên <span className="user-required text-danger font-bold" aria-hidden="true">*</span>
          </label>
          {staffRoles.error ? (
            <ErrorNotice error={staffRoles.error} onRetry={staffRoles.refetch} />
          ) : (
            <select
              id="userStaffRole"
              className="ui-select"
              value={staffRoleCode}
              required
              aria-required="true"
              disabled={isLoading || staffRoles.isLoading}
              onChange={(event) => setStaffRoleCode(event.target.value)}
            >
              <option value="">{staffRoles.isLoading ? 'Đang tải vai trò...' : 'Chọn vai trò nhân viên'}</option>
              {(staffRoles.data ?? []).map((item) => (
                <option key={item.code} value={item.code}>{item.name}</option>
              ))}
            </select>
          )}
          {staffRoles.data && staffRoles.data.length === 0 ? (
            <p className={HINT}>
              Chưa có vai trò nhân viên nào. <Link className="ui-link" to="/users/roles">Tạo vai trò</Link> trước khi gán.
            </p>
          ) : (
            <p className={HINT}>Nhân viên chỉ thấy các màn và nút thao tác mà vai trò này được cấp quyền.</p>
          )}
        </div>
      )}

      <RoleChangeSummary from={user.role} to={role} staffRole={selectedStaffRole} unchanged={unchanged} />

    </Modal>
  );
}
