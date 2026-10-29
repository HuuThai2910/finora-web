import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Modal } from '@/components/Modal';
import { useAssignUserRoleMutation, useGetStaffRolesQuery } from '../api/userQueries';
import { ASSIGNABLE_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from '../constant';
import type { RoleType, UserItem } from '../types';

interface ChangeRoleModalProps {
  user: UserItem;
  onClose: () => void;
  onDone: (message: string) => void;
}

/**
 * Hộp thoại đổi vai trò. Chọn "Nhân viên" thì phải chọn thêm vai trò nhân viên (bộ quyền trên web quản trị).
 * Lỗi hiện ngay trong hộp để người dùng sửa và thử lại.
 */
export function ChangeRoleModal({ user, onClose, onDone }: ChangeRoleModalProps) {
  const [role, setRole] = useState<RoleType>(user.role);
  const [staffRoleCode, setStaffRoleCode] = useState(user.staffRoleCode ?? '');
  const [assignRole, { isLoading, error }] = useAssignUserRoleMutation();
  const staffRoles = useGetStaffRolesQuery(undefined, { skip: role !== 'STAFF' });

  const isStaff = role === 'STAFF';
  const unchanged = role === user.role && (!isStaff || staffRoleCode === (user.staffRoleCode ?? ''));
  const missingStaffRole = isStaff && !staffRoleCode;

  const save = async () => {
    if (missingStaffRole) return;
    const result = await assignRole(isStaff ? { id: user.id, role, staffRoleCode } : { id: user.id, role });
    if ('error' in result) return;
    const staffName = staffRoles.data?.find((item) => item.code === staffRoleCode)?.name;
    const label = isStaff && staffName ? `${ROLE_LABELS[role]} (${staffName})` : ROLE_LABELS[role];
    onDone(`Đã đổi vai trò của ${user.fullName || user.email} thành ${label}.`);
  };

  return (
    <Modal
      title="Đổi vai trò"
      subtitle={user.fullName ? `${user.fullName}, ${user.email}` : user.email}
      onClose={onClose}
      busy={isLoading}
      footer={(
        <>
          <button type="button" className="ui-btn ghost" onClick={onClose} disabled={isLoading}>Hủy</button>
          <button type="button" className="ui-btn primary" onClick={save} disabled={isLoading || unchanged || missingStaffRole}>
            {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </>
      )}
    >
      <p className="user-modal-lead">Quyền truy cập thay đổi ngay sau khi lưu.</p>
      <div className="user-role-options" role="radiogroup" aria-label="Vai trò">
        {ASSIGNABLE_ROLES.map((option) => (
          <label key={option} className={`user-role-option${role === option ? ' selected' : ''}`}>
            <input
              type="radio"
              name="userRole"
              value={option}
              checked={role === option}
              onChange={() => setRole(option)}
              disabled={isLoading}
            />
            <span>
              <strong>{ROLE_LABELS[option]}</strong>
              <span>{ROLE_DESCRIPTIONS[option]}</span>
            </span>
          </label>
        ))}
      </div>

      {isStaff && (
        <div className="user-staff-role">
          <label htmlFor="userStaffRole">
            Vai trò nhân viên <span className="user-required" aria-hidden="true">*</span>
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
            <p className="user-staff-hint">
              Chưa có vai trò nhân viên nào. <Link className="ui-link" to="/users/roles">Tạo vai trò</Link> trước khi gán.
            </p>
          ) : (
            <p className="user-staff-hint">Nhân viên chỉ thấy các màn và nút thao tác mà vai trò này được cấp quyền.</p>
          )}
        </div>
      )}

      {error ? <div className="user-modal-error"><ErrorNotice error={error} /></div> : null}
    </Modal>
  );
}
